import express from 'express'
import cors from 'cors'
import NodeCache from 'node-cache'
import { ActivityCard, City } from './types'

const app = express()
const PORT = process.env.PORT || 3001

// Cache with 15-30 minute TTL as specified
const searchCache = new NodeCache({ stdTTL: 900 }) // 15 min
const detailsCache = new NodeCache({ stdTTL: 1800 }) // 30 min

app.use(cors())
app.use(express.json())

// API configuration
const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''
const VIATOR_BASE_URL = 'https://api.viator.com/partner'
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''

// Strip HTML tags from text
function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'")  // Replace &#39; with '
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim()
}

// Transform Viator product to our format
function transformViatorProduct(product: any, city: string): ActivityCard {
  // Handle pricing - Viator uses pricing.summary.fromPrice
  let priceText: string | undefined
  if (product.pricing?.summary?.fromPrice) {
    const amount = parseFloat(product.pricing.summary.fromPrice)
    const currency = product.pricing?.currency || 'USD'
    priceText = `${currency === 'USD' ? '$' : currency + ' '}${amount.toFixed(0)}`
  }

  // Get the best image available
  const heroImageUrl = product.images?.[0]?.variants?.find((v: any) => v.width >= 600)?.url
    || product.images?.[0]?.variants?.[0]?.url
    || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'

  // Get rating from reviews
  const rating = product.reviews?.combinedAverageRating
    ? parseFloat(product.reviews.combinedAverageRating.toFixed(1))
    : undefined

  const reviewCount = product.reviews?.totalReviews

  // Build booking URL - Viator deep link construction
  // Priority: productUrl > webURL > constructed URL with product code
  let bookingUrl = product.productUrl || product.webURL

  if (!bookingUrl && product.productCode) {
    // Construct Viator deep link using product code
    // Format: https://www.viator.com/tours/{city-slug}/{title-slug}/d{destId}-{code}
    const titleSlug = (product.title || 'tour')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
    const citySlug = (city || 'city')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    const destId = product.destinations?.[0]?.ref || '0'
    bookingUrl = `https://www.viator.com/tours/${citySlug}/${titleSlug}/d${destId}-${product.productCode}`
  }

  if (!bookingUrl) {
    bookingUrl = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(product.title || '')}`
  }

  return {
    id: product.productCode,
    name: stripHtml(product.title),
    shortDescription: stripHtml(product.description?.substring(0, 150) || ''),
    fullDescription: stripHtml(product.description || ''),
    heroImageUrl,
    city: city || product.destinations?.[0]?.name || '',
    latitude: product.geoLocation?.latitude || 0,
    longitude: product.geoLocation?.longitude || 0,
    rating,
    reviewCount,
    priceText,
    bookingUrl,
    source: 'viator',
  }
}

// Viator tag IDs for activity types
const VIATOR_TAGS: Record<string, string> = {
  'tours': '21911',      // Tours & Sightseeing
  'food': '21909',       // Food & Drink
  'outdoor': '21917',    // Outdoor Activities
  'culture': '21913',    // Art & Culture
  'adventure': '21915',  // Adventure & Extreme
  'water': '21919',      // Water Activities
  'nightlife': '21921',  // Nightlife
  'wellness': '21923',   // Wellness & Spas
  'classes': '21925',    // Classes & Workshops
  'transport': '21927',  // Transportation
}

// Search activities endpoint
app.get('/api/activities', async (req, res) => {
  try {
    const { latitude, longitude, city, topLeftLat, topLeftLng, bottomRightLat, bottomRightLng, activityType } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' })
    }

    const cacheKey = `activities-${latitude}-${longitude}-${activityType || 'all'}`
    const cached = searchCache.get<ActivityCard[]>(cacheKey)

    if (cached) {
      return res.json(cached)
    }

    // If no API key, return demo data
    if (!VIATOR_API_KEY) {
      const demoActivities = generateDemoActivities(city as string || 'Unknown City')
      searchCache.set(cacheKey, demoActivities)
      return res.json(demoActivities)
    }

    const cityName = city as string || 'Unknown City'

    // Build search payload
    const searchPayload: any = {
      filtering: {},
      sorting: {
        sort: 'TRAVELER_RATING',
        order: 'DESCENDING',
      },
      pagination: {
        start: 1,
        count: 50,
      },
      currency: 'USD',
    }

    // Use bounding box for location-scoped search (from Mapbox geocoding)
    if (topLeftLat && topLeftLng && bottomRightLat && bottomRightLng) {
      searchPayload.filtering.boundingBox = {
        topLeftLatitude: parseFloat(topLeftLat as string),
        topLeftLongitude: parseFloat(topLeftLng as string),
        bottomRightLatitude: parseFloat(bottomRightLat as string),
        bottomRightLongitude: parseFloat(bottomRightLng as string),
      }
      console.log(`Using bounding box for ${cityName}`)
    } else {
      // Fallback: use city name as search term
      console.log(`No bounding box provided for ${cityName}, using freetext search`)
      searchPayload.searchTerm = cityName
    }

    // Add activity type filter if specified
    if (activityType && activityType !== 'all' && VIATOR_TAGS[activityType as string]) {
      searchPayload.filtering.tags = [parseInt(VIATOR_TAGS[activityType as string])]
    }

    console.log('Search payload:', JSON.stringify(searchPayload))

    const response = await fetch(`${VIATOR_BASE_URL}/products/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'exp-api-key': VIATOR_API_KEY,
        'Accept-Language': 'en-US',
      },
      body: JSON.stringify(searchPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Viator API error:', response.status, errorText)
      throw new Error(`Viator API error: ${response.status}`)
    }

    const data = await response.json()
    const products = data.products || []
    console.log(`Viator API returned ${products.length} products for ${cityName}`)
    const activities = products.map((p: any) => transformViatorProduct(p, city as string || 'Unknown City'))

    searchCache.set(cacheKey, activities)
    res.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    // Return demo data on error
    const demoActivities = generateDemoActivities(req.query.city as string || 'Unknown City')
    res.json(demoActivities)
  }
})

// Get activity details endpoint
app.get('/api/activities/:id', async (req, res) => {
  try {
    const { id } = req.params

    const cached = detailsCache.get<ActivityCard>(id)
    if (cached) {
      return res.json(cached)
    }

    // Check if it's a demo activity
    if (id.startsWith('demo-')) {
      const demoActivity = getDemoActivityById(id)
      if (demoActivity) {
        detailsCache.set(id, demoActivity)
        return res.json(demoActivity)
      }
    }

    if (!VIATOR_API_KEY) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    // Viator uses product codes - fetch the product details
    const response = await fetch(`${VIATOR_BASE_URL}/products/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;version=2.0',
        'exp-api-key': VIATOR_API_KEY,
        'Accept-Language': 'en-US',
      },
    })

    if (!response.ok) {
      throw new Error(`Viator API error: ${response.status}`)
    }

    const product = await response.json()
    const activity = transformViatorProduct(product, '')

    detailsCache.set(id, activity)
    res.json(activity)
  } catch (error) {
    console.error('Error fetching activity details:', error)
    res.status(404).json({ error: 'Activity not found' })
  }
})

// City search endpoint - uses Mapbox Geocoding API
app.get('/api/cities', async (req, res) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([])
    }

    // Use Mapbox Geocoding API if token is available
    if (MAPBOX_ACCESS_TOKEN) {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?` +
        new URLSearchParams({
          access_token: MAPBOX_ACCESS_TOKEN,
          types: 'place,locality,region',
          limit: '10',
          language: 'en',
        })
      )

      if (!response.ok) {
        console.error('Mapbox API error:', response.status)
        const cities = searchCities(q)
        return res.json(cities)
      }

      const data = await response.json()

      const cities = data.features.map((feature: any) => {
        // Extract country from context
        const countryContext = feature.context?.find((ctx: any) => ctx.id?.startsWith('country'))
        const country = countryContext?.text || ''

        // Mapbox bbox format: [minLng, minLat, maxLng, maxLat]
        const mapboxBbox = feature.bbox
        const bbox = mapboxBbox ? {
          topLeftLat: mapboxBbox[3],
          topLeftLng: mapboxBbox[0],
          bottomRightLat: mapboxBbox[1],
          bottomRightLng: mapboxBbox[2],
        } : undefined

        return {
          name: feature.text,
          latitude: feature.center[1],
          longitude: feature.center[0],
          country,
          bbox,
        }
      })

      return res.json(cities)
    }

    // Fallback to curated list if no Mapbox token
    const cities = searchCities(q)
    res.json(cities)
  } catch (error) {
    console.error('Error searching cities:', error)
    const cities = searchCities(req.query.q as string)
    res.json(cities)
  }
})

// Reverse geocode endpoint
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' })
    }

    // For demo, return a generic location
    res.json({
      name: 'Current Location',
      latitude: parseFloat(lat as string),
      longitude: parseFloat(lng as string),
    })
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    res.status(500).json({ error: 'Failed to reverse geocode' })
  }
})

// Popular cities database
const POPULAR_CITIES: City[] = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'USA' },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'USA' },
  { name: 'Chicago', latitude: 41.8781, longitude: -87.6298, country: 'USA' },
  { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, country: 'USA' },
  { name: 'Miami', latitude: 25.7617, longitude: -80.1918, country: 'USA' },
  { name: 'Las Vegas', latitude: 36.1699, longitude: -115.1398, country: 'USA' },
  { name: 'Seattle', latitude: 47.6062, longitude: -122.3321, country: 'USA' },
  { name: 'Boston', latitude: 42.3601, longitude: -71.0589, country: 'USA' },
  { name: 'Austin', latitude: 30.2672, longitude: -97.7431, country: 'USA' },
  { name: 'Denver', latitude: 39.7392, longitude: -104.9903, country: 'USA' },
  { name: 'Nashville', latitude: 36.1627, longitude: -86.7816, country: 'USA' },
  { name: 'New Orleans', latitude: 29.9511, longitude: -90.0715, country: 'USA' },
  { name: 'San Diego', latitude: 32.7157, longitude: -117.1611, country: 'USA' },
  { name: 'Portland', latitude: 45.5152, longitude: -122.6784, country: 'USA' },
  { name: 'Atlanta', latitude: 33.7490, longitude: -84.3880, country: 'USA' },
  { name: 'Philadelphia', latitude: 39.9526, longitude: -75.1652, country: 'USA' },
  { name: 'Houston', latitude: 29.7604, longitude: -95.3698, country: 'USA' },
  { name: 'Dallas', latitude: 32.7767, longitude: -96.7970, country: 'USA' },
  { name: 'Phoenix', latitude: 33.4484, longitude: -112.0740, country: 'USA' },
  { name: 'Orlando', latitude: 28.5383, longitude: -81.3792, country: 'USA' },
  { name: 'Honolulu', latitude: 21.3069, longitude: -157.8583, country: 'USA' },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'UK' },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' },
  { name: 'Rome', latitude: 41.9028, longitude: 12.4964, country: 'Italy' },
  { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, country: 'Spain' },
  { name: 'Amsterdam', latitude: 52.3676, longitude: 4.9041, country: 'Netherlands' },
  { name: 'Berlin', latitude: 52.52, longitude: 13.405, country: 'Germany' },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan' },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, country: 'Australia' },
  { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, country: 'UAE' },
  { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, country: 'Singapore' },
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018, country: 'Thailand' },
  { name: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, country: 'China' },
  { name: 'Mexico City', latitude: 19.4326, longitude: -99.1332, country: 'Mexico' },
  { name: 'Toronto', latitude: 43.6532, longitude: -79.3832, country: 'Canada' },
  { name: 'Vancouver', latitude: 49.2827, longitude: -123.1207, country: 'Canada' },
]

function searchCities(query: string): City[] {
  const q = query.toLowerCase()
  return POPULAR_CITIES.filter(city =>
    city.name.toLowerCase().includes(q) ||
    (city.country && city.country.toLowerCase().includes(q))
  ).slice(0, 10)
}

// Demo activities for when Viator API is not configured
function generateDemoActivities(city: string): ActivityCard[] {
  const activities = [
    {
      id: 'demo-1',
      name: `${city} Walking Tour`,
      shortDescription: `Discover the best of ${city} with a local guide on this popular walking tour.`,
      fullDescription: `Join us for an unforgettable walking tour through ${city}! Your expert local guide will take you through historic neighborhoods, hidden gems, and iconic landmarks. Learn about the city's rich history, culture, and local traditions. Perfect for first-time visitors and locals alike who want to see their city from a new perspective.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
      rating: 4.8,
      reviewCount: 2341,
      priceText: '$35',
    },
    {
      id: 'demo-2',
      name: `${city} Food Tour`,
      shortDescription: `Taste your way through ${city}'s best culinary spots with a local foodie.`,
      fullDescription: `Embark on a culinary adventure through ${city}! Sample authentic local dishes, street food, and hidden restaurant gems. Your food-loving guide will share stories about the city's food culture and history. Includes multiple tastings at carefully selected venues.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      rating: 4.9,
      reviewCount: 1876,
      priceText: '$65',
    },
    {
      id: 'demo-3',
      name: `${city} Sunset Cruise`,
      shortDescription: `Experience breathtaking views on an evening cruise with drinks included.`,
      fullDescription: `Set sail on a magical sunset cruise and see ${city} from the water. Enjoy complimentary drinks while watching the sun set over the skyline. Perfect for couples, photography enthusiasts, or anyone looking for a relaxing evening activity.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      rating: 4.7,
      reviewCount: 956,
      priceText: '$89',
    },
    {
      id: 'demo-4',
      name: `${city} Art & Museums Pass`,
      shortDescription: `Skip the lines with this all-access pass to top museums and galleries.`,
      fullDescription: `Get exclusive access to ${city}'s finest museums and art galleries with this convenient pass. Skip the long lines and explore world-class collections at your own pace. Valid for multiple days, perfect for art lovers and culture enthusiasts.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&q=80',
      rating: 4.6,
      reviewCount: 1234,
      priceText: '$45',
    },
    {
      id: 'demo-5',
      name: `${city} Bike Adventure`,
      shortDescription: `Explore the city on two wheels with this guided bicycle tour.`,
      fullDescription: `See more of ${city} on this fun and active bike tour! Cover more ground than walking while enjoying the freedom to stop at interesting spots. Suitable for all fitness levels with comfortable bikes and helmets provided.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?w=800&q=80',
      rating: 4.8,
      reviewCount: 789,
      priceText: '$40',
    },
    {
      id: 'demo-6',
      name: `${city} Night Tour`,
      shortDescription: `See the city come alive after dark on this atmospheric evening tour.`,
      fullDescription: `Experience the magic of ${city} at night! Discover illuminated landmarks, bustling nightlife districts, and peaceful evening spots. Your guide will share fascinating stories and local secrets that you won't find in any guidebook.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
      rating: 4.7,
      reviewCount: 654,
      priceText: '$55',
    },
    {
      id: 'demo-7',
      name: `${city} Street Art Tour`,
      shortDescription: `Discover the city's vibrant street art scene with an expert guide.`,
      fullDescription: `Uncover ${city}'s incredible street art and murals on this unique tour. Learn about the artists, the stories behind the works, and the evolution of street art in the city. A must for art lovers and Instagram enthusiasts!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80',
      rating: 4.9,
      reviewCount: 432,
      priceText: '$30',
    },
    {
      id: 'demo-8',
      name: `${city} Cooking Class`,
      shortDescription: `Learn to cook authentic local dishes with a professional chef.`,
      fullDescription: `Join a hands-on cooking class and master the art of local cuisine! Work alongside a professional chef to prepare traditional dishes from scratch. Includes all ingredients, recipes to take home, and of course, eating your delicious creations!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
      rating: 4.9,
      reviewCount: 567,
      priceText: '$85',
    },
    {
      id: 'demo-9',
      name: `${city} Rooftop Bar Hop`,
      shortDescription: `Visit the best rooftop bars with stunning views and craft cocktails.`,
      fullDescription: `Experience ${city}'s nightlife from above! Visit three exclusive rooftop bars with panoramic views of the city. Includes a welcome drink at each location and skip-the-line access. Perfect for a memorable night out.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
      rating: 4.6,
      reviewCount: 321,
      priceText: '$75',
    },
    {
      id: 'demo-10',
      name: `${city} Photography Tour`,
      shortDescription: `Capture stunning photos with tips from a professional photographer.`,
      fullDescription: `Perfect for all skill levels! Learn composition, lighting, and technique while visiting the most photogenic spots in ${city}. Your photographer guide will help you capture amazing shots and improve your photography skills.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80',
      rating: 4.8,
      reviewCount: 234,
      priceText: '$60',
    },
    {
      id: 'demo-11',
      name: `${city} Market Tour`,
      shortDescription: `Explore vibrant local markets and sample fresh local products.`,
      fullDescription: `Dive into the heart of ${city}'s food culture at local markets! Sample fresh produce, artisanal goods, and street food while learning about local ingredients and culinary traditions. A feast for all the senses!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
      rating: 4.7,
      reviewCount: 445,
      priceText: '$45',
    },
    {
      id: 'demo-12',
      name: `${city} Historic Quarter Tour`,
      shortDescription: `Step back in time exploring centuries-old architecture and stories.`,
      fullDescription: `Journey through ${city}'s fascinating history! Explore ancient streets, historic buildings, and hidden courtyards. Your expert guide will bring the past to life with captivating stories and historical insights.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
      rating: 4.8,
      reviewCount: 678,
      priceText: '$38',
    },
    {
      id: 'demo-13',
      name: `${city} Wine Tasting`,
      shortDescription: `Sample regional wines with a sommelier at top wine bars.`,
      fullDescription: `Discover the region's finest wines on this sophisticated tasting tour. Visit carefully selected wine bars and learn about local grape varieties, winemaking techniques, and food pairings from an expert sommelier.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
      rating: 4.9,
      reviewCount: 289,
      priceText: '$95',
    },
    {
      id: 'demo-14',
      name: `${city} Segway Tour`,
      shortDescription: `Glide through the city on a fun and eco-friendly Segway tour.`,
      fullDescription: `See ${city} in style on a Segway! Cover more ground than walking while having fun on these easy-to-ride personal transporters. Includes training, helmet, and guide. Suitable for beginners.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      rating: 4.5,
      reviewCount: 412,
      priceText: '$55',
    },
    {
      id: 'demo-15',
      name: `${city} Day Trip`,
      shortDescription: `Escape the city for a day exploring nearby attractions.`,
      fullDescription: `Take a break from the urban bustle! This day trip takes you to stunning nearby destinations including natural landscapes, charming villages, or historic sites. Includes comfortable transportation and an expert guide.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      rating: 4.7,
      reviewCount: 534,
      priceText: '$120',
    },
  ]

  return activities.map(a => ({
    ...a,
    city,
    latitude: 0,
    longitude: 0,
    bookingUrl: `https://www.viator.com/searchResults/all?pid=P00166834&mcid=42383&medium=link&text=${encodeURIComponent(a.name)}`,
    source: 'viator' as const,
  }))
}

function getDemoActivityById(id: string): ActivityCard | null {
  const activities = generateDemoActivities('Demo City')
  return activities.find(a => a.id === id) || null
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  if (!VIATOR_API_KEY) {
    console.log('Note: Viator API key not configured. Using demo data.')
  }
})

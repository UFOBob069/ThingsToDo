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

// Viator API configuration
const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''
const VIATOR_BASE_URL = process.env.VIATOR_PRODUCTION === 'true'
  ? 'https://viatorapi.viator.com/service'
  : 'https://viatorapi.sandbox.viator.com/service'

// Strip HTML tags from text
function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Transform Viator product to our format
function transformViatorProduct(product: any, city: string): ActivityCard {
  let priceText: string | undefined
  if (product.price?.fromPrice) {
    const amount = parseFloat(product.price.fromPrice)
    const currency = product.price.currencyCode || 'USD'
    priceText = `${currency === 'USD' ? '$' : currency + ' '}${amount.toFixed(0)}`
  } else if (product.priceFormatted) {
    priceText = product.priceFormatted
  }

  const bookingUrl = product.webURL ||
    `https://www.viator.com/tours/${product.productCode || product.code}`

  return {
    id: product.productCode || product.code || product.id,
    name: stripHtml(product.title || product.name),
    shortDescription: stripHtml(product.shortDescription || product.description?.substring(0, 150) || ''),
    fullDescription: stripHtml(product.description),
    heroImageUrl: product.thumbnailURL || product.thumbnailHiResURL ||
      product.images?.[0]?.url || product.images?.[0]?.thumbnailURL ||
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    city,
    latitude: product.latitude || 0,
    longitude: product.longitude || 0,
    rating: product.rating ? parseFloat(product.rating) : undefined,
    reviewCount: product.reviewCount || product.reviews,
    priceText,
    bookingUrl,
    source: 'viator',
  }
}

// Search activities endpoint
app.get('/api/activities', async (req, res) => {
  try {
    const { latitude, longitude, city } = req.query
    const cityName = city as string || 'Unknown City'

    if (!city) {
      return res.status(400).json({ error: 'City name is required' })
    }

    const cacheKey = `activities-${cityName}`
    const cached = searchCache.get<ActivityCard[]>(cacheKey)

    if (cached) {
      return res.json(cached)
    }

    // If no API key, return demo data
    if (!VIATOR_API_KEY) {
      const demoActivities = generateDemoActivities(cityName)
      searchCache.set(cacheKey, demoActivities)
      return res.json(demoActivities)
    }

    // Use freetext search with the city name
    const searchBody = {
      searchTerm: cityName,
      searchTypes: ['PRODUCTS'],
      currency: 'USD',
      pagination: {
        start: 1,
        count: 50
      }
    }

    const response = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'exp-api-key': VIATOR_API_KEY,
      },
      body: JSON.stringify(searchBody),
    })

    if (!response.ok) {
      throw new Error(`Viator API error: ${response.status}`)
    }

    const data = await response.json()
    const products = data.products || data.data?.products || []
    const activities = products.map((p: any) => transformViatorProduct(p, cityName))

    if (activities.length === 0) {
      const demoActivities = generateDemoActivities(cityName)
      searchCache.set(cacheKey, demoActivities)
      return res.json(demoActivities)
    }

    searchCache.set(cacheKey, activities)
    res.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
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

    const response = await fetch(`${VIATOR_BASE_URL}/product?code=${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'exp-api-key': VIATOR_API_KEY,
      },
    })

    if (!response.ok) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    const data = await response.json()
    const product = data.data || data

    if (!product) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    const activity = transformViatorProduct(product, product.destinationName || '')

    detailsCache.set(id, activity)
    res.json(activity)
  } catch (error) {
    console.error('Error fetching activity details:', error)
    res.status(404).json({ error: 'Activity not found' })
  }
})

// City search endpoint
app.get('/api/cities', async (req, res) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([])
    }

    const cities = searchCities(q)
    res.json(cities)
  } catch (error) {
    console.error('Error searching cities:', error)
    res.json([])
  }
})

// Reverse geocode endpoint
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' })
    }

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
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'New York, United States' },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'California, United States' },
  { name: 'Chicago', latitude: 41.8781, longitude: -87.6298, country: 'Illinois, United States' },
  { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, country: 'California, United States' },
  { name: 'Miami', latitude: 25.7617, longitude: -80.1918, country: 'Florida, United States' },
  { name: 'Las Vegas', latitude: 36.1699, longitude: -115.1398, country: 'Nevada, United States' },
  { name: 'Seattle', latitude: 47.6062, longitude: -122.3321, country: 'Washington, United States' },
  { name: 'Boston', latitude: 42.3601, longitude: -71.0589, country: 'Massachusetts, United States' },
  { name: 'Austin', latitude: 30.2672, longitude: -97.7431, country: 'Texas, United States' },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'United Kingdom' },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' },
  { name: 'Rome', latitude: 41.9028, longitude: 12.4964, country: 'Italy' },
  { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, country: 'Spain' },
  { name: 'Amsterdam', latitude: 52.3676, longitude: 4.9041, country: 'Netherlands' },
  { name: 'Berlin', latitude: 52.52, longitude: 13.405, country: 'Germany' },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan' },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, country: 'Australia' },
  { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, country: 'United Arab Emirates' },
  { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, country: 'Singapore' },
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018, country: 'Thailand' },
  { name: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, country: 'China' },
  { name: 'Mexico City', latitude: 19.4326, longitude: -99.1332, country: 'Mexico' },
  { name: 'Toronto', latitude: 43.6532, longitude: -79.3832, country: 'Ontario, Canada' },
  { name: 'Vancouver', latitude: 49.2827, longitude: -123.1207, country: 'British Columbia, Canada' },
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
      fullDescription: `Join us for an unforgettable walking tour through ${city}! Your expert local guide will take you through historic neighborhoods, hidden gems, and iconic landmarks.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
      rating: 4.8,
      reviewCount: 2341,
      priceText: '$35',
    },
    {
      id: 'demo-2',
      name: `${city} Food Tour`,
      shortDescription: `Taste your way through ${city}'s best culinary spots with a local foodie.`,
      fullDescription: `Embark on a culinary adventure through ${city}! Sample authentic local dishes, street food, and hidden restaurant gems.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      rating: 4.9,
      reviewCount: 1876,
      priceText: '$65',
    },
    {
      id: 'demo-3',
      name: `${city} Sunset Cruise`,
      shortDescription: `Experience breathtaking views on an evening cruise with drinks included.`,
      fullDescription: `Set sail on a magical sunset cruise and see ${city} from the water.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      rating: 4.7,
      reviewCount: 956,
      priceText: '$89',
    },
    {
      id: 'demo-4',
      name: `${city} Art & Museums Pass`,
      shortDescription: `Skip the lines with this all-access pass to top museums and galleries.`,
      fullDescription: `Get exclusive access to ${city}'s finest museums and art galleries.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&q=80',
      rating: 4.6,
      reviewCount: 1234,
      priceText: '$45',
    },
    {
      id: 'demo-5',
      name: `${city} Bike Adventure`,
      shortDescription: `Explore the city on two wheels with this guided bicycle tour.`,
      fullDescription: `See more of ${city} on this fun and active bike tour!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?w=800&q=80',
      rating: 4.8,
      reviewCount: 789,
      priceText: '$40',
    },
    {
      id: 'demo-6',
      name: `${city} Night Tour`,
      shortDescription: `See the city come alive after dark on this atmospheric evening tour.`,
      fullDescription: `Experience the magic of ${city} at night!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
      rating: 4.7,
      reviewCount: 654,
      priceText: '$55',
    },
    {
      id: 'demo-7',
      name: `${city} Street Art Tour`,
      shortDescription: `Discover the city's vibrant street art scene with an expert guide.`,
      fullDescription: `Uncover ${city}'s incredible street art and murals.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80',
      rating: 4.9,
      reviewCount: 432,
      priceText: '$30',
    },
    {
      id: 'demo-8',
      name: `${city} Cooking Class`,
      shortDescription: `Learn to cook authentic local dishes with a professional chef.`,
      fullDescription: `Join a hands-on cooking class and master the art of local cuisine!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
      rating: 4.9,
      reviewCount: 567,
      priceText: '$85',
    },
    {
      id: 'demo-9',
      name: `${city} Rooftop Bar Hop`,
      shortDescription: `Visit the best rooftop bars with stunning views and craft cocktails.`,
      fullDescription: `Experience ${city}'s nightlife from above!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
      rating: 4.6,
      reviewCount: 321,
      priceText: '$75',
    },
    {
      id: 'demo-10',
      name: `${city} Photography Tour`,
      shortDescription: `Capture stunning photos with tips from a professional photographer.`,
      fullDescription: `Learn composition, lighting, and technique while visiting the most photogenic spots.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80',
      rating: 4.8,
      reviewCount: 234,
      priceText: '$60',
    },
    {
      id: 'demo-11',
      name: `${city} Market Tour`,
      shortDescription: `Explore vibrant local markets and sample fresh local products.`,
      fullDescription: `Dive into the heart of ${city}'s food culture at local markets!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
      rating: 4.7,
      reviewCount: 445,
      priceText: '$45',
    },
    {
      id: 'demo-12',
      name: `${city} Historic Quarter Tour`,
      shortDescription: `Step back in time exploring centuries-old architecture and stories.`,
      fullDescription: `Journey through ${city}'s fascinating history!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
      rating: 4.8,
      reviewCount: 678,
      priceText: '$38',
    },
    {
      id: 'demo-13',
      name: `${city} Wine Tasting`,
      shortDescription: `Sample regional wines with a sommelier at top wine bars.`,
      fullDescription: `Discover the region's finest wines on this sophisticated tasting tour.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
      rating: 4.9,
      reviewCount: 289,
      priceText: '$95',
    },
    {
      id: 'demo-14',
      name: `${city} Segway Tour`,
      shortDescription: `Glide through the city on a fun and eco-friendly Segway tour.`,
      fullDescription: `See ${city} in style on a Segway!`,
      heroImageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      rating: 4.5,
      reviewCount: 412,
      priceText: '$55',
    },
    {
      id: 'demo-15',
      name: `${city} Day Trip`,
      shortDescription: `Escape the city for a day exploring nearby attractions.`,
      fullDescription: `Take a break from the urban bustle!`,
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
    bookingUrl: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(a.name)}`,
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

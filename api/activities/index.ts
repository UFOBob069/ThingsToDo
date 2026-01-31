import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface ActivityCard {
  id: string
  name: string
  shortDescription: string
  fullDescription?: string
  heroImageUrl: string
  city: string
  latitude: number
  longitude: number
  rating?: number
  reviewCount?: number
  priceText?: string
  bookingUrl: string
  source: 'viator'
}

const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''
const VIATOR_BASE_URL = 'https://api.viator.com/partner'

// Cache for destination lookups
const destinationCache: Record<string, { id: string; name: string } | null> = {}

// Look up Viator destination ID from city name
async function lookupDestination(cityName: string): Promise<{ id: string; name: string } | null> {
  if (destinationCache[cityName.toLowerCase()]) {
    return destinationCache[cityName.toLowerCase()]
  }

  try {
    const response = await fetch(`${VIATOR_BASE_URL}/destinations/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'exp-api-key': VIATOR_API_KEY,
      },
      body: JSON.stringify({
        searchTerm: cityName,
        searchTypes: ['CITY', 'REGION'],
      }),
    })

    if (!response.ok) {
      console.error('Destination lookup failed:', response.status)
      return null
    }

    const data = await response.json()
    const destinations = data.destinations || []

    // Find the best match - prefer exact city matches
    const match = destinations.find((d: any) =>
      d.name.toLowerCase() === cityName.toLowerCase() ||
      d.name.toLowerCase().startsWith(cityName.toLowerCase())
    ) || destinations[0]

    if (match) {
      const result = { id: match.destinationId.toString(), name: match.name }
      destinationCache[cityName.toLowerCase()] = result
      return result
    }
  } catch (error) {
    console.error('Error looking up destination:', error)
  }

  destinationCache[cityName.toLowerCase()] = null
  return null
}

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
    city,
    latitude: product.geoLocation?.latitude || 0,
    longitude: product.geoLocation?.longitude || 0,
    rating,
    reviewCount,
    priceText,
    bookingUrl,
    source: 'viator',
  }
}

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
      fullDescription: `Set sail on a magical sunset cruise and see ${city} from the water. Enjoy complimentary drinks while watching the sun set over the skyline.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      rating: 4.7,
      reviewCount: 956,
      priceText: '$89',
    },
    {
      id: 'demo-4',
      name: `${city} Art & Museums Pass`,
      shortDescription: `Skip the lines with this all-access pass to top museums and galleries.`,
      fullDescription: `Get exclusive access to ${city}'s finest museums and art galleries with this convenient pass.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&q=80',
      rating: 4.6,
      reviewCount: 1234,
      priceText: '$45',
    },
    {
      id: 'demo-5',
      name: `${city} Bike Adventure`,
      shortDescription: `Explore the city on two wheels with this guided bicycle tour.`,
      fullDescription: `See more of ${city} on this fun and active bike tour! Cover more ground than walking while enjoying the freedom to stop at interesting spots.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?w=800&q=80',
      rating: 4.8,
      reviewCount: 789,
      priceText: '$40',
    },
    {
      id: 'demo-6',
      name: `${city} Night Tour`,
      shortDescription: `See the city come alive after dark on this atmospheric evening tour.`,
      fullDescription: `Experience the magic of ${city} at night! Discover illuminated landmarks, bustling nightlife districts, and peaceful evening spots.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80',
      rating: 4.7,
      reviewCount: 654,
      priceText: '$55',
    },
    {
      id: 'demo-7',
      name: `${city} Street Art Tour`,
      shortDescription: `Discover the city's vibrant street art scene with an expert guide.`,
      fullDescription: `Uncover ${city}'s incredible street art and murals on this unique tour.`,
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
      fullDescription: `Experience ${city}'s nightlife from above! Visit three exclusive rooftop bars with panoramic views.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
      rating: 4.6,
      reviewCount: 321,
      priceText: '$75',
    },
    {
      id: 'demo-10',
      name: `${city} Photography Tour`,
      shortDescription: `Capture stunning photos with tips from a professional photographer.`,
      fullDescription: `Perfect for all skill levels! Learn composition, lighting, and technique while visiting the most photogenic spots.`,
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
      fullDescription: `Journey through ${city}'s fascinating history! Explore ancient streets, historic buildings, and hidden courtyards.`,
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
      fullDescription: `See ${city} in style on a Segway! Cover more ground than walking while having fun.`,
      heroImageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      rating: 4.5,
      reviewCount: 412,
      priceText: '$55',
    },
    {
      id: 'demo-15',
      name: `${city} Day Trip`,
      shortDescription: `Escape the city for a day exploring nearby attractions.`,
      fullDescription: `Take a break from the urban bustle! This day trip takes you to stunning nearby destinations.`,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { latitude, longitude, city, destinationId, activityType } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' })
    }

    // If no API key, return demo data
    if (!VIATOR_API_KEY) {
      const demoActivities = generateDemoActivities(city as string || 'Unknown City')
      return res.json(demoActivities)
    }

    const cityName = city as string || 'Unknown City'

    // Build search payload - removed price filter to get more results
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

    // Use provided destinationId, or look it up from city name
    if (destinationId) {
      searchPayload.filtering.destination = destinationId
    } else {
      const destination = await lookupDestination(cityName)
      if (destination) {
        searchPayload.filtering.destination = destination.id
      } else {
        searchPayload.searchTerm = cityName
      }
    }

    // Add activity type filter if specified
    if (activityType && activityType !== 'all' && VIATOR_TAGS[activityType as string]) {
      searchPayload.filtering.tags = [VIATOR_TAGS[activityType as string]]
    }

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

    res.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    console.error('Falling back to demo data. API Key configured:', !!VIATOR_API_KEY)
    const demoActivities = generateDemoActivities(req.query.city as string || 'Unknown City')
    res.json(demoActivities)
  }
}

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
// Use production API if VIATOR_PRODUCTION is set, otherwise use sandbox
const VIATOR_BASE_URL = process.env.VIATOR_PRODUCTION === 'true'
  ? 'https://viatorapi.viator.com/service'
  : 'https://viatorapi.sandbox.viator.com/service'

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
  // Extract price from Viator response
  let priceText: string | undefined
  if (product.price?.fromPrice) {
    const amount = parseFloat(product.price.fromPrice)
    const currency = product.price.currencyCode || 'USD'
    priceText = `${currency === 'USD' ? '$' : currency + ' '}${amount.toFixed(0)}`
  } else if (product.priceFormatted) {
    priceText = product.priceFormatted
  }

  // Build the booking URL using the product code
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
    bookingUrl: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(a.name)}`,
    source: 'viator' as const,
  }))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { latitude, longitude, city, destId } = req.query

    if (!city && !destId) {
      return res.status(400).json({ error: 'City name or destId is required' })
    }

    const cityName = city as string || 'Unknown City'

    // If no API key, return demo data
    if (!VIATOR_API_KEY) {
      console.log('[Activities API] No Viator API key configured - returning demo data')
      const demoActivities = generateDemoActivities(cityName)
      return res.json(demoActivities)
    }

    console.log(`[Activities API] Fetching activities for ${cityName} using Viator API`)

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
      const errorText = await response.text()
      console.error(`[Activities API] Viator API error: ${response.status} - ${errorText}`)
      throw new Error(`Viator API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform products from Viator response
    const products = data.products || data.data?.products || []
    const activities = products.map((p: any) => transformViatorProduct(p, cityName))

    console.log(`[Activities API] Successfully fetched ${activities.length} activities from Viator`)

    if (activities.length === 0) {
      console.log('[Activities API] No activities found, returning demo data')
      return res.json(generateDemoActivities(cityName))
    }

    res.json(activities)
  } catch (error) {
    console.error('[Activities API] Error fetching activities:', error)
    console.log('[Activities API] Falling back to demo data due to error')
    const demoActivities = generateDemoActivities(req.query.city as string || 'Unknown City')
    res.json(demoActivities)
  }
}

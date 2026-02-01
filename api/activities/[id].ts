import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ActivityCard {
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

function getDemoActivityById(id: string): ActivityCard | null {
  const demoActivities: Record<string, Omit<ActivityCard, 'city' | 'latitude' | 'longitude' | 'bookingUrl' | 'source'>> = {
    'demo-1': { id: 'demo-1', name: 'Walking Tour', shortDescription: 'Discover the best of the city with a local guide.', fullDescription: 'Join us for an unforgettable walking tour!', heroImageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80', rating: 4.8, reviewCount: 2341, priceText: '$35' },
    'demo-2': { id: 'demo-2', name: 'Food Tour', shortDescription: 'Taste your way through the best culinary spots.', fullDescription: 'Embark on a culinary adventure!', heroImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', rating: 4.9, reviewCount: 1876, priceText: '$65' },
    'demo-3': { id: 'demo-3', name: 'Sunset Cruise', shortDescription: 'Breathtaking views on an evening cruise with drinks.', fullDescription: 'Set sail on a magical sunset cruise.', heroImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', rating: 4.7, reviewCount: 956, priceText: '$89' },
    'demo-4': { id: 'demo-4', name: 'Art & Museums Pass', shortDescription: 'Skip the lines at top museums and galleries.', fullDescription: 'Get exclusive access to the finest museums.', heroImageUrl: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&q=80', rating: 4.6, reviewCount: 1234, priceText: '$45' },
    'demo-5': { id: 'demo-5', name: 'Bike Adventure', shortDescription: 'Explore the city on two wheels.', fullDescription: 'See more on this fun and active bike tour!', heroImageUrl: 'https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?w=800&q=80', rating: 4.8, reviewCount: 789, priceText: '$40' },
    'demo-6': { id: 'demo-6', name: 'Night Tour', shortDescription: 'See the city come alive after dark.', fullDescription: 'Experience the magic at night!', heroImageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80', rating: 4.7, reviewCount: 654, priceText: '$55' },
    'demo-7': { id: 'demo-7', name: 'Street Art Tour', shortDescription: 'Discover vibrant street art with an expert guide.', fullDescription: 'Uncover incredible street art and murals.', heroImageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80', rating: 4.9, reviewCount: 432, priceText: '$30' },
    'demo-8': { id: 'demo-8', name: 'Cooking Class', shortDescription: 'Learn to cook authentic local dishes.', fullDescription: 'Join a hands-on cooking class!', heroImageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', rating: 4.9, reviewCount: 567, priceText: '$85' },
    'demo-9': { id: 'demo-9', name: 'Rooftop Bar Hop', shortDescription: 'Visit the best rooftop bars with stunning views.', fullDescription: 'Experience nightlife from above!', heroImageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80', rating: 4.6, reviewCount: 321, priceText: '$75' },
    'demo-10': { id: 'demo-10', name: 'Photography Tour', shortDescription: 'Capture stunning photos with a pro photographer.', fullDescription: 'Learn composition, lighting, and technique.', heroImageUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80', rating: 4.8, reviewCount: 234, priceText: '$60' },
    'demo-11': { id: 'demo-11', name: 'Market Tour', shortDescription: 'Explore vibrant local markets.', fullDescription: 'Dive into the heart of the food culture at local markets!', heroImageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80', rating: 4.7, reviewCount: 445, priceText: '$45' },
    'demo-12': { id: 'demo-12', name: 'Historic Quarter Tour', shortDescription: 'Step back in time with centuries-old architecture.', fullDescription: 'Journey through fascinating history!', heroImageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80', rating: 4.8, reviewCount: 678, priceText: '$38' },
    'demo-13': { id: 'demo-13', name: 'Wine Tasting', shortDescription: 'Sample regional wines with a sommelier.', fullDescription: 'Discover the finest wines on this tasting tour.', heroImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80', rating: 4.9, reviewCount: 289, priceText: '$95' },
    'demo-14': { id: 'demo-14', name: 'Segway Tour', shortDescription: 'Glide through the city on a Segway.', fullDescription: 'See the city in style on a Segway!', heroImageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80', rating: 4.5, reviewCount: 412, priceText: '$55' },
    'demo-15': { id: 'demo-15', name: 'Day Trip', shortDescription: 'Escape the city for a day.', fullDescription: 'Take a break from the urban bustle!', heroImageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80', rating: 4.7, reviewCount: 534, priceText: '$120' },
  }

  const demo = demoActivities[id]
  if (!demo) return null

  return {
    ...demo,
    city: '',
    latitude: 0,
    longitude: 0,
    bookingUrl: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(demo.name)}`,
    source: 'viator',
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Activity ID is required' })
    }

    // Check if it's a demo activity
    if (id.startsWith('demo-')) {
      const demoActivity = getDemoActivityById(id)
      if (demoActivity) {
        return res.json(demoActivity)
      }
      return res.status(404).json({ error: 'Activity not found' })
    }

    if (!VIATOR_API_KEY) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    console.log(`[Activity Details API] Fetching product ${id} from Viator`)

    // Fetch product details from Viator
    const response = await fetch(`${VIATOR_BASE_URL}/product?code=${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'exp-api-key': VIATOR_API_KEY,
      },
    })

    if (!response.ok) {
      console.error(`[Activity Details API] Viator API error: ${response.status}`)
      return res.status(404).json({ error: 'Activity not found' })
    }

    const data = await response.json()
    const product = data.data || data

    if (!product) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    const activity = transformViatorProduct(product, product.destinationName || '')

    console.log(`[Activity Details API] Successfully fetched product ${id}`)
    res.json(activity)
  } catch (error) {
    console.error('[Activity Details API] Error fetching activity details:', error)
    res.status(404).json({ error: 'Activity not found' })
  }
}

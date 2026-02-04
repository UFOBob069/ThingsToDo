import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface City {
  name: string
  latitude: number
  longitude: number
  country?: string
  region?: string  // State/province
  destinationId?: number  // Viator destination ID
}

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''
const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''
const VIATOR_BASE_URL = process.env.VIATOR_API_BASE_URL || 'https://api.viator.com/partner'

// Cache for Viator destinations (loaded once per cold start)
let viatorDestinationsCache: any[] | null = null

// Fetch all Viator destinations
async function getViatorDestinations(): Promise<any[]> {
  if (viatorDestinationsCache) return viatorDestinationsCache

  if (!VIATOR_API_KEY) return []

  try {
    const response = await fetch(`${VIATOR_BASE_URL}/destinations`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'exp-api-key': VIATOR_API_KEY,
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch Viator destinations:', response.status)
      return []
    }

    const data = await response.json()
    viatorDestinationsCache = data.destinations || []
    console.log(`Loaded ${viatorDestinationsCache.length} Viator destinations`)
    return viatorDestinationsCache
  } catch (error) {
    console.error('Error fetching Viator destinations:', error)
    return []
  }
}

// Find Viator destination ID for a city
// First tries exact name match, then falls back to nearest destination by coordinates
function findViatorDestinationId(
  cityName: string,
  lat: number,
  lon: number,
  destinations: any[]
): { destinationId: number | undefined; matchedDestination?: string } {
  const normalized = cityName.toLowerCase().trim()

  // Try exact match first (safest)
  const exactMatch = destinations.find((d: any) => {
    const name = (d.destinationName || d.name || '').toLowerCase()
    return name === normalized
  })
  if (exactMatch) {
    return {
      destinationId: exactMatch.destinationId,
      matchedDestination: exactMatch.destinationName || exactMatch.name
    }
  }

  // No exact match - find nearest destination by coordinates
  // Only consider destinations that have coordinates and are of type CITY or REGION
  const destinationsWithCoords = destinations.filter((d: any) =>
    d.latitude && d.longitude &&
    (d.destinationType === 'CITY' || d.destinationType === 'REGION' || !d.destinationType)
  )

  if (destinationsWithCoords.length === 0) {
    return { destinationId: undefined }
  }

  // Calculate distance to each destination and find nearest
  let nearest: any = null
  let nearestDistance = Infinity

  for (const dest of destinationsWithCoords) {
    const distance = calculateDistance(lat, lon, dest.latitude, dest.longitude)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = dest
    }
  }

  // Only use nearest if it's within 150km (reasonable travel distance for activities)
  if (nearest && nearestDistance <= 150) {
    console.log(`No exact match for "${cityName}", using nearest: "${nearest.destinationName || nearest.name}" (${nearestDistance.toFixed(1)}km away)`)
    return {
      destinationId: nearest.destinationId,
      matchedDestination: nearest.destinationName || nearest.name
    }
  }

  return { destinationId: undefined }
}

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Fallback cities with known Viator destination IDs
const POPULAR_CITIES: City[] = [
  { name: 'Austin', latitude: 30.2672, longitude: -97.7431, country: 'USA', destinationId: 5021 },
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'USA', destinationId: 687 },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'USA', destinationId: 645 },
  { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, country: 'USA', destinationId: 651 },
  { name: 'Chicago', latitude: 41.8781, longitude: -87.6298, country: 'USA', destinationId: 673 },
  { name: 'Miami', latitude: 25.7617, longitude: -80.1918, country: 'USA', destinationId: 662 },
  { name: 'Las Vegas', latitude: 36.1699, longitude: -115.1398, country: 'USA', destinationId: 684 },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'UK', destinationId: 737 },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France', destinationId: 479 },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan', destinationId: 334 },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, country: 'Australia', destinationId: 357 },
  { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, country: 'UAE', destinationId: 828 },
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018, country: 'Thailand', destinationId: 343 },
  { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, country: 'Spain', destinationId: 562 },
  { name: 'Rome', latitude: 41.9028, longitude: 12.4964, country: 'Italy', destinationId: 511 },
]

function searchFallbackCities(query: string): City[] {
  const q = query.toLowerCase()
  return POPULAR_CITIES.filter(city =>
    city.name.toLowerCase().includes(q) ||
    (city.country && city.country.toLowerCase().includes(q))
  ).slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query

  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([])
  }

  // Load Viator destinations in background
  const viatorDestinations = await getViatorDestinations()

  // Use Mapbox Geocoding API if token is available
  if (MAPBOX_ACCESS_TOKEN) {
    try {
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
        throw new Error(`Mapbox API error: ${response.status}`)
      }

      const data = await response.json()

      const cities: City[] = data.features.map((feature: any) => {
        const countryContext = feature.context?.find((ctx: any) => ctx.id?.startsWith('country'))
        const regionContext = feature.context?.find((ctx: any) => ctx.id?.startsWith('region'))
        const country = countryContext?.text || ''
        const region = regionContext?.text || regionContext?.short_code?.split('-')[1] || ''
        const cityName = feature.text
        const lat = feature.center[1]
        const lon = feature.center[0]

        // Look up Viator destination ID for this city (uses coordinates for fallback)
        const { destinationId } = findViatorDestinationId(cityName, lat, lon, viatorDestinations)

        return {
          name: cityName,
          latitude: lat,
          longitude: lon,
          country,
          region,
          destinationId,
        }
      })

      return res.json(cities)
    } catch (error) {
      console.error('Mapbox API error:', error)
      return res.json(searchFallbackCities(q))
    }
  }

  // Fallback to curated list
  const cities = searchFallbackCities(q)
  res.json(cities)
}

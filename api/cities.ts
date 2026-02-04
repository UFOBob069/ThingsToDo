import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface City {
  name: string
  latitude: number
  longitude: number
  country?: string
  region?: string  // State/province
  destinationId?: number  // Viator destination ID
}

const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''
const VIATOR_BASE_URL = process.env.VIATOR_API_BASE_URL || 'https://api.viator.com/partner'

// Cache for Viator destinations (loaded once per cold start)
let viatorDestinationsCache: any[] | null = null
let destinationLookup: Map<number, any> | null = null

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

    // Build lookup map for parent destinations
    destinationLookup = new Map()
    for (const dest of viatorDestinationsCache) {
      destinationLookup.set(dest.destinationId, dest)
    }

    console.log(`Loaded ${viatorDestinationsCache.length} Viator destinations`)
    return viatorDestinationsCache
  } catch (error) {
    console.error('Error fetching Viator destinations:', error)
    return []
  }
}

// Get parent destination info (for region/country context)
function getParentInfo(dest: any): { region?: string; country?: string } {
  if (!destinationLookup || !dest.parentId) return {}

  const parent = destinationLookup.get(dest.parentId)
  if (!parent) return {}

  const parentName = parent.destinationName || parent.name

  // If parent is a country, use it as country
  if (parent.destinationType === 'COUNTRY') {
    return { country: parentName }
  }

  // If parent is a region/state, get its parent for country
  if (parent.destinationType === 'REGION') {
    const grandparent = parent.parentId ? destinationLookup.get(parent.parentId) : null
    const grandparentName = grandparent?.destinationName || grandparent?.name
    return {
      region: parentName,
      country: grandparentName
    }
  }

  return { region: parentName }
}

// Search Viator destinations directly - guarantees 1-to-1 matching
function searchViatorDestinations(query: string, destinations: any[]): City[] {
  const q = query.toLowerCase().trim()

  // Filter destinations that match the query
  const matches = destinations.filter((d: any) => {
    const name = (d.destinationName || d.name || '').toLowerCase()

    // Match if name starts with query or contains query
    return name.startsWith(q) || name.includes(q)
  })

  // Sort: exact matches first, then starts-with, then contains
  matches.sort((a: any, b: any) => {
    const aName = (a.destinationName || a.name || '').toLowerCase()
    const bName = (b.destinationName || b.name || '').toLowerCase()

    // Exact match first
    if (aName === q && bName !== q) return -1
    if (bName === q && aName !== q) return 1

    // Starts with query next
    const aStarts = aName.startsWith(q)
    const bStarts = bName.startsWith(q)
    if (aStarts && !bStarts) return -1
    if (bStarts && !aStarts) return 1

    // Alphabetical
    return aName.localeCompare(bName)
  })

  // Convert to City format (limit to 10 results)
  return matches.slice(0, 10).map((d: any) => {
    const parentInfo = getParentInfo(d)
    const destName = d.destinationName || d.name

    return {
      name: destName,
      latitude: d.latitude || 0,
      longitude: d.longitude || 0,
      country: parentInfo.country,
      region: parentInfo.region,
      destinationId: d.destinationId,
    }
  })
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

  // Load Viator destinations
  const viatorDestinations = await getViatorDestinations()

  // Search Viator destinations directly - this ensures 1-to-1 matching
  // Users can only select cities that Viator actually has
  if (viatorDestinations.length > 0) {
    const cities = searchViatorDestinations(q as string, viatorDestinations)

    if (cities.length > 0) {
      return res.json(cities)
    }
  }

  // Fallback to curated list if Viator destinations not available
  const cities = searchFallbackCities(q as string)
  res.json(cities)
}

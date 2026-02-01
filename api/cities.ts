import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface City {
  name: string
  latitude: number
  longitude: number
  country?: string
  bbox?: {
    topLeftLat: number
    topLeftLng: number
    bottomRightLat: number
    bottomRightLng: number
  }
}

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''

// Fallback cities if Mapbox is not configured
const POPULAR_CITIES: City[] = [
  { name: 'Austin', latitude: 30.2672, longitude: -97.7431, country: 'USA' },
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'USA' },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'USA' },
  { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, country: 'USA' },
  { name: 'Chicago', latitude: 41.8781, longitude: -87.6298, country: 'USA' },
  { name: 'Miami', latitude: 25.7617, longitude: -80.1918, country: 'USA' },
  { name: 'Las Vegas', latitude: 36.1699, longitude: -115.1398, country: 'USA' },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'UK' },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan' },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, country: 'Australia' },
  { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, country: 'UAE' },
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018, country: 'Thailand' },
  { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, country: 'Spain' },
  { name: 'Rome', latitude: 41.9028, longitude: 12.4964, country: 'Italy' },
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
    } catch (error) {
      console.error('Mapbox API error:', error)
      // Fall back to curated list on error
      return res.json(searchFallbackCities(q))
    }
  }

  // Fallback to curated list if no Mapbox token
  const cities = searchFallbackCities(q)
  res.json(cities)
}

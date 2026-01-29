import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface City {
  name: string
  latitude: number
  longitude: number
  country?: string
}

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''

// Fallback cities if Mapbox is not configured
const POPULAR_CITIES: City[] = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'USA' },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'USA' },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'UK' },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan' },
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
        })
      )

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`)
      }

      const data = await response.json()

      // Validate that we have features array
      if (!data.features || !Array.isArray(data.features)) {
        return res.json(searchFallbackCities(q))
      }

      const cities: City[] = data.features.map((feature: any) => {
        // Extract country from context
        const countryContext = feature.context?.find((ctx: any) => ctx.id?.startsWith('country'))
        const country = countryContext?.text || ''

        return {
          name: feature.text || '',
          latitude: feature.center?.[1] || 0,
          longitude: feature.center?.[0] || 0,
          country,
        }
      }).filter((city: City) => city.name) // Filter out any cities without names

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

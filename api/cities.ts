import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface City {
  name: string
  latitude: number
  longitude: number
  country?: string
}

const POPULAR_CITIES: City[] = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'USA' },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'USA' },
  { name: 'Chicago', latitude: 41.8781, longitude: -87.6298, country: 'USA' },
  { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, country: 'USA' },
  { name: 'Miami', latitude: 25.7617, longitude: -80.1918, country: 'USA' },
  { name: 'Las Vegas', latitude: 36.1699, longitude: -115.1398, country: 'USA' },
  { name: 'Seattle', latitude: 47.6062, longitude: -122.3321, country: 'USA' },
  { name: 'Boston', latitude: 42.3601, longitude: -71.0589, country: 'USA' },
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

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query

  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([])
  }

  const cities = searchCities(q)
  res.json(cities)
}

import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface City {
  name: string
  latitude: number
  longitude: number
  country: string
}

// Curated list of popular tourist destinations with coordinates
const POPULAR_CITIES: City[] = [
  // United States
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'New York, United States' },
  { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, country: 'California, United States' },
  { name: 'Chicago', latitude: 41.8781, longitude: -87.6298, country: 'Illinois, United States' },
  { name: 'Miami', latitude: 25.7617, longitude: -80.1918, country: 'Florida, United States' },
  { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, country: 'California, United States' },
  { name: 'Las Vegas', latitude: 36.1699, longitude: -115.1398, country: 'Nevada, United States' },
  { name: 'Orlando', latitude: 28.5383, longitude: -81.3792, country: 'Florida, United States' },
  { name: 'Seattle', latitude: 47.6062, longitude: -122.3321, country: 'Washington, United States' },
  { name: 'Boston', latitude: 42.3601, longitude: -71.0589, country: 'Massachusetts, United States' },
  { name: 'Washington', latitude: 38.9072, longitude: -77.0369, country: 'D.C., United States' },
  { name: 'San Diego', latitude: 32.7157, longitude: -117.1611, country: 'California, United States' },
  { name: 'New Orleans', latitude: 29.9511, longitude: -90.0715, country: 'Louisiana, United States' },
  { name: 'Austin', latitude: 30.2672, longitude: -97.7431, country: 'Texas, United States' },
  { name: 'Nashville', latitude: 36.1627, longitude: -86.7816, country: 'Tennessee, United States' },
  { name: 'Denver', latitude: 39.7392, longitude: -104.9903, country: 'Colorado, United States' },
  { name: 'Philadelphia', latitude: 39.9526, longitude: -75.1652, country: 'Pennsylvania, United States' },
  { name: 'Atlanta', latitude: 33.749, longitude: -84.388, country: 'Georgia, United States' },
  { name: 'Phoenix', latitude: 33.4484, longitude: -112.074, country: 'Arizona, United States' },
  { name: 'Portland', latitude: 45.5152, longitude: -122.6784, country: 'Oregon, United States' },
  { name: 'Honolulu', latitude: 21.3069, longitude: -157.8583, country: 'Hawaii, United States' },
  { name: 'Dallas', latitude: 32.7767, longitude: -96.797, country: 'Texas, United States' },
  { name: 'Houston', latitude: 29.7604, longitude: -95.3698, country: 'Texas, United States' },
  { name: 'San Antonio', latitude: 29.4241, longitude: -98.4936, country: 'Texas, United States' },

  // Europe
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'United Kingdom' },
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' },
  { name: 'Rome', latitude: 41.9028, longitude: 12.4964, country: 'Italy' },
  { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, country: 'Spain' },
  { name: 'Amsterdam', latitude: 52.3676, longitude: 4.9041, country: 'Netherlands' },
  { name: 'Berlin', latitude: 52.52, longitude: 13.405, country: 'Germany' },
  { name: 'Prague', latitude: 50.0755, longitude: 14.4378, country: 'Czech Republic' },
  { name: 'Vienna', latitude: 48.2082, longitude: 16.3738, country: 'Austria' },
  { name: 'Dublin', latitude: 53.3498, longitude: -6.2603, country: 'Ireland' },
  { name: 'Lisbon', latitude: 38.7223, longitude: -9.1393, country: 'Portugal' },
  { name: 'Madrid', latitude: 40.4168, longitude: -3.7038, country: 'Spain' },
  { name: 'Florence', latitude: 43.7696, longitude: 11.2558, country: 'Italy' },
  { name: 'Venice', latitude: 45.4408, longitude: 12.3155, country: 'Italy' },
  { name: 'Edinburgh', latitude: 55.9533, longitude: -3.1883, country: 'Scotland, United Kingdom' },
  { name: 'Munich', latitude: 48.1351, longitude: 11.582, country: 'Germany' },
  { name: 'Budapest', latitude: 47.4979, longitude: 19.0402, country: 'Hungary' },
  { name: 'Athens', latitude: 37.9838, longitude: 23.7275, country: 'Greece' },
  { name: 'Copenhagen', latitude: 55.6761, longitude: 12.5683, country: 'Denmark' },
  { name: 'Stockholm', latitude: 59.3293, longitude: 18.0686, country: 'Sweden' },
  { name: 'Brussels', latitude: 50.8503, longitude: 4.3517, country: 'Belgium' },
  { name: 'Zurich', latitude: 47.3769, longitude: 8.5417, country: 'Switzerland' },
  { name: 'Milan', latitude: 45.4642, longitude: 9.19, country: 'Italy' },
  { name: 'Nice', latitude: 43.7102, longitude: 7.262, country: 'France' },

  // Asia
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan' },
  { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018, country: 'Thailand' },
  { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, country: 'Singapore' },
  { name: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, country: 'China' },
  { name: 'Seoul', latitude: 37.5665, longitude: 126.978, country: 'South Korea' },
  { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, country: 'United Arab Emirates' },
  { name: 'Bali', latitude: -8.3405, longitude: 115.092, country: 'Indonesia' },
  { name: 'Phuket', latitude: 7.8804, longitude: 98.3923, country: 'Thailand' },
  { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681, country: 'Japan' },
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777, country: 'India' },
  { name: 'Delhi', latitude: 28.6139, longitude: 77.209, country: 'India' },
  { name: 'Taipei', latitude: 25.033, longitude: 121.5654, country: 'Taiwan' },
  { name: 'Kuala Lumpur', latitude: 3.139, longitude: 101.6869, country: 'Malaysia' },
  { name: 'Ho Chi Minh City', latitude: 10.8231, longitude: 106.6297, country: 'Vietnam' },
  { name: 'Hanoi', latitude: 21.0285, longitude: 105.8542, country: 'Vietnam' },
  { name: 'Osaka', latitude: 34.6937, longitude: 135.5023, country: 'Japan' },
  { name: 'Beijing', latitude: 39.9042, longitude: 116.4074, country: 'China' },
  { name: 'Shanghai', latitude: 31.2304, longitude: 121.4737, country: 'China' },

  // Oceania
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, country: 'Australia' },
  { name: 'Melbourne', latitude: -37.8136, longitude: 144.9631, country: 'Australia' },
  { name: 'Auckland', latitude: -36.8509, longitude: 174.7645, country: 'New Zealand' },
  { name: 'Queenstown', latitude: -45.0312, longitude: 168.6626, country: 'New Zealand' },
  { name: 'Brisbane', latitude: -27.4698, longitude: 153.0251, country: 'Australia' },
  { name: 'Perth', latitude: -31.9505, longitude: 115.8605, country: 'Australia' },

  // South America
  { name: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729, country: 'Brazil' },
  { name: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816, country: 'Argentina' },
  { name: 'Lima', latitude: -12.0464, longitude: -77.0428, country: 'Peru' },
  { name: 'Cusco', latitude: -13.532, longitude: -71.9675, country: 'Peru' },
  { name: 'Cartagena', latitude: 10.391, longitude: -75.4794, country: 'Colombia' },
  { name: 'Santiago', latitude: -33.4489, longitude: -70.6693, country: 'Chile' },
  { name: 'Sao Paulo', latitude: -23.5505, longitude: -46.6333, country: 'Brazil' },
  { name: 'Bogota', latitude: 4.711, longitude: -74.0721, country: 'Colombia' },
  { name: 'Medellin', latitude: 6.2442, longitude: -75.5812, country: 'Colombia' },

  // Central America & Caribbean
  { name: 'Cancun', latitude: 21.1619, longitude: -86.8515, country: 'Mexico' },
  { name: 'Mexico City', latitude: 19.4326, longitude: -99.1332, country: 'Mexico' },
  { name: 'San Juan', latitude: 18.4655, longitude: -66.1057, country: 'Puerto Rico' },
  { name: 'Nassau', latitude: 25.0343, longitude: -77.3963, country: 'Bahamas' },
  { name: 'Playa del Carmen', latitude: 20.6296, longitude: -87.0739, country: 'Mexico' },
  { name: 'Puerto Vallarta', latitude: 20.6534, longitude: -105.2253, country: 'Mexico' },
  { name: 'Aruba', latitude: 12.5211, longitude: -69.9683, country: 'Aruba' },

  // Africa & Middle East
  { name: 'Cape Town', latitude: -33.9249, longitude: 18.4241, country: 'South Africa' },
  { name: 'Marrakech', latitude: 31.6295, longitude: -7.9811, country: 'Morocco' },
  { name: 'Cairo', latitude: 30.0444, longitude: 31.2357, country: 'Egypt' },
  { name: 'Tel Aviv', latitude: 32.0853, longitude: 34.7818, country: 'Israel' },
  { name: 'Istanbul', latitude: 41.0082, longitude: 28.9784, country: 'Turkey' },
  { name: 'Jerusalem', latitude: 31.7683, longitude: 35.2137, country: 'Israel' },
  { name: 'Johannesburg', latitude: -26.2041, longitude: 28.0473, country: 'South Africa' },

  // Canada
  { name: 'Toronto', latitude: 43.6532, longitude: -79.3832, country: 'Ontario, Canada' },
  { name: 'Vancouver', latitude: 49.2827, longitude: -123.1207, country: 'British Columbia, Canada' },
  { name: 'Montreal', latitude: 45.5017, longitude: -73.5673, country: 'Quebec, Canada' },
  { name: 'Calgary', latitude: 51.0447, longitude: -114.0719, country: 'Alberta, Canada' },
  { name: 'Ottawa', latitude: 45.4215, longitude: -75.6972, country: 'Ontario, Canada' },
  { name: 'Quebec City', latitude: 46.8139, longitude: -71.208, country: 'Quebec, Canada' },
]

function searchCities(query: string): City[] {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return []
  }

  // Filter cities that match the query
  const matches = POPULAR_CITIES.filter(city => {
    const cityNameLower = city.name.toLowerCase()
    const countryLower = city.country.toLowerCase()

    return (
      cityNameLower.includes(normalizedQuery) ||
      countryLower.includes(normalizedQuery) ||
      `${cityNameLower}, ${countryLower}`.includes(normalizedQuery)
    )
  })

  // Sort by relevance (exact match first, then starts with, then includes)
  matches.sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()

    // Exact match gets highest priority
    if (aName === normalizedQuery) return -1
    if (bName === normalizedQuery) return 1

    // Starts with gets second priority
    const aStartsWith = aName.startsWith(normalizedQuery)
    const bStartsWith = bName.startsWith(normalizedQuery)
    if (aStartsWith && !bStartsWith) return -1
    if (!aStartsWith && bStartsWith) return 1

    // Otherwise sort alphabetically
    return aName.localeCompare(bName)
  })

  // Return top 10 results
  return matches.slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query

  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([])
  }

  const cities = searchCities(q)
  return res.json(cities)
}

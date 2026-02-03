import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''
  const VIATOR_BASE_URL = process.env.VIATOR_API_BASE_URL || 'https://api.viator.com/partner'
  const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ''

  const status: any = {
    viatorApiConfigured: !!VIATOR_API_KEY,
    viatorApiKeyLength: VIATOR_API_KEY.length,
    viatorApiKeyPrefix: VIATOR_API_KEY ? VIATOR_API_KEY.substring(0, 8) + '...' : 'not set',
    viatorBaseUrl: VIATOR_BASE_URL,
    mapboxConfigured: !!MAPBOX_ACCESS_TOKEN,
    timestamp: new Date().toISOString(),
  }

  if (VIATOR_API_KEY) {
    try {
      const destUrl = `${VIATOR_BASE_URL}/destinations`
      status.destinationsUrl = destUrl

      const destResponse = await fetch(destUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'exp-api-key': VIATOR_API_KEY,
        },
      })

      status.destinationsStatus = destResponse.status
      status.destinationsOk = destResponse.ok

      if (destResponse.ok) {
        const destData = await destResponse.json()
        const destinations = destData.destinations || []
        status.totalDestinations = destinations.length

        // Find Austin
        const austinMatches = destinations.filter((d: any) => {
          const name = (d.destinationName || d.name || '').toLowerCase()
          return name === 'austin'
        })
        if (austinMatches.length > 0) {
          status.austinId = austinMatches[0].destinationId || austinMatches[0].id
        }
      }

      // Fetch available tags from Viator
      const tagsResponse = await fetch(`${VIATOR_BASE_URL}/products/tags`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'exp-api-key': VIATOR_API_KEY,
        },
      })

      status.tagsStatus = tagsResponse.status
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json()
        const tags = tagsData.tags || []
        status.totalTags = tags.length

        // Show tags that match our filter categories
        const relevantKeywords = ['tour', 'food', 'outdoor', 'culture', 'adventure', 'water', 'night', 'drink', 'sightseeing']
        status.relevantTags = tags
          .filter((t: any) => {
            const name = (t.tagName || t.name || '').toLowerCase()
            return relevantKeywords.some(kw => name.includes(kw))
          })
          .slice(0, 20)
          .map((t: any) => ({
            id: t.tagId || t.id,
            name: t.tagName || t.name,
          }))

        // Show first 10 tags as sample
        status.sampleTags = tags.slice(0, 10).map((t: any) => ({
          id: t.tagId || t.id,
          name: t.tagName || t.name,
        }))
      } else {
        const tagsError = await tagsResponse.json().catch(() => ({}))
        status.tagsError = tagsError
      }
    } catch (error) {
      status.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  res.json(status)
}

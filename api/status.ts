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

        // Show raw structure of first destination
        if (destinations[0]) {
          status.sampleDestinationRaw = destinations[0]
        }

        // Find all Austins to see what's available
        const austinMatches = destinations.filter((d: any) => {
          const name = (d.destinationName || d.name || '').toLowerCase()
          return name.includes('austin')
        })
        status.austinMatches = austinMatches.slice(0, 5).map((d: any) => ({
          id: d.destinationId || d.id,
          name: d.destinationName || d.name,
          type: d.destinationType || d.type,
          parentId: d.parentId,
          lookupId: d.lookupId,
        }))

        // Find Las Vegas matches
        const vegasMatches = destinations.filter((d: any) => {
          const name = (d.destinationName || d.name || '').toLowerCase()
          return name.includes('vegas')
        })
        status.vegasMatches = vegasMatches.slice(0, 3).map((d: any) => ({
          id: d.destinationId || d.id,
          name: d.destinationName || d.name,
        }))

        // If we found Austin, test product search
        if (austinMatches.length > 0) {
          const austin = austinMatches[0]
          const austinId = (austin.destinationId || austin.id)?.toString()

          const searchPayload = {
            filtering: {
              destination: austinId,
            },
            sorting: {
              sort: 'TRAVELER_RATING',
              order: 'DESCENDING',
            },
            pagination: {
              start: 1,
              count: 3,
            },
            currency: 'USD',
          }

          const searchResponse = await fetch(`${VIATOR_BASE_URL}/products/search`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json;version=2.0',
              'Content-Type': 'application/json',
              'Accept-Language': 'en-US',
              'exp-api-key': VIATOR_API_KEY,
            },
            body: JSON.stringify(searchPayload),
          })

          const searchData = await searchResponse.json()
          status.searchWithAustinId = {
            usedId: austinId,
            status: searchResponse.status,
            ok: searchResponse.ok,
            productsFound: searchData.products?.length || 0,
            totalCount: searchData.totalCount || 0,
            firstProductTitle: searchData.products?.[0]?.title?.substring(0, 50),
          }
        }
      } else {
        const errorData = await destResponse.json().catch(() => ({}))
        status.destinationsError = errorData
      }
    } catch (error) {
      status.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  res.json(status)
}

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
    // Step 1: Test the /destinations endpoint
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

        // Find Austin to get its correct ID
        const austin = destinations.find((d: any) =>
          (d.destinationName || '').toLowerCase() === 'austin'
        )

        if (austin) {
          status.austinDestination = {
            id: austin.destinationId,
            name: austin.destinationName,
          }

          // Step 2: Test products search with Austin's real ID
          const searchPayload = {
            filtering: {
              destination: austin.destinationId.toString(),
            },
            sorting: {
              sort: 'TRAVELER_RATING',
              order: 'DESCENDING',
            },
            pagination: {
              start: 1,
              count: 5,
            },
            currency: 'USD',
          }

          const searchUrl = `${VIATOR_BASE_URL}/products/search`
          const searchResponse = await fetch(searchUrl, {
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

          status.searchStatus = searchResponse.status
          status.searchOk = searchResponse.ok
          status.productsFound = searchData.products?.length || 0
          status.totalCount = searchData.totalCount || 0

          if (!searchResponse.ok) {
            status.searchError = searchData
          } else if (searchData.products?.[0]) {
            const p = searchData.products[0]
            status.sampleProduct = {
              code: p.productCode,
              title: p.title?.substring(0, 60),
              hasProductUrl: !!p.productUrl,
            }
          }
        } else {
          // Show some sample destinations
          status.sampleDestinations = destinations.slice(0, 5).map((d: any) => ({
            id: d.destinationId,
            name: d.destinationName,
          }))
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

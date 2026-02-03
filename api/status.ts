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
    // Test products search with Austin destination ID (684)
    try {
      const searchPayload = {
        filtering: {
          destination: '684', // Austin, TX
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
      status.searchUrl = searchUrl
      status.searchPayload = searchPayload

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json;version=2.0',
          'Content-Type': 'application/json',
          'exp-api-key': VIATOR_API_KEY,
          'Accept-Language': 'en-US',
        },
        body: JSON.stringify(searchPayload),
      })

      const data = await response.json()

      status.searchStatus = response.status
      status.searchOk = response.ok
      status.productsFound = data.products?.length || 0
      status.totalCount = data.totalCount || 0

      if (!response.ok) {
        status.searchError = data
      } else if (data.products?.[0]) {
        const p = data.products[0]
        status.sampleProduct = {
          code: p.productCode,
          title: p.title?.substring(0, 60),
          hasProductUrl: !!p.productUrl,
          productUrl: p.productUrl || 'not provided by API',
        }
      }
    } catch (error) {
      status.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  res.json(status)
}

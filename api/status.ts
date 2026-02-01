import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''

  const status: any = {
    viatorApiConfigured: !!VIATOR_API_KEY,
    viatorApiKeyLength: VIATOR_API_KEY.length,
    viatorApiKeyPrefix: VIATOR_API_KEY ? VIATOR_API_KEY.substring(0, 8) + '...' : 'not set',
    timestamp: new Date().toISOString(),
  }

  // Try a product search to verify the key works (using Austin bounding box)
  if (VIATOR_API_KEY) {
    try {
      const searchPayload = {
        filtering: {
          // Austin, TX bounding box
          boundingBox: {
            topLeftLatitude: 30.5167,
            topLeftLongitude: -97.9383,
            bottomRightLatitude: 30.0986,
            bottomRightLongitude: -97.5614,
          },
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

      const response = await fetch('https://api.viator.com/partner/products/search', {
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

      status.apiTestStatus = response.status
      status.apiTestOk = response.ok
      status.productsFound = data.products?.length || 0
      status.totalCount = data.totalCount || 0

      if (!response.ok) {
        status.apiTestError = data
      } else if (data.products?.[0]) {
        // Show sample product info
        const p = data.products[0]
        status.sampleProduct = {
          code: p.productCode,
          title: p.title?.substring(0, 50),
          hasProductUrl: !!p.productUrl,
          productUrl: p.productUrl || 'not provided',
        }
      }
    } catch (error) {
      status.apiTestStatus = 'error'
      status.apiTestError = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  res.json(status)
}

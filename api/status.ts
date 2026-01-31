import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''

  const status = {
    viatorApiConfigured: !!VIATOR_API_KEY,
    viatorApiKeyLength: VIATOR_API_KEY.length,
    viatorApiKeyPrefix: VIATOR_API_KEY ? VIATOR_API_KEY.substring(0, 8) + '...' : 'not set',
    timestamp: new Date().toISOString(),
  }

  // Try a simple API call to verify the key works
  if (VIATOR_API_KEY) {
    try {
      const response = await fetch('https://api.viator.com/partner/destinations/search', {
        method: 'POST',
        headers: {
          'Accept': 'application/json;version=2.0',
          'Content-Type': 'application/json',
          'exp-api-key': VIATOR_API_KEY,
        },
        body: JSON.stringify({
          searchTerm: 'Austin',
          searchTypes: ['CITY'],
        }),
      })

      const data = await response.json()

      Object.assign(status, {
        apiTestStatus: response.status,
        apiTestOk: response.ok,
        apiTestDestinationsFound: data.destinations?.length || 0,
        apiTestError: response.ok ? null : data,
      })
    } catch (error) {
      Object.assign(status, {
        apiTestStatus: 'error',
        apiTestError: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  res.json(status)
}

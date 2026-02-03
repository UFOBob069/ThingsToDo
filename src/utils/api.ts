import { ActivityCard, City, ApiResponse } from '../types'

const API_BASE = '/api'

export async function searchActivities(city: City, activityType?: string): Promise<ApiResponse<ActivityCard[]>> {
  try {
    const params = new URLSearchParams({
      latitude: city.latitude.toString(),
      longitude: city.longitude.toString(),
      city: city.name,
    })

    // Pass Viator destination ID if available (this is the key for accurate results!)
    if (city.destinationId) {
      params.set('destinationId', city.destinationId.toString())
    }

    // Pass activity type filter if specified
    if (activityType && activityType !== 'all') {
      params.set('activityType', activityType)
    }

    const response = await fetch(`${API_BASE}/activities?${params}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching activities:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activities',
    }
  }
}

export async function getActivityDetails(activityId: string): Promise<ApiResponse<ActivityCard>> {
  try {
    const response = await fetch(`${API_BASE}/activities/${activityId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching activity details:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity details',
    }
  }
}

export async function searchCities(query: string): Promise<ApiResponse<City[]>> {
  try {
    const response = await fetch(`${API_BASE}/cities?q=${encodeURIComponent(query)}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error searching cities:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search cities',
    }
  }
}

export function getShareUrl(activityId: string): string {
  return `${window.location.origin}/activity/${activityId}`
}

export async function shareActivity(activity: ActivityCard): Promise<boolean> {
  const shareUrl = getShareUrl(activity.id)
  const shareData = {
    title: activity.name,
    text: activity.shortDescription,
    url: shareUrl,
  }

  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData)
      return true
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error)
      }
      return false
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl)
    return true
  } catch {
    return false
  }
}

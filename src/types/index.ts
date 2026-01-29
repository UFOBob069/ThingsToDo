export interface ActivityCard {
  id: string
  name: string
  shortDescription: string
  fullDescription?: string
  heroImageUrl: string
  city: string
  latitude: number
  longitude: number
  rating?: number
  reviewCount?: number
  priceText?: string
  bookingUrl: string
  source: 'viator'
}

export interface City {
  name: string
  latitude: number
  longitude: number
  country?: string
}

export interface SwipeDirection {
  direction: 'left' | 'right'
  activity: ActivityCard
}

export interface SavedActivity extends ActivityCard {
  savedAt: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

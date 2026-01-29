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

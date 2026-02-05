import { useState, useCallback } from 'react'
import CitySearch from '../components/CitySearch'
import { City } from '../types'

interface HomePageProps {
  onCitySelect: (city: City) => void
}

// Popular destinations with Viator IDs
const POPULAR_DESTINATIONS: City[] = [
  { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France', destinationId: 479 },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, country: 'Japan', destinationId: 334 },
  { name: 'New York', latitude: 40.7128, longitude: -74.006, country: 'USA', destinationId: 687 },
  { name: 'Bali', latitude: -8.4095, longitude: 115.1889, country: 'Indonesia', destinationId: 614 },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, country: 'UK', destinationId: 737 },
  { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, country: 'Spain', destinationId: 562 },
]

const FEATURES = [
  { icon: '👆', title: 'Swipe to Discover', desc: 'Like dating apps, but for adventures' },
  { icon: '❤️', title: 'Save Favorites', desc: 'Build your perfect trip itinerary' },
  { icon: '🎫', title: 'Book Instantly', desc: 'One tap to book any experience' },
]

function HomePage({ onCitySelect }: HomePageProps) {
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const response = await fetch(
            `/api/reverse-geocode?lat=${latitude}&lng=${longitude}`
          )
          if (response.ok) {
            const city = await response.json()
            onCitySelect(city)
          } else {
            onCitySelect({
              name: 'Current Location',
              latitude,
              longitude,
            })
          }
        } catch {
          onCitySelect({
            name: 'Current Location',
            latitude,
            longitude,
          })
        }
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out')
            break
          default:
            setLocationError('Unable to get location')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }, [onCitySelect])

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Hero Section with animated gradient background */}
      <div className="relative flex-1 flex flex-col">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-primary-500 to-pink-500 animate-gradient" />

        {/* Floating shapes for visual interest */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl animate-float" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col safe-area-inset-top">
          {/* Header */}
          <header className="pt-6 pb-4 px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">
              <span className="inline-block animate-bounce-subtle">✈️</span>
              {' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-100">
                Fun Travel Swipe
              </span>
            </h1>
            <p className="mt-2 text-white/90 text-lg font-medium">
              Discover amazing experiences worldwide
            </p>
          </header>

          {/* Main search card */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-md">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 transform hover:scale-[1.01] transition-transform">
                <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">
                  Where to next?
                </h2>
                <p className="text-gray-500 text-sm mb-5 text-center">
                  Search 4,000+ destinations worldwide
                </p>

                <CitySearch onSelect={onCitySelect} />

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">or</span>
                  </div>
                </div>

                <button
                  onClick={handleUseLocation}
                  disabled={isLocating}
                  className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium
                           flex items-center justify-center gap-2 hover:border-primary-300 hover:bg-primary-50
                           transition-all active:scale-[0.98]"
                >
                  {isLocating ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Finding your location...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Use my current location</span>
                    </>
                  )}
                </button>

                {locationError && (
                  <p className="mt-3 text-sm text-red-500 text-center">{locationError}</p>
                )}
              </div>

              {/* Popular destinations */}
              <div className="mt-6">
                <p className="text-white/80 text-sm font-medium text-center mb-3">
                  Popular destinations
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <button
                      key={dest.name}
                      onClick={() => onCitySelect(dest)}
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium
                               hover:bg-white/30 active:scale-95 transition-all border border-white/20"
                    >
                      {dest.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Features section */}
          <div className="px-4 pb-6">
            <div className="max-w-md mx-auto">
              <div className="grid grid-cols-3 gap-3">
                {FEATURES.map((feature) => (
                  <div
                    key={feature.title}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10"
                  >
                    <div className="text-2xl mb-1">{feature.icon}</div>
                    <div className="text-white text-xs font-semibold leading-tight">{feature.title}</div>
                    <div className="text-white/70 text-[10px] mt-0.5 leading-tight">{feature.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-center py-3 text-gray-400 text-xs safe-area-inset-bottom">
        Powered by Viator • Thousands of bookable experiences
      </footer>
    </div>
  )
}

export default HomePage

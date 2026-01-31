import { useState, useCallback } from 'react'
import CitySearch from '../components/CitySearch'
import { City } from '../types'

interface HomePageProps {
  onCitySelect: (city: City) => void
}

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-500 to-primary-600 safe-area-inset-top safe-area-inset-bottom">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            FunTravelSwipe
          </h1>
          <p className="text-primary-100 text-lg">
            Swipe through fun things to do in any city
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Where are you?
            </h2>

            <CitySearch onSelect={onCitySelect} />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              {isLocating ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Finding your location...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Use my location</span>
                </>
              )}
            </button>

            {locationError && (
              <p className="mt-3 text-sm text-red-500 text-center">
                {locationError}
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-primary-200 text-sm">
        Powered by Viator
      </footer>
    </div>
  )
}

export default HomePage

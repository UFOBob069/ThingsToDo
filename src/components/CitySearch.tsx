import { useState, useCallback, useRef, useEffect } from 'react'
import { City } from '../types'
import { searchCities } from '../utils/api'

interface CitySearchProps {
  onSelect: (city: City) => void
}

function CitySearch({ onSelect }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsLoading(true)

    try {
      const response = await searchCities(searchQuery, abortControllerRef.current.signal)

      // Only update state if request wasn't aborted
      if (response.success && response.data) {
        setResults(response.data)
        setIsOpen(true)
      } else if (response.error !== 'Request aborted') {
        // Only clear results on non-abort errors
        setResults([])
      }
    } catch {
      // Ignore errors from aborted requests
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.length < 2) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    debounceRef.current = window.setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  const handleSelect = useCallback((city: City) => {
    setQuery(city.name)
    setIsOpen(false)
    onSelect(city)
  }, [onSelect])

  const handleFocus = useCallback(() => {
    if (results.length > 0) {
      setIsOpen(true)
    }
  }, [results.length])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search for a city..."
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     text-gray-900 placeholder-gray-400"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isLoading && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin"
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
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
          {results.map((city, index) => (
            <li key={`${city.name}-${city.latitude}-${index}`}>
              <button
                onClick={() => handleSelect(city)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100
                           flex items-center gap-3 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
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
                <div>
                  <span className="text-gray-900 font-medium">{city.name}</span>
                  {city.country && (
                    <span className="text-gray-500 ml-1">, {city.country}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-500">
          No cities found
        </div>
      )}
    </div>
  )
}

export default CitySearch

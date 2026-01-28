import { City } from '../types'

interface HeaderProps {
  city: City
  savedCount: number
  onChangeCity: () => void
  onViewSaved: () => void
}

function Header({ city, savedCount, onChangeCity, onViewSaved }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 safe-area-inset-top">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onChangeCity}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium truncate max-w-[150px]">{city.name}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <h1 className="text-lg font-bold text-primary-500">DoStuff</h1>

        <button
          onClick={onViewSaved}
          className="relative flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {savedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {savedCount > 99 ? '99+' : savedCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

export default Header

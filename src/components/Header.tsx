import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { City } from '../types'
import AuthModal from './AuthModal'

interface HeaderProps {
  city: City
  savedCount: number
  onChangeCity: () => void
  onViewSaved: () => void
}

function Header({ city, savedCount, onChangeCity, onViewSaved }: HeaderProps) {
  const { user, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
  }

  return (
    <>
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
            <span className="font-medium truncate max-w-[120px]">{city.name}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <h1 className="text-lg font-bold text-primary-500">FunTravelSwipe</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewSaved}
              className="relative flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors p-1"
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

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-primary-500 text-white font-medium flex items-center justify-center text-sm overflow-hidden"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.email?.charAt(0).toUpperCase()
                  )}
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}

export default Header

import { useEffect, useState } from 'react'
import { ActivityCard } from '../types'
import { shareActivity } from '../utils/api'
import { useSavedActivities } from '../hooks/useSavedActivities'

interface ActivityDetailsModalProps {
  activity: ActivityCard
  onClose: () => void
}

function ActivityDetailsModal({ activity, onClose }: ActivityDetailsModalProps) {
  const [showCopied, setShowCopied] = useState(false)
  const { saveActivity, removeActivity, isActivitySaved } = useSavedActivities()
  const isSaved = isActivitySaved(activity.id)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleShare = async () => {
    const success = await shareActivity(activity)
    if (success && !navigator.share) {
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const handleToggleSave = () => {
    if (isSaved) {
      removeActivity(activity.id)
    } else {
      saveActivity(activity)
    }
  }

  const handleBook = () => {
    window.open(activity.bookingUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl animate-slide-up overflow-hidden safe-area-inset-bottom">
        <div className="sticky top-0 bg-white z-10">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-60px)] overscroll-contain">
          <div className="relative h-64 bg-gray-200">
            <img
              src={activity.heroImageUrl}
              alt={activity.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {activity.name}
              </h2>
              {activity.priceText && (
                <span className="flex-shrink-0 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {activity.priceText}
                </span>
              )}
            </div>

            {(activity.rating !== undefined || activity.city) && (
              <div className="flex items-center gap-4 mb-4 text-sm">
                {activity.rating !== undefined && (
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium text-gray-900">{activity.rating.toFixed(1)}</span>
                    {activity.reviewCount !== undefined && (
                      <span className="text-gray-500">({activity.reviewCount} reviews)</span>
                    )}
                  </div>
                )}
                {activity.city && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{activity.city}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">
                About
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {activity.fullDescription || activity.shortDescription}
              </p>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={handleShare}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {showCopied ? 'Link Copied!' : 'Share'}
              </button>

              <button
                onClick={handleToggleSave}
                className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-full transition-colors duration-150 ${
                  isSaved
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'btn-secondary'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            <button
              onClick={handleBook}
              className="w-full btn-primary text-lg"
            >
              Book This Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityDetailsModal

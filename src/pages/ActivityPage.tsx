import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ActivityCard } from '../types'
import { getActivityDetails, shareActivity } from '../utils/api'
import { useSavedActivities } from '../hooks/useSavedActivities'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'

function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activity, setActivity] = useState<ActivityCard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCopied, setShowCopied] = useState(false)
  const { saveActivity, removeActivity, isActivitySaved } = useSavedActivities()

  const isSaved = activity ? isActivitySaved(activity.id) : false

  useEffect(() => {
    async function loadActivity() {
      if (!id) {
        setError('Activity not found')
        setIsLoading(false)
        return
      }

      const response = await getActivityDetails(id)

      if (response.success && response.data) {
        setActivity(response.data)
      } else {
        setError(response.error || 'Failed to load activity')
      }

      setIsLoading(false)
    }

    loadActivity()
  }, [id])

  const handleBack = () => {
    navigate('/')
  }

  const handleShare = async () => {
    if (!activity) return
    const success = await shareActivity(activity)
    if (success && !navigator.share) {
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const handleToggleSave = () => {
    if (!activity) return
    if (isSaved) {
      removeActivity(activity.id)
    } else {
      saveActivity(activity)
    }
  }

  const handleBook = () => {
    if (!activity) return
    window.open(activity.bookingUrl, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <LoadingState message="Loading activity..." />
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen flex flex-col">
        <EmptyState
          title="Activity not found"
          message={error || 'This activity may no longer be available.'}
          actionLabel="Explore Activities"
          onAction={handleBack}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="absolute top-0 left-0 right-0 z-10 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 shadow-md hover:bg-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handleShare}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 shadow-md hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="h-72 bg-gray-200 relative">
        <img
          src={activity.heroImageUrl}
          alt={activity.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="px-5 py-6 -mt-8 relative bg-white rounded-t-3xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {activity.name}
          </h1>
          {activity.priceText && (
            <span className="flex-shrink-0 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
              {activity.priceText}
            </span>
          )}
        </div>

        {(activity.rating !== undefined || activity.city) && (
          <div className="flex items-center gap-4 mb-6 text-sm">
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

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
            About this activity
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {activity.fullDescription || activity.shortDescription}
          </p>
        </div>

        {showCopied && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-fade-in">
            Link copied to clipboard!
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom">
        <div className="flex gap-3">
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

          <button
            onClick={handleBook}
            className="flex-1 btn-primary"
          >
            Book Activity
          </button>
        </div>
      </div>

      <div className="h-24" />
    </div>
  )
}

export default ActivityPage

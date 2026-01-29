import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { City, ActivityCard } from '../types'
import { searchActivities } from '../utils/api'
import { useSavedActivities } from '../hooks/useSavedActivities'
import { useActivityHistory } from '../hooks/useActivityHistory'
import SwipeCard from '../components/SwipeCard'
import ActivityDetailsModal from '../components/ActivityDetailsModal'
import Header from '../components/Header'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'

interface SwipePageProps {
  city: City
  onChangeCity: () => void
}

function SwipePage({ city, onChangeCity }: SwipePageProps) {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityCard | null>(null)
  const { saveActivity, count: savedCount } = useSavedActivities()
  const { addToHistory } = useActivityHistory()

  const loadActivities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const response = await searchActivities(city)

    if (response.success && response.data) {
      setActivities(response.data)
      setCurrentIndex(0)
    } else {
      setError(response.error || 'Failed to load activities')
    }

    setIsLoading(false)
  }, [city])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const handleSwipeLeft = useCallback(() => {
    const currentActivity = activities[currentIndex]
    if (currentActivity) {
      addToHistory(currentActivity, 'dismissed')
    }
    setCurrentIndex(prev => prev + 1)
  }, [activities, currentIndex, addToHistory])

  const handleSwipeRight = useCallback(() => {
    const currentActivity = activities[currentIndex]
    if (currentActivity) {
      saveActivity(currentActivity)
      addToHistory(currentActivity, 'saved')
    }
    setCurrentIndex(prev => prev + 1)
  }, [activities, currentIndex, saveActivity, addToHistory])

  const handleViewDetails = useCallback((activity: ActivityCard) => {
    setSelectedActivity(activity)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedActivity(null)
  }, [])

  const currentActivity = activities[currentIndex]
  const nextActivity = activities[currentIndex + 1]
  const hasMoreCards = currentIndex < activities.length

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          city={city}
          savedCount={savedCount}
          onChangeCity={onChangeCity}
          onViewSaved={() => navigate('/saved')}
        />
        <LoadingState message={`Finding things to do in ${city.name}...`} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          city={city}
          savedCount={savedCount}
          onChangeCity={onChangeCity}
          onViewSaved={() => navigate('/saved')}
        />
        <EmptyState
          title="Oops!"
          message={error}
          actionLabel="Try Again"
          onAction={loadActivities}
        />
      </div>
    )
  }

  if (!hasMoreCards) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          city={city}
          savedCount={savedCount}
          onChangeCity={onChangeCity}
          onViewSaved={() => navigate('/saved')}
        />
        <EmptyState
          title="That's all!"
          message={`You've seen all ${activities.length} activities in ${city.name}`}
          actionLabel={savedCount > 0 ? 'View Saved' : 'Try Another City'}
          onAction={savedCount > 0 ? () => navigate('/saved') : onChangeCity}
          secondaryLabel={savedCount > 0 ? 'Change City' : undefined}
          onSecondaryAction={savedCount > 0 ? onChangeCity : undefined}
        />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-100">
      <Header
        city={city}
        savedCount={savedCount}
        onChangeCity={onChangeCity}
        onViewSaved={() => navigate('/saved')}
      />

      <main className="flex-1 relative overflow-hidden min-h-0">
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div className="relative w-full max-w-md h-full">
            {nextActivity && (
              <div className="absolute inset-0 transform scale-[0.97] opacity-70">
                <SwipeCard
                  activity={nextActivity}
                  isBackground
                />
              </div>
            )}

            <SwipeCard
              key={currentActivity.id}
              activity={currentActivity}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onViewDetails={() => handleViewDetails(currentActivity)}
            />
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex justify-center items-center gap-5 py-3 px-4">
          <button
            onClick={handleSwipeLeft}
            className="btn-icon bg-white border-2 border-red-200 text-red-500 shadow-md hover:bg-red-50 active:scale-95"
            aria-label="Dismiss"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={() => handleViewDetails(currentActivity)}
            className="btn-icon bg-white border-2 border-blue-200 text-blue-500 shadow-md hover:bg-blue-50 active:scale-95 w-12 h-12"
            aria-label="View details"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={handleSwipeRight}
            className="btn-icon bg-white border-2 border-green-200 text-green-500 shadow-md hover:bg-green-50 active:scale-95"
            aria-label="Save"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>

        <div className="text-center pb-2 text-xs text-gray-400">
          {currentIndex + 1} / {activities.length}
        </div>
      </footer>

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  )
}

export default SwipePage

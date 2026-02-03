import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { City, ActivityCard } from '../types'
import { searchActivities } from '../utils/api'
import { useSavedActivities } from '../hooks/useSavedActivities'
import { useSwipeHistory } from '../hooks/useSwipeHistory'
import SwipeCard from '../components/SwipeCard'
import ActivityDetailsModal from '../components/ActivityDetailsModal'
import Header from '../components/Header'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import Confetti from '../components/Confetti'

interface SwipePageProps {
  city: City
  onChangeCity: () => void
}

interface SessionHistoryItem {
  activity: ActivityCard
  action: 'left' | 'right'
}

// Activity type filters - matches Viator's actual categories
const ACTIVITY_TYPES = [
  { id: 'all', label: 'All', icon: '🎯' },
  { id: 'tours', label: 'Tours', icon: '🚶' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'outdoor', label: 'Outdoor', icon: '🏔️' },
  { id: 'culture', label: 'Culture', icon: '🎭' },
  { id: 'tickets', label: 'Tickets', icon: '🎟️' },
  { id: 'classes', label: 'Classes', icon: '🎨' },
  { id: 'unique', label: 'Unique', icon: '✨' },
]

function SwipePage({ city, onChangeCity }: SwipePageProps) {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityCard | null>(null)
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [showMilestone, setShowMilestone] = useState(false)
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null)
  const [sessionSaves, setSessionSaves] = useState(0)
  const [activityType, setActivityType] = useState('all')
  const { saveActivity, removeActivity, count: savedCount } = useSavedActivities()
  const { addToHistory, removeLastFromHistory } = useSwipeHistory()

  const loadActivities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const response = await searchActivities(city, activityType)

    if (response.success && response.data) {
      setActivities(response.data)
      setCurrentIndex(0)
      setSessionHistory([])
      setSessionSaves(0)
    } else {
      setError(response.error || 'Failed to load activities')
    }

    setIsLoading(false)
  }, [city, activityType])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const handleTypeChange = useCallback((type: string) => {
    if (type !== activityType) {
      setActivityType(type)
    }
  }, [activityType])

  // Check for milestone achievements based on total saved count
  useEffect(() => {
    const milestones: Record<number, string> = {
      1: '🎉 First Save!',
      5: '⭐ Getting Started!',
      10: '🔥 Adventure Seeker!',
      25: '🌟 Explorer!',
      50: '👑 Travel Pro!',
    }
    const message = milestones[savedCount]
    if (message) {
      setMilestoneMessage(message)
      setShowMilestone(true)
      setTimeout(() => setShowMilestone(false), 2500)
    }
  }, [savedCount])

  const handleSwipeLeft = useCallback(() => {
    const currentActivity = activities[currentIndex]
    if (currentActivity) {
      setSessionHistory(prev => [...prev, { activity: currentActivity, action: 'left' }])
      addToHistory(currentActivity, 'left', city.name)
    }
    setCurrentIndex(prev => prev + 1)
  }, [activities, currentIndex, addToHistory, city.name])

  const handleSwipeRight = useCallback(() => {
    const currentActivity = activities[currentIndex]
    if (currentActivity) {
      saveActivity(currentActivity)
      setSessionHistory(prev => [...prev, { activity: currentActivity, action: 'right' }])
      addToHistory(currentActivity, 'right', city.name)
      setSessionSaves(prev => prev + 1)

      // Show confetti on first save of session or every 5th save
      if (sessionSaves === 0 || (sessionSaves + 1) % 5 === 0) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      }
    }
    setCurrentIndex(prev => prev + 1)
  }, [activities, currentIndex, saveActivity, sessionSaves, addToHistory, city.name])

  const handleUndo = useCallback(() => {
    if (sessionHistory.length === 0 || currentIndex === 0) return

    const lastItem = sessionHistory[sessionHistory.length - 1]

    // If last action was a save, remove it from saved
    if (lastItem.action === 'right') {
      removeActivity(lastItem.activity.id)
      setSessionSaves(prev => Math.max(0, prev - 1))
    }

    setSessionHistory(prev => prev.slice(0, -1))
    removeLastFromHistory()
    setCurrentIndex(prev => prev - 1)
  }, [sessionHistory, currentIndex, removeActivity, removeLastFromHistory])

  const handleViewDetails = useCallback((activity: ActivityCard) => {
    setSelectedActivity(activity)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedActivity(null)
  }, [])

  const currentActivity = activities[currentIndex]
  const nextActivity = activities[currentIndex + 1]
  const hasMoreCards = currentIndex < activities.length
  const canUndo = sessionHistory.length > 0 && currentIndex > 0

  // Filter bar component to avoid duplication
  const filterBar = (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-2 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
        {ACTIVITY_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => handleTypeChange(type.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${activityType === type.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          city={city}
          savedCount={savedCount}
          onChangeCity={onChangeCity}
          onViewSaved={() => navigate('/saved')}
        />
        {filterBar}
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
        {filterBar}
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
    const noResultsForFilter = activities.length === 0 && activityType !== 'all'
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          city={city}
          savedCount={savedCount}
          onChangeCity={onChangeCity}
          onViewSaved={() => navigate('/saved')}
        />
        {filterBar}
        <EmptyState
          title={noResultsForFilter ? 'No results' : "That's all!"}
          message={noResultsForFilter
            ? `No ${activityType} activities found in ${city.name}. Try a different filter!`
            : `You've seen all ${activities.length} activities in ${city.name}`}
          actionLabel={noResultsForFilter ? 'Show All' : (savedCount > 0 ? 'View Saved' : 'Try Another City')}
          onAction={noResultsForFilter ? () => setActivityType('all') : (savedCount > 0 ? () => navigate('/saved') : onChangeCity)}
          secondaryLabel={noResultsForFilter ? 'Change City' : (savedCount > 0 ? 'Change City' : undefined)}
          onSecondaryAction={noResultsForFilter ? onChangeCity : (savedCount > 0 ? onChangeCity : undefined)}
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

      {/* Activity type filter bar */}
      {filterBar}

      {/* Milestone popup */}
      {showMilestone && milestoneMessage && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 animate-achievement">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl shadow-2xl">
            <div className="text-2xl font-bold text-center">{milestoneMessage}</div>
            <div className="text-sm text-center opacity-90">{savedCount} activities saved!</div>
          </div>
        </div>
      )}

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
              cardIndex={currentIndex}
            />
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex justify-center items-center gap-3 py-3 px-4">
          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`btn-icon w-10 h-10 bg-white border-2 shadow-md transition-all
                      ${canUndo
                        ? 'border-gray-300 text-gray-600 hover:bg-gray-50 active:scale-95'
                        : 'border-gray-100 text-gray-300 cursor-not-allowed'}`}
            aria-label="Undo last swipe"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleSwipeLeft}
            className="btn-icon bg-white border-2 border-red-200 text-red-500 shadow-md hover:bg-red-50 active:scale-95"
            aria-label="Dismiss"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Info button */}
          <button
            onClick={() => handleViewDetails(currentActivity)}
            className="btn-icon bg-white border-2 border-blue-200 text-blue-500 shadow-md hover:bg-blue-50 active:scale-95 w-12 h-12"
            aria-label="View details"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Save button */}
          <button
            onClick={handleSwipeRight}
            className="btn-icon bg-white border-2 border-green-200 text-green-500 shadow-md hover:bg-green-50 active:scale-95"
            aria-label="Save"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          {/* History button */}
          <button
            onClick={() => navigate('/history')}
            className="btn-icon w-10 h-10 bg-white border-2 border-gray-300 text-gray-600 shadow-md hover:bg-gray-50 active:scale-95"
            aria-label="View history"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

      {showConfetti && <Confetti />}
    </div>
  )
}

export default SwipePage

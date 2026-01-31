import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { City, ActivityCard } from '../types'
import { searchActivities } from '../utils/api'
import { useSavedActivities } from '../hooks/useSavedActivities'
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

interface SwipeHistoryItem {
  activity: ActivityCard
  action: 'left' | 'right'
}

function SwipePage({ city, onChangeCity }: SwipePageProps) {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityCard | null>(null)
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([])
  const [streak, setStreak] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showStreakPopup, setShowStreakPopup] = useState(false)
  const [lastAchievement, setLastAchievement] = useState<string | null>(null)
  const streakTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { saveActivity, removeActivity, count: savedCount } = useSavedActivities()

  const loadActivities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const response = await searchActivities(city)

    if (response.success && response.data) {
      setActivities(response.data)
      setCurrentIndex(0)
      setSwipeHistory([])
      setStreak(0)
    } else {
      setError(response.error || 'Failed to load activities')
    }

    setIsLoading(false)
  }, [city])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  // Check for streak achievements
  useEffect(() => {
    if (streak > 0 && streak % 5 === 0) {
      const achievements: Record<number, string> = {
        5: '🔥 On Fire!',
        10: '⚡ Super Saver!',
        15: '🌟 Activity Hunter!',
        20: '👑 Legend!',
        25: '🚀 Unstoppable!',
      }
      const achievement = achievements[streak]
      if (achievement) {
        setLastAchievement(achievement)
        setShowStreakPopup(true)
        setTimeout(() => setShowStreakPopup(false), 2000)
      }
    }
  }, [streak])

  const handleSwipeLeft = useCallback(() => {
    const currentActivity = activities[currentIndex]
    if (currentActivity) {
      setSwipeHistory(prev => [...prev, { activity: currentActivity, action: 'left' }])
    }
    setStreak(0) // Reset streak on skip
    setCurrentIndex(prev => prev + 1)
  }, [activities, currentIndex])

  const handleSwipeRight = useCallback(() => {
    const currentActivity = activities[currentIndex]
    if (currentActivity) {
      saveActivity(currentActivity)
      setSwipeHistory(prev => [...prev, { activity: currentActivity, action: 'right' }])

      // Increment streak
      const newStreak = streak + 1
      setStreak(newStreak)

      // Show confetti on every 3rd save or milestone
      if (newStreak % 3 === 0 || newStreak === 1) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      }

      // Reset streak timeout
      if (streakTimeoutRef.current) {
        clearTimeout(streakTimeoutRef.current)
      }
      streakTimeoutRef.current = setTimeout(() => {
        setStreak(0)
      }, 10000) // Reset streak if no save within 10 seconds
    }
    setCurrentIndex(prev => prev + 1)
  }, [activities, currentIndex, saveActivity, streak])

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0 || currentIndex === 0) return

    const lastItem = swipeHistory[swipeHistory.length - 1]

    // If last action was a save, remove it from saved
    if (lastItem.action === 'right') {
      removeActivity(lastItem.activity.id)
      setStreak(prev => Math.max(0, prev - 1))
    }

    setSwipeHistory(prev => prev.slice(0, -1))
    setCurrentIndex(prev => prev - 1)
  }, [swipeHistory, currentIndex, removeActivity])

  const handleViewDetails = useCallback((activity: ActivityCard) => {
    setSelectedActivity(activity)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedActivity(null)
  }, [])

  const currentActivity = activities[currentIndex]
  const nextActivity = activities[currentIndex + 1]
  const hasMoreCards = currentIndex < activities.length
  const canUndo = swipeHistory.length > 0 && currentIndex > 0

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

      {/* Undo button - top left */}
      {canUndo && (
        <button
          onClick={handleUndo}
          className="absolute top-20 left-4 z-30 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg
                     hover:bg-white active:scale-95 transition-all duration-200 animate-fade-in"
          aria-label="Undo last swipe"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      )}

      {/* Streak indicator */}
      {streak > 0 && (
        <div className="absolute top-20 right-4 z-30 animate-bounce-in">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <span className="text-lg">🔥</span>
            <span className="font-bold">{streak}</span>
          </div>
        </div>
      )}

      {/* Achievement popup */}
      {showStreakPopup && lastAchievement && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 animate-achievement">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl shadow-2xl">
            <div className="text-2xl font-bold text-center">{lastAchievement}</div>
            <div className="text-sm text-center opacity-90">{streak} saves in a row!</div>
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

      {showConfetti && <Confetti />}
    </div>
  )
}

export default SwipePage

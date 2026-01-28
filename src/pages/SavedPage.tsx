import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSavedActivities } from '../hooks/useSavedActivities'
import { ActivityCard } from '../types'
import ActivityDetailsModal from '../components/ActivityDetailsModal'
import EmptyState from '../components/EmptyState'

function SavedPage() {
  const navigate = useNavigate()
  const { savedActivities, removeActivity } = useSavedActivities()
  const [selectedActivity, setSelectedActivity] = useState<ActivityCard | null>(null)

  const handleBack = () => {
    navigate('/')
  }

  const handleOpenDetails = (activity: ActivityCard) => {
    setSelectedActivity(activity)
  }

  const handleCloseDetails = () => {
    setSelectedActivity(null)
  }

  const handleRemove = (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeActivity(activityId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <h1 className="text-lg font-bold text-gray-900">Saved Activities</h1>

          <div className="w-16" />
        </div>
      </header>

      {savedActivities.length === 0 ? (
        <EmptyState
          title="No saved activities"
          message="Swipe right on activities you like to save them here for later."
          actionLabel="Start Exploring"
          onAction={handleBack}
        />
      ) : (
        <main className="p-4">
          <p className="text-sm text-gray-500 mb-4">
            {savedActivities.length} saved {savedActivities.length === 1 ? 'activity' : 'activities'}
          </p>

          <div className="space-y-4">
            {savedActivities.map(activity => (
              <div
                key={activity.id}
                onClick={() => handleOpenDetails(activity)}
                className="bg-white rounded-xl shadow-sm overflow-hidden flex cursor-pointer
                           hover:shadow-md transition-shadow active:scale-[0.99] transform"
              >
                <div className="w-28 h-28 flex-shrink-0">
                  <img
                    src={activity.heroImageUrl}
                    alt={activity.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {activity.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {activity.shortDescription}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {activity.rating !== undefined && (
                        <div className="flex items-center gap-1 text-sm">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-medium">{activity.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {activity.priceText && (
                        <span className="text-sm text-gray-500">
                          {activity.priceText}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleRemove(activity.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove from saved"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  )
}

export default SavedPage

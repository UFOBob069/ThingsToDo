import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSwipeHistory, HistoryItem } from '../hooks/useSwipeHistory'
import { useSavedActivities } from '../hooks/useSavedActivities'
import ActivityDetailsModal from '../components/ActivityDetailsModal'
import { ActivityCard } from '../types'

function HistoryPage() {
  const navigate = useNavigate()
  const { history, clearHistory } = useSwipeHistory()
  const { saveActivity, isActivitySaved } = useSavedActivities()
  const [selectedActivity, setSelectedActivity] = useState<ActivityCard | null>(null)
  const [filter, setFilter] = useState<'all' | 'liked' | 'passed'>('all')

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true
    if (filter === 'liked') return item.action === 'right'
    if (filter === 'passed') return item.action === 'left'
    return true
  })

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleSaveFromHistory = (item: HistoryItem) => {
    if (!isActivitySaved(item.activity.id)) {
      saveActivity(item.activity)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">History</h1>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all history?')) {
                  clearHistory()
                }
              }}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Clear
            </button>
          )}
          {history.length === 0 && <div className="w-12" />}
        </div>

        {/* Filter tabs */}
        {history.length > 0 && (
          <div className="flex border-t border-gray-100">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                        ${filter === 'all' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
            >
              All ({history.length})
            </button>
            <button
              onClick={() => setFilter('liked')}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                        ${filter === 'liked' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            >
              Liked ({history.filter(h => h.action === 'right').length})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`flex-1 py-2 text-sm font-medium transition-colors
                        ${filter === 'passed' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}
            >
              Passed ({history.filter(h => h.action === 'left').length})
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="pb-safe">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No history yet</h3>
            <p className="text-gray-500 text-center">
              Activities you swipe will appear here
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredHistory.map((item, index) => (
              <li key={`${item.activity.id}-${item.timestamp}-${index}`}>
                <button
                  onClick={() => setSelectedActivity(item.activity)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  {/* Action indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                ${item.action === 'right' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {item.action === 'right' ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  {/* Image */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.activity.heroImageUrl}
                      alt={item.activity.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.activity.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{item.city}</span>
                      <span>·</span>
                      <span>{formatDate(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Save button for passed items */}
                  {item.action === 'left' && !isActivitySaved(item.activity.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveFromHistory(item)
                      }}
                      className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                      aria-label="Save activity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  )}

                  {isActivitySaved(item.activity.id) && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Saved
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  )
}

export default HistoryPage

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSwipeHistory } from '../hooks/useSwipeHistory'
import { useSavedActivities } from '../hooks/useSavedActivities'
import { ActivityCard, SwipeHistoryItem } from '../types'
import ActivityDetailsModal from '../components/ActivityDetailsModal'
import EmptyState from '../components/EmptyState'

type FilterType = 'all' | 'saved' | 'passed'

function HistoryPage() {
  const navigate = useNavigate()
  const { history, clearHistory } = useSwipeHistory()
  const { saveActivity, removeActivity, isActivitySaved } = useSavedActivities()
  const [selectedActivity, setSelectedActivity] = useState<ActivityCard | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleBack = () => {
    navigate('/')
  }

  const handleOpenDetails = (activity: ActivityCard) => {
    setSelectedActivity(activity)
  }

  const handleCloseDetails = () => {
    setSelectedActivity(null)
  }

  const handleToggleSave = (item: SwipeHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isActivitySaved(item.activity.id)) {
      removeActivity(item.activity.id)
    } else {
      saveActivity(item.activity)
    }
  }

  const handleClearHistory = () => {
    clearHistory()
    setShowClearConfirm(false)
  }

  // Filter and search logic
  const filteredHistory = useMemo(() => {
    let result = history

    // Apply direction filter
    if (filter === 'saved') {
      result = result.filter(item => item.direction === 'right')
    } else if (filter === 'passed') {
      result = result.filter(item => item.direction === 'left')
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.activity.name.toLowerCase().includes(query) ||
        item.activity.shortDescription.toLowerCase().includes(query) ||
        (item.activity.fullDescription?.toLowerCase().includes(query) ?? false)
      )
    }

    return result
  }, [history, filter, searchQuery])

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

  const filterCounts = useMemo(() => ({
    all: history.length,
    saved: history.filter(item => item.direction === 'right').length,
    passed: history.filter(item => item.direction === 'left').length,
  }), [history])

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

          <h1 className="text-lg font-bold text-gray-900">Swipe History</h1>

          {history.length > 0 ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-xl
                         focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100
                         transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-t border-gray-100">
          {(['all', 'saved', 'passed'] as FilterType[]).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`flex-1 py-2 text-sm font-medium transition-colors relative
                ${filter === filterType
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span className="capitalize">{filterType}</span>
              <span className="ml-1 text-xs">({filterCounts[filterType]})</span>
              {filter === filterType && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
      </header>

      {filteredHistory.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matches found' : 'No swipe history'}
          message={
            searchQuery
              ? `No activities match "${searchQuery}"`
              : 'Your swipe history will appear here as you explore activities.'
          }
          actionLabel={searchQuery ? 'Clear Search' : 'Start Exploring'}
          onAction={searchQuery ? () => setSearchQuery('') : handleBack}
        />
      ) : (
        <main className="p-4">
          <p className="text-sm text-gray-500 mb-4">
            {filteredHistory.length} {filteredHistory.length === 1 ? 'activity' : 'activities'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>

          <div className="space-y-3">
            {filteredHistory.map((item, index) => (
              <div
                key={`${item.activity.id}-${item.swipedAt}-${index}`}
                onClick={() => handleOpenDetails(item.activity)}
                className="bg-white rounded-xl shadow-sm overflow-hidden flex cursor-pointer
                           hover:shadow-md transition-shadow active:scale-[0.99] transform"
              >
                <div className="w-24 h-24 flex-shrink-0 relative">
                  <img
                    src={item.activity.heroImageUrl}
                    alt={item.activity.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Swipe direction indicator */}
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center
                      ${item.direction === 'right'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      }`}
                  >
                    {item.direction === 'right' ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {item.activity.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {item.activity.shortDescription}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatDate(item.swipedAt)}</span>
                      {item.activity.priceText && (
                        <span className="text-gray-500">{item.activity.priceText}</span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleToggleSave(item, e)}
                      className={`p-1.5 rounded-full transition-colors
                        ${isActivitySaved(item.activity.id)
                          ? 'text-green-500 bg-green-50'
                          : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                        }`}
                      aria-label={isActivitySaved(item.activity.id) ? 'Remove from saved' : 'Save activity'}
                    >
                      <svg className="w-5 h-5" fill={isActivitySaved(item.activity.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Clear History?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete your entire swipe history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium
                           hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-medium
                           hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryPage

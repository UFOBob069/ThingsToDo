import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { ActivityCard, SavedActivity } from '../types'

const STORAGE_KEY = 'savedActivities'

export function useSavedActivities() {
  const [savedActivities, setSavedActivities] = useLocalStorage<SavedActivity[]>(STORAGE_KEY, [])

  const saveActivity = useCallback((activity: ActivityCard) => {
    setSavedActivities(prev => {
      if (prev.some(a => a.id === activity.id)) {
        return prev
      }
      return [...prev, { ...activity, savedAt: Date.now() }]
    })
  }, [setSavedActivities])

  const removeActivity = useCallback((activityId: string) => {
    setSavedActivities(prev => prev.filter(a => a.id !== activityId))
  }, [setSavedActivities])

  const isActivitySaved = useCallback((activityId: string) => {
    return savedActivities.some(a => a.id === activityId)
  }, [savedActivities])

  const clearAll = useCallback(() => {
    setSavedActivities([])
  }, [setSavedActivities])

  return {
    savedActivities,
    saveActivity,
    removeActivity,
    isActivitySaved,
    clearAll,
    count: savedActivities.length,
  }
}

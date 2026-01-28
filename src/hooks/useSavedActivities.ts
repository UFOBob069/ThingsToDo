import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { ActivityCard, SavedActivity } from '../types'

const LOCAL_STORAGE_KEY = 'savedActivities'

function getLocalSavedActivities(): SavedActivity[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalSavedActivities(activities: SavedActivity[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activities))
}

export function useSavedActivities() {
  const { user } = useAuth()
  const [savedActivities, setSavedActivities] = useState<SavedActivity[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to Firestore changes for authenticated users
  useEffect(() => {
    if (user) {
      setLoading(true)
      const activitiesRef = collection(db, 'users', user.uid, 'savedActivities')
      const q = query(activitiesRef, orderBy('savedAt', 'desc'))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activities: SavedActivity[] = snapshot.docs.map(doc => ({
          ...doc.data() as SavedActivity,
          id: doc.id,
        }))
        setSavedActivities(activities)
        setLoading(false)
      }, (error) => {
        console.error('Error fetching saved activities:', error)
        setLoading(false)
      })

      return () => unsubscribe()
    } else {
      // Use localStorage for anonymous users
      setSavedActivities(getLocalSavedActivities())
      setLoading(false)
    }
  }, [user])

  // Migrate localStorage to Firestore when user logs in
  useEffect(() => {
    if (user) {
      const localActivities = getLocalSavedActivities()
      if (localActivities.length > 0) {
        // Migrate each activity to Firestore
        localActivities.forEach(async (activity) => {
          try {
            const activityRef = doc(db, 'users', user.uid, 'savedActivities', activity.id)
            await setDoc(activityRef, activity, { merge: true })
          } catch (error) {
            console.error('Error migrating activity:', error)
          }
        })
        // Clear localStorage after migration
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    }
  }, [user])

  const saveActivity = useCallback(async (activity: ActivityCard) => {
    const savedActivity: SavedActivity = {
      ...activity,
      savedAt: Date.now(),
    }

    if (user) {
      // Save to Firestore
      try {
        const activityRef = doc(db, 'users', user.uid, 'savedActivities', activity.id)
        await setDoc(activityRef, savedActivity)
      } catch (error) {
        console.error('Error saving activity:', error)
      }
    } else {
      // Save to localStorage
      const current = getLocalSavedActivities()
      if (!current.some(a => a.id === activity.id)) {
        const updated = [...current, savedActivity]
        setLocalSavedActivities(updated)
        setSavedActivities(updated)
      }
    }
  }, [user])

  const removeActivity = useCallback(async (activityId: string) => {
    if (user) {
      // Remove from Firestore
      try {
        const activityRef = doc(db, 'users', user.uid, 'savedActivities', activityId)
        await deleteDoc(activityRef)
      } catch (error) {
        console.error('Error removing activity:', error)
      }
    } else {
      // Remove from localStorage
      const current = getLocalSavedActivities()
      const updated = current.filter(a => a.id !== activityId)
      setLocalSavedActivities(updated)
      setSavedActivities(updated)
    }
  }, [user])

  const isActivitySaved = useCallback((activityId: string) => {
    return savedActivities.some(a => a.id === activityId)
  }, [savedActivities])

  const clearAll = useCallback(async () => {
    if (user) {
      // Clear all from Firestore
      try {
        const promises = savedActivities.map(activity => {
          const activityRef = doc(db, 'users', user.uid, 'savedActivities', activity.id)
          return deleteDoc(activityRef)
        })
        await Promise.all(promises)
      } catch (error) {
        console.error('Error clearing activities:', error)
      }
    } else {
      // Clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      setSavedActivities([])
    }
  }, [user, savedActivities])

  return {
    savedActivities,
    saveActivity,
    removeActivity,
    isActivitySaved,
    clearAll,
    count: savedActivities.length,
    loading,
  }
}

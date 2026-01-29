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
  limit,
} from 'firebase/firestore'
import { ActivityCard, HistoryActivity } from '../types'

const LOCAL_STORAGE_KEY = 'activityHistory'
const MAX_HISTORY_ITEMS = 100

function getLocalHistory(): HistoryActivity[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalHistory(activities: HistoryActivity[]) {
  // Keep only the most recent items
  const trimmed = activities.slice(0, MAX_HISTORY_ITEMS)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed))
}

export function useActivityHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryActivity[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to Firestore changes for authenticated users
  useEffect(() => {
    if (user) {
      setLoading(true)
      const historyRef = collection(db, 'users', user.uid, 'activityHistory')
      const q = query(historyRef, orderBy('viewedAt', 'desc'), limit(MAX_HISTORY_ITEMS))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activities: HistoryActivity[] = snapshot.docs.map(doc => ({
          ...doc.data() as HistoryActivity,
          id: doc.id,
        }))
        setHistory(activities)
        setLoading(false)
      }, (error) => {
        console.error('Error fetching activity history:', error)
        setLoading(false)
      })

      return () => unsubscribe()
    } else {
      // Use localStorage for anonymous users
      setHistory(getLocalHistory())
      setLoading(false)
    }
  }, [user])

  // Migrate localStorage to Firestore when user logs in
  useEffect(() => {
    if (user) {
      const localHistory = getLocalHistory()
      if (localHistory.length > 0) {
        // Migrate each history item to Firestore
        localHistory.forEach(async (activity) => {
          try {
            const historyRef = doc(db, 'users', user.uid, 'activityHistory', `${activity.id}-${activity.viewedAt}`)
            await setDoc(historyRef, activity, { merge: true })
          } catch (error) {
            console.error('Error migrating history:', error)
          }
        })
        // Clear localStorage after migration
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    }
  }, [user])

  const addToHistory = useCallback(async (activity: ActivityCard, action: 'saved' | 'dismissed') => {
    const historyActivity: HistoryActivity = {
      ...activity,
      viewedAt: Date.now(),
      action,
    }

    if (user) {
      // Save to Firestore with unique ID based on activity ID and timestamp
      try {
        const historyRef = doc(db, 'users', user.uid, 'activityHistory', `${activity.id}-${historyActivity.viewedAt}`)
        await setDoc(historyRef, historyActivity)
      } catch (error) {
        console.error('Error adding to history:', error)
      }
    } else {
      // Save to localStorage
      const current = getLocalHistory()
      const updated = [historyActivity, ...current].slice(0, MAX_HISTORY_ITEMS)
      setLocalHistory(updated)
      setHistory(updated)
    }
  }, [user])

  const clearHistory = useCallback(async () => {
    if (user) {
      // Clear all from Firestore
      try {
        const promises = history.map(activity => {
          const historyRef = doc(db, 'users', user.uid, 'activityHistory', `${activity.id}-${activity.viewedAt}`)
          return deleteDoc(historyRef)
        })
        await Promise.all(promises)
      } catch (error) {
        console.error('Error clearing history:', error)
      }
    } else {
      // Clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      setHistory([])
    }
  }, [user, history])

  return {
    history,
    addToHistory,
    clearHistory,
    count: history.length,
    loading,
  }
}

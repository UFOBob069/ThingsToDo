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
import { ActivityCard, SwipeHistoryItem } from '../types'

const LOCAL_STORAGE_KEY = 'swipeHistory'

function getLocalSwipeHistory(): SwipeHistoryItem[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalSwipeHistory(history: SwipeHistoryItem[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history))
}

export function useSwipeHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState<SwipeHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to Firestore changes for authenticated users
  useEffect(() => {
    if (user) {
      setLoading(true)
      const historyRef = collection(db, 'users', user.uid, 'swipeHistory')
      const q = query(historyRef, orderBy('swipedAt', 'desc'))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: SwipeHistoryItem[] = snapshot.docs.map(doc => ({
          ...doc.data() as SwipeHistoryItem,
        }))
        setHistory(items)
        setLoading(false)
      }, (error) => {
        console.error('Error fetching swipe history:', error)
        setLoading(false)
      })

      return () => unsubscribe()
    } else {
      // Use localStorage for anonymous users
      setHistory(getLocalSwipeHistory())
      setLoading(false)
    }
  }, [user])

  // Migrate localStorage to Firestore when user logs in
  useEffect(() => {
    if (user) {
      const localHistory = getLocalSwipeHistory()
      if (localHistory.length > 0) {
        // Migrate each item to Firestore
        localHistory.forEach(async (item) => {
          try {
            const itemRef = doc(db, 'users', user.uid, 'swipeHistory', `${item.activity.id}-${item.swipedAt}`)
            await setDoc(itemRef, item, { merge: true })
          } catch (error) {
            console.error('Error migrating swipe history:', error)
          }
        })
        // Clear localStorage after migration
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    }
  }, [user])

  const addToHistory = useCallback(async (activity: ActivityCard, direction: 'left' | 'right') => {
    const historyItem: SwipeHistoryItem = {
      activity,
      direction,
      swipedAt: Date.now(),
    }

    if (user) {
      // Save to Firestore
      try {
        const itemRef = doc(db, 'users', user.uid, 'swipeHistory', `${activity.id}-${historyItem.swipedAt}`)
        await setDoc(itemRef, historyItem)
      } catch (error) {
        console.error('Error saving to swipe history:', error)
      }
    } else {
      // Save to localStorage
      const current = getLocalSwipeHistory()
      const updated = [historyItem, ...current]
      setLocalSwipeHistory(updated)
      setHistory(updated)
    }
  }, [user])

  const removeFromHistory = useCallback(async (activityId: string, swipedAt: number) => {
    if (user) {
      // Remove from Firestore
      try {
        const itemRef = doc(db, 'users', user.uid, 'swipeHistory', `${activityId}-${swipedAt}`)
        await deleteDoc(itemRef)
      } catch (error) {
        console.error('Error removing from swipe history:', error)
      }
    } else {
      // Remove from localStorage
      const current = getLocalSwipeHistory()
      const updated = current.filter(item =>
        !(item.activity.id === activityId && item.swipedAt === swipedAt)
      )
      setLocalSwipeHistory(updated)
      setHistory(updated)
    }
  }, [user])

  const clearHistory = useCallback(async () => {
    if (user) {
      // Clear all from Firestore
      try {
        const promises = history.map(item => {
          const itemRef = doc(db, 'users', user.uid, 'swipeHistory', `${item.activity.id}-${item.swipedAt}`)
          return deleteDoc(itemRef)
        })
        await Promise.all(promises)
      } catch (error) {
        console.error('Error clearing swipe history:', error)
      }
    } else {
      // Clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      setHistory([])
    }
  }, [user, history])

  // Filter history by direction
  const getSavedItems = useCallback(() => {
    return history.filter(item => item.direction === 'right')
  }, [history])

  const getPassedItems = useCallback(() => {
    return history.filter(item => item.direction === 'left')
  }, [history])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getSavedItems,
    getPassedItems,
    count: history.length,
    loading,
  }
}

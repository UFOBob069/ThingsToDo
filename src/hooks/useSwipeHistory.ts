import { useState, useEffect, useCallback } from 'react'
import { ActivityCard } from '../types'

export interface HistoryItem {
  activity: ActivityCard
  action: 'left' | 'right'
  timestamp: number
  city: string
}

const STORAGE_KEY = 'swipeHistory'
const MAX_HISTORY_ITEMS = 200

export function useSwipeHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryItem[]
        setHistory(parsed)
      }
    } catch (error) {
      console.error('Error loading swipe history:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever history changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
      } catch (error) {
        console.error('Error saving swipe history:', error)
      }
    }
  }, [history, isLoaded])

  const addToHistory = useCallback((activity: ActivityCard, action: 'left' | 'right', city: string) => {
    setHistory(prev => {
      const newItem: HistoryItem = {
        activity,
        action,
        timestamp: Date.now(),
        city,
      }
      // Keep only the most recent items
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS)
      return updated
    })
  }, [])

  const removeLastFromHistory = useCallback(() => {
    setHistory(prev => prev.slice(1))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const getHistoryByCity = useCallback((cityName: string) => {
    return history.filter(item => item.city === cityName)
  }, [history])

  return {
    history,
    addToHistory,
    removeLastFromHistory,
    clearHistory,
    getHistoryByCity,
    count: history.length,
    isLoaded,
  }
}

import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import SwipePage from './pages/SwipePage'
import SavedPage from './pages/SavedPage'
import ActivityPage from './pages/ActivityPage'
import { City } from './types'

function App() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('selectedCity')
    if (stored) {
      try {
        setSelectedCity(JSON.parse(stored))
      } catch {
        localStorage.removeItem('selectedCity')
      }
    }
  }, [])

  const handleCitySelect = (city: City) => {
    setSelectedCity(city)
    localStorage.setItem('selectedCity', JSON.stringify(city))
  }

  const handleCityChange = () => {
    setSelectedCity(null)
    localStorage.removeItem('selectedCity')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            selectedCity ? (
              <SwipePage city={selectedCity} onChangeCity={handleCityChange} />
            ) : (
              <HomePage onCitySelect={handleCitySelect} />
            )
          }
        />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/activity/:id" element={<ActivityPage />} />
      </Routes>
    </div>
  )
}

export default App

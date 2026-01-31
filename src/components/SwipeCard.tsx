import { useMemo } from 'react'
import { useSwipeGesture } from '../hooks/useSwipeGesture'
import { ActivityCard } from '../types'

interface SwipeCardProps {
  activity: ActivityCard
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onViewDetails?: () => void
  isBackground?: boolean
  cardIndex?: number
}

type CardEffect = 'none' | 'golden' | 'rainbow' | 'sparkle' | 'fire'

function SwipeCard({
  activity,
  onSwipeLeft,
  onSwipeRight,
  onViewDetails,
  isBackground = false,
  cardIndex = 0,
}: SwipeCardProps) {
  const {
    cardRef,
    cardStyle,
    likeOpacity,
    nopeOpacity,
    isDragging,
  } = useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
  })

  // Determine special effect based on card properties
  const specialEffect: CardEffect = useMemo(() => {
    // High-rated activities (4.8+) get golden glow
    if (activity.rating && activity.rating >= 4.8) {
      return 'golden'
    }
    // Popular activities (1000+ reviews) get rainbow effect
    if (activity.reviewCount && activity.reviewCount >= 1000) {
      return 'rainbow'
    }
    // Random sparkle effect (15% chance)
    const seed = cardIndex + activity.id.charCodeAt(0)
    if (seed % 7 === 0) {
      return 'sparkle'
    }
    // Expensive activities get fire effect
    if (activity.priceText && parseInt(activity.priceText.replace(/\D/g, '')) >= 100) {
      return 'fire'
    }
    return 'none'
  }, [activity, cardIndex])

  const getEffectClasses = () => {
    switch (specialEffect) {
      case 'golden':
        return 'card-golden'
      case 'rainbow':
        return 'card-rainbow'
      case 'sparkle':
        return 'card-sparkle'
      case 'fire':
        return 'card-fire'
      default:
        return ''
    }
  }

  const getEffectBadge = () => {
    switch (specialEffect) {
      case 'golden':
        return { icon: '⭐', label: 'Top Rated' }
      case 'rainbow':
        return { icon: '🌟', label: 'Popular' }
      case 'sparkle':
        return { icon: '✨', label: 'Hidden Gem' }
      case 'fire':
        return { icon: '🔥', label: 'Premium' }
      default:
        return null
    }
  }

  const badge = getEffectBadge()

  if (isBackground) {
    return (
      <div className="w-full h-full bg-white rounded-2xl card-shadow overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${activity.heroImageUrl})`,
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      className={`w-full h-full bg-white rounded-2xl card-shadow overflow-hidden cursor-grab
                  ${isDragging ? 'cursor-grabbing' : ''} will-change-transform backface-hidden
                  ${getEffectClasses()}`}
    >
      <div className="relative h-full">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${activity.heroImageUrl})`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Sparkle overlay for special cards */}
        {specialEffect === 'sparkle' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="sparkle-particle"
                style={{
                  left: `${15 + Math.random() * 70}%`,
                  top: `${10 + Math.random() * 40}%`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Special badge */}
        {badge && (
          <div className="absolute top-4 left-4 z-10 animate-bounce-in">
            <div className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 shadow-lg
                          ${specialEffect === 'golden' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900' : ''}
                          ${specialEffect === 'rainbow' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ''}
                          ${specialEffect === 'sparkle' ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white' : ''}
                          ${specialEffect === 'fire' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : ''}`}>
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </div>
          </div>
        )}

        <div
          className="swipe-indicator left-4 border-green-500 text-green-500"
          style={{ opacity: likeOpacity }}
        >
          Save
        </div>

        <div
          className="swipe-indicator right-4 border-red-500 text-red-500 rotate-[20deg]"
          style={{ opacity: nopeOpacity }}
        >
          Nope
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <button
            onClick={onViewDetails}
            className="w-full text-left"
          >
            <h2 className="text-2xl font-bold mb-2 line-clamp-2">
              {activity.name}
            </h2>

            <p className="text-white/90 text-sm mb-3 line-clamp-2">
              {activity.shortDescription}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activity.rating !== undefined && (
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium">{activity.rating.toFixed(1)}</span>
                    {activity.reviewCount !== undefined && (
                      <span className="text-white/70 text-sm">
                        ({activity.reviewCount.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {activity.priceText && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  {activity.priceText}
                </div>
              )}
            </div>
          </button>
        </div>

        <button
          onClick={onViewDetails}
          className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full
                     flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="View details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default SwipeCard

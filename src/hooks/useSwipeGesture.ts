import { useRef, useState, useCallback, useEffect } from 'react'

interface SwipeState {
  offsetX: number
  offsetY: number
  rotation: number
  isDragging: boolean
  direction: 'left' | 'right' | null
}

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  swipeThreshold?: number
}

export function useSwipeGesture(options: UseSwipeGestureOptions) {
  const { onSwipeLeft, onSwipeRight, swipeThreshold = 100 } = options
  const cardRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    isDragging: false,
    direction: null,
  })
  const [isAnimating, setIsAnimating] = useState(false)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (isAnimating) return
    startPos.current = { x: clientX, y: clientY }
    setState(prev => ({ ...prev, isDragging: true }))
  }, [isAnimating])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!state.isDragging || isAnimating) return

    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    const rotation = deltaX * 0.05
    const direction = deltaX > swipeThreshold ? 'right' : deltaX < -swipeThreshold ? 'left' : null

    setState({
      offsetX: deltaX,
      offsetY: deltaY * 0.3,
      rotation,
      isDragging: true,
      direction,
    })
  }, [state.isDragging, isAnimating, swipeThreshold])

  const handleEnd = useCallback(() => {
    if (!state.isDragging || isAnimating) return

    const { offsetX } = state

    if (Math.abs(offsetX) > swipeThreshold) {
      setIsAnimating(true)
      const direction = offsetX > 0 ? 'right' : 'left'

      setState(prev => ({
        ...prev,
        offsetX: direction === 'right' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5,
        rotation: direction === 'right' ? 30 : -30,
        isDragging: false,
      }))

      setTimeout(() => {
        if (direction === 'right') {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
        setState({
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          isDragging: false,
          direction: null,
        })
        setIsAnimating(false)
      }, 300)
    } else {
      setState({
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        isDragging: false,
        direction: null,
      })
    }
  }, [state, isAnimating, swipeThreshold, onSwipeLeft, onSwipeRight])

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    if (isAnimating) return
    setIsAnimating(true)

    setState({
      offsetX: direction === 'right' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5,
      offsetY: 0,
      rotation: direction === 'right' ? 30 : -30,
      isDragging: false,
      direction,
    })

    setTimeout(() => {
      if (direction === 'right') {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
      setState({
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        isDragging: false,
        direction: null,
      })
      setIsAnimating(false)
    }, 300)
  }, [isAnimating, onSwipeLeft, onSwipeRight])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const onTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onTouchEnd = () => handleEnd()
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY)
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const onMouseUp = () => handleEnd()
    const onMouseLeave = () => {
      if (state.isDragging) handleEnd()
    }

    card.addEventListener('touchstart', onTouchStart, { passive: true })
    card.addEventListener('touchmove', onTouchMove, { passive: false })
    card.addEventListener('touchend', onTouchEnd)
    card.addEventListener('mousedown', onMouseDown)
    card.addEventListener('mousemove', onMouseMove)
    card.addEventListener('mouseup', onMouseUp)
    card.addEventListener('mouseleave', onMouseLeave)

    return () => {
      card.removeEventListener('touchstart', onTouchStart)
      card.removeEventListener('touchmove', onTouchMove)
      card.removeEventListener('touchend', onTouchEnd)
      card.removeEventListener('mousedown', onMouseDown)
      card.removeEventListener('mousemove', onMouseMove)
      card.removeEventListener('mouseup', onMouseUp)
      card.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [handleStart, handleMove, handleEnd, state.isDragging])

  const cardStyle = {
    transform: `translateX(${state.offsetX}px) translateY(${state.offsetY}px) rotate(${state.rotation}deg)`,
    transition: state.isDragging ? 'none' : 'transform 0.3s ease-out',
  }

  const likeOpacity = Math.min(Math.max(state.offsetX / swipeThreshold, 0), 1)
  const nopeOpacity = Math.min(Math.max(-state.offsetX / swipeThreshold, 0), 1)

  return {
    cardRef,
    cardStyle,
    likeOpacity,
    nopeOpacity,
    direction: state.direction,
    isDragging: state.isDragging,
    isAnimating,
    triggerSwipe,
  }
}

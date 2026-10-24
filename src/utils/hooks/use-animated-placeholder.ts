import { useState, useEffect, useRef } from 'react'

export interface UseAnimatedPlaceholderOptions {
  phrases: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseTime?: number
  emptyPauseTime?: number
  enabled?: boolean
}

/**
 * Animated typewriter hook cycling through placeholder text smoothly.
 */
export function useAnimatedPlaceholder({
  phrases,
  typingSpeed = 65,
  deletingSpeed = 30,
  pauseTime = 2200,
  emptyPauseTime = 400,
  enabled = true,
}: UseAnimatedPlaceholderOptions): string {
  const [displayText, setDisplayText] = useState('')
  const stateRef = useRef({
    phraseIndex: 0,
    charIndex: 0,
    isDeleting: false,
  })

  useEffect(() => {
    if (!enabled || phrases.length === 0) return

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      const { phraseIndex, charIndex, isDeleting } = stateRef.current
      const currentPhrase = phrases[phraseIndex] || ''

      if (!isDeleting) {
        if (charIndex < currentPhrase.length) {
          stateRef.current.charIndex = charIndex + 1
          setDisplayText(currentPhrase.slice(0, charIndex + 1))
          timeoutId = setTimeout(tick, typingSpeed)
        } else {
          timeoutId = setTimeout(() => {
            stateRef.current.isDeleting = true
            tick()
          }, pauseTime)
        }
      } else {
        if (charIndex > 0) {
          stateRef.current.charIndex = charIndex - 1
          setDisplayText(currentPhrase.slice(0, charIndex - 1))
          timeoutId = setTimeout(tick, deletingSpeed)
        } else {
          stateRef.current.isDeleting = false
          stateRef.current.phraseIndex = (phraseIndex + 1) % phrases.length
          timeoutId = setTimeout(tick, emptyPauseTime)
        }
      }
    }

    timeoutId = setTimeout(tick, typingSpeed)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [phrases, typingSpeed, deletingSpeed, pauseTime, emptyPauseTime, enabled])

  return displayText
}

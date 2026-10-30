import { useEffect, useRef, useState } from 'react'

export function useSmoothProgress(
  targetProgress: number,
  isActive: boolean = true,
): number {
  const [currentProgress, setCurrentProgress] = useState(targetProgress)
  const currentRef = useRef(targetProgress)
  const targetRef = useRef(targetProgress)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    targetRef.current = targetProgress

    if (!isActive) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      currentRef.current = targetProgress
      setCurrentProgress(targetProgress)
      return
    }

    if (targetProgress === 0 || targetProgress < currentRef.current - 15) {
      currentRef.current = targetProgress
      setCurrentProgress(targetProgress)
      return
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now
      }
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = now

      const diff = targetRef.current - currentRef.current
      if (Math.abs(diff) < 0.1) {
        currentRef.current = targetRef.current
        setCurrentProgress(targetRef.current)
        rafRef.current = null
        lastTimeRef.current = null
        return
      }

      const factor = 1 - Math.exp(-9 * dt)
      currentRef.current += diff * factor
      setCurrentProgress(currentRef.current)

      rafRef.current = requestAnimationFrame(step)
    }

    if (rafRef.current === null) {
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(step)
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimeRef.current = null
    }
  }, [targetProgress, isActive])

  return currentProgress
}

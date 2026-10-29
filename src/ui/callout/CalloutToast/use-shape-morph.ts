import { useState, useEffect } from 'react'
import { MORPH_SHAPES } from '../constants'

export function useShapeMorph(isDownload: boolean) {
  const [shapeIndex, setShapeIndex] = useState(0)

  useEffect(() => {
    if (!isDownload) return
    const interval = setInterval(() => {
      setShapeIndex((prev) => (prev + 1) % MORPH_SHAPES.length)
    }, 1100)
    return () => clearInterval(interval)
  }, [isDownload])

  return MORPH_SHAPES[shapeIndex]
}


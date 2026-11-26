import { useState, useEffect } from 'react'
import {
  getEnginePlaytime,
  formatPlaytime,
  ENGINE_PLAYTIME_CHANGED_EVENT,
} from './engine-playtime'
import type { EngineId } from './types'

export interface UseEnginePlaytimeResult {
  playtimeSeconds: number
  formattedPlaytime: string
}

export function useEnginePlaytime(
  engineId: EngineId | string,
): UseEnginePlaytimeResult {
  const [prevEngineId, setPrevEngineId] = useState(engineId)
  const [playtimeSeconds, setPlaytimeSeconds] = useState<number>(() =>
    getEnginePlaytime(engineId),
  )

  if (prevEngineId !== engineId) {
    setPrevEngineId(engineId)
    setPlaytimeSeconds(getEnginePlaytime(engineId))
  }

  useEffect(() => {
    const handlePlaytimeChange = (evt: Event) => {
      const custom = evt as CustomEvent<{ engineId: string; seconds: number }>
      if (custom.detail?.engineId === engineId) {
        setPlaytimeSeconds(custom.detail.seconds)
      }
    }

    window.addEventListener(
      ENGINE_PLAYTIME_CHANGED_EVENT,
      handlePlaytimeChange,
    )
    return () => {
      window.removeEventListener(
        ENGINE_PLAYTIME_CHANGED_EVENT,
        handlePlaytimeChange,
      )
    }
  }, [engineId])

  return {
    playtimeSeconds,
    formattedPlaytime: formatPlaytime(playtimeSeconds),
  }
}

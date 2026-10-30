import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ensureWeekBoxLibrary,
  resolveActiveLibraryPath,
  setSavedCustomLibraryPath,
} from './weekbox-library'
import { WEEKBOX_LIBRARY_DIR_NAME } from './constants'
import type { WeekBoxLibraryPaths, UseWeekBoxLibraryResult } from './types'

export function useWeekBoxLibrary(): UseWeekBoxLibraryResult {
  const [libraryPath, setLibraryPath] = useState<string | null>(null)
  const [paths, setPaths] = useState<WeekBoxLibraryPaths | null>(null)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const isInitializingRef = useRef(false)

  const runInit = useCallback(async (customPath?: string | null) => {
    if (isInitializingRef.current) return
    isInitializingRef.current = true

    try {
      const activePath =
        customPath !== undefined
          ? customPath || (await resolveActiveLibraryPath())
          : await resolveActiveLibraryPath()

      const result = await ensureWeekBoxLibrary(activePath)
      setLibraryPath(result.basePath)
      setPaths(result.paths)
      setIsInitialized(true)
      setError(null)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      console.error('[WeekBox] Failed to initialize WeekBoxLibrary:', errorObj)
    } finally {
      setIsLoading(false)
      isInitializingRef.current = false
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const initLibrary = async () => {
      let activePath = await resolveActiveLibraryPath()
      if (activePath === WEEKBOX_LIBRARY_DIR_NAME) {
        await new Promise((r) => setTimeout(r, 600))
        activePath = await resolveActiveLibraryPath()
      }
      return await ensureWeekBoxLibrary(activePath)
    }

    initLibrary()
      .then((result) => {
        if (!isCancelled) {
          setLibraryPath(result.basePath)
          setPaths(result.paths)
          setIsInitialized(true)
          setIsLoading(false)
          setError(null)
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          setError(errorObj)
          setIsLoading(false)
          console.error('[WeekBox] Failed to initialize WeekBoxLibrary:', errorObj)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const setCustomLibraryPath = useCallback(
    async (newPath: string | null) => {
      setIsLoading(true)
      setSavedCustomLibraryPath(newPath)
      await runInit(newPath)
    },
    [runInit],
  )

  const reinitialize = useCallback(async () => {
    setIsLoading(true)
    await runInit(libraryPath)
  }, [runInit, libraryPath])

  return {
    libraryPath,
    paths,
    isInitialized,
    isLoading,
    error,
    setCustomLibraryPath,
    reinitialize,
  }
}

import { createContext, useContext } from 'react'

export interface LoadingContextType {
  isLoading: boolean
  isFadingOut: boolean
  progress: number
  message: string
  showLoading: (msg?: string) => void
  setProgress: (val: number) => void
  hideLoading: () => void
}

export const LoadingContext = createContext<LoadingContextType>({
  isLoading: true,
  isFadingOut: false,
  progress: 0,
  message: 'Starting WeekBox...',
  showLoading: () => {},
  setProgress: () => {},
  hideLoading: () => {},
})

export const useLoading = () => useContext(LoadingContext)

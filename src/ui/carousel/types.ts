import type React from 'react'

/**
 * API exposed to the renderIndicators callback for custom navigation and progress.
 */
export interface CarouselAPI {
  activeIndex: number
  totalItems: number
  goToLogicalIndex: (index: number) => void
  prev: () => void
  next: () => void
  bindProgressRef: (index: number) => (el: HTMLDivElement | null) => void
}

/**
 * Interface for Carousel properties.
 */
export interface CarouselProps {
  /** The child elements to display within the carousel. */
  children: React.ReactNode
  /** If true, the carousel loops infinitely, duplicating nodes implicitly. */
  isInfinite?: boolean
  /** If true, the carousel scrolls automatically based on the autoInterval. */
  isAuto?: boolean
  /** The interval in milliseconds between auto-scrolls. Default is 3000. */
  autoInterval?: number
  /** Optional custom CSS classes for the container. */
  className?: string
  /** Optional CSS aspect ratio for the container items (for container queries). */
  aspectRatio?: string
  /** Optional callback to render custom indicators (like pills or dots). */
  renderIndicators?: (api: CarouselAPI) => React.ReactNode
  /** Optional callback executed when the active (centered) item is clicked. */
  onItemClick?: (index: number) => void
  /** Explicitly enforce mobile (0-100-0) or desktop (10-80-10) layout. If omitted, auto-detected. */
  isMobile?: boolean
  /** Optional inline styles for the container. */
  style?: React.CSSProperties
  /** Optional ref to access the imperative Carousel API. */
  apiRef?: React.Ref<CarouselAPI>
  /** Optional callback fired when the logical active index changes. */
  onIndexChange?: (index: number) => void
}

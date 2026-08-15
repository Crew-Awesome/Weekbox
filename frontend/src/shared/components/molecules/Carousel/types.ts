import React from 'react';

/**
 * API exposed to the renderIndicators callback for custom navigation and progress.
 */
export interface CarouselAPI {
    activeIndex: number;
    totalItems: number;
    goToLogicalIndex: (index: number) => void;
    bindProgressRef: (index: number) => (el: HTMLDivElement | null) => void;
}

/**
 * Interface for Carousel properties.
 */
export interface CarouselProps {
    /** The child elements to display within the carousel. Recommended to use Material Design 3 cards for styling. */
    children: React.ReactNode;
    /** If true, the carousel loops infinitely, duplicating nodes implicitly. Recommended to have at least 5 nodes visually. */
    isInfinite?: boolean;
    /** If true, the carousel scrolls automatically based on the autoInterval. */
    isAuto?: boolean;
    /** The interval in milliseconds between auto-scrolls. Default is 3000. */
    autoInterval?: number;
    /** Optional custom CSS classes for the container. */
    className?: string;
    /** Optional CSS aspect ratio for the container items (for container queries). */
    aspectRatio?: string;
    /** Optional callback to render custom indicators (like pills or dots). */
    renderIndicators?: (api: CarouselAPI) => React.ReactNode;
}

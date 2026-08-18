import { useRef, useEffect, useCallback, useState, Children } from "react";
import type { PointerEvent } from "react";
import gsap from "gsap";
import { calculateVisuals } from "./carouselMath";
import type { CarouselProps, CarouselAPI } from "./types";

/**
 * @description Custom hook for managing Carousel state, GSAP animations, infinite scrolling mathematics, and touch/pointer interactions.
 * @param {CarouselProps} props - Component properties.
 * @returns {object} Refs, state, and event handlers for the Carousel component.
 */
export function useCarousel(props: CarouselProps) {
  const {
    children,
    isInfinite = false,
    isAuto = false,
    autoInterval = 3000,
    onItemClick,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const visualRefs = useRef<(HTMLDivElement | null)[]>([]);

  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    isAnimating: false,
    direction: 1,
    hasDragged: false,
  });

  const childrenArray = Children.toArray(children);
  let visualChildren = [...childrenArray];

  if (isInfinite && visualChildren.length > 0 && visualChildren.length < 5) {
    const setsNeeded = Math.ceil(5 / childrenArray.length);
    for (let s = 1; s < setsNeeded; s++) {
      visualChildren = [...visualChildren, ...childrenArray];
    }
  }
  const totalItems = visualChildren.length;
  const dummyCount = isInfinite ? 50 : totalItems;

  const handleInfiniteScrollWrap = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !isInfinite || scroller.clientWidth === 0) return;

    const shiftDist = scroller.clientWidth;
    const p = scroller.scrollLeft / shiftDist;

    if (p > 40) {
      scroller.scrollLeft -= totalItems * shiftDist;
    } else if (p < 10) {
      scroller.scrollLeft += totalItems * shiftDist;
    }
  }, [isInfinite, totalItems]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);
  const progressRefs = useRef<(HTMLDivElement | null)[]>([]);

  const exactIndexRef = useRef(0);

  const updateVisuals = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0 || totalItems === 0) return;

    const scrollPos = scroller.scrollLeft;
    const progress = scrollPos / scroller.clientWidth;

    const isMobile = window.innerWidth < 640;
    const layouts = calculateVisuals(
      totalItems,
      progress,
      !isInfinite,
      isMobile,
    );

    layouts.forEach((layout, index) => {
      const item = visualRefs.current[index];
      if (!item) return;

      item.style.width = `${layout.w.toFixed(2)}cqw`;
      item.style.transform = `translateX(${layout.x.toFixed(2)}cqw)`;
      item.style.left = "0";

      if (layout.display === "none") {
        item.style.visibility = "hidden";
      } else {
        item.style.visibility = "visible";
        const content = item.querySelector(".m3-card-content") as HTMLElement;
        const badge = item.querySelector(".m3-card-badge") as HTMLElement;

        if (isMobile) {
          if (content) content.style.opacity = "1";
          if (badge) badge.style.opacity = "1";
        } else {
          const opacity = Math.max(0, (layout.w - 15) / 65).toFixed(2);
          if (content) content.style.opacity = opacity;
          if (badge) badge.style.opacity = opacity;
        }
      }
    });

    const currentIndex = Math.round(progress);
    exactIndexRef.current = currentIndex;
    const currentLogicalIndex =
      ((currentIndex % totalItems) + totalItems) % totalItems;
    const originalIndex = currentLogicalIndex % childrenArray.length;

    if (activeIndexRef.current !== originalIndex) {
      activeIndexRef.current = originalIndex;
      setActiveIndex(originalIndex);

      if (
        !dragState.current.isAnimating &&
        !dragState.current.isDown &&
        isAuto
      ) {
        // We use setTimeout to avoid React state update collision within the same render cycle
        setTimeout(() => playAuto(), 0);
      }
    }
  }, [isInfinite, totalItems, childrenArray.length, isAuto]);

  const pauseAuto = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (progressTweenRef.current) {
      progressTweenRef.current.kill();
      progressTweenRef.current = null;
    }
  }, []);

  const smoothScrollToIndex = useCallback(
    (targetIndex: number, duration: number = 0.6) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      pauseAuto();
      dragState.current.isAnimating = true;

      // Temporarily disable CSS scroll snapping so it doesn't fight the GSAP tween
      scroller.style.scrollSnapType = "none";

      const targetScrollLeft = targetIndex * scroller.clientWidth;

      const proxy = { x: scroller.scrollLeft };
      gsap.to(proxy, {
        x: targetScrollLeft,
        duration: duration,
        ease: "power3.inOut",
        onUpdate: () => {
          scroller.scrollLeft = proxy.x;
          updateVisuals();
        },
        onComplete: () => {
          dragState.current.isAnimating = false;
          scroller.style.scrollSnapType = ""; // Restore native snapping

          if (isInfinite) {
            handleInfiniteScrollWrap();
            updateVisuals();
          }
          if (!dragState.current.isDown) {
            playAuto();
          }
        },
      });
    },
    [isInfinite, updateVisuals, handleInfiniteScrollWrap, pauseAuto],
  );

  const playAuto = useCallback(() => {
    if (!isAuto) return;
    pauseAuto();

    const activeBar = progressRefs.current[activeIndexRef.current];
    if (activeBar) {
      progressTweenRef.current = gsap.fromTo(
        activeBar,
        { scaleX: 0 },
        { scaleX: 1, duration: autoInterval / 1000, ease: "none" },
      );
    }

    autoTimerRef.current = setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      if (!isInfinite) {
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        if (scroller.scrollLeft >= maxScroll - 5) {
          dragState.current.direction = -1;
        } else if (scroller.scrollLeft <= 5) {
          dragState.current.direction = 1;
        }
      }

      const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth;
      const targetIndex =
        Math.round(currentIndexFloat) + dragState.current.direction;
      smoothScrollToIndex(targetIndex);
    }, autoInterval);
  }, [isAuto, isInfinite, autoInterval, smoothScrollToIndex, pauseAuto]);

  const goToLogicalIndex = useCallback(
    (targetUniqueIndex: number) => {
      if (dragState.current.hasDragged) return;

      const scroller = scrollerRef.current;
      if (!scroller || scroller.clientWidth === 0 || totalItems === 0) return;

      const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth;
      const currentIndex = Math.round(currentIndexFloat);
      const currentLogicalIndex =
        ((currentIndex % totalItems) + totalItems) % totalItems;
      const currentUniqueIndex = currentLogicalIndex % childrenArray.length;

      let diff = targetUniqueIndex - currentUniqueIndex;
      if (diff === 0) {
        if (onItemClick) onItemClick(targetUniqueIndex);
        return;
      }

      if (isInfinite) {
        const uniqueCount = childrenArray.length;
        if (diff > uniqueCount / 2) diff -= uniqueCount;
        if (diff < -uniqueCount / 2) diff += uniqueCount;
      }

      const targetIndex = currentIndex + diff;
      smoothScrollToIndex(targetIndex, 0.6);
    },
    [
      isInfinite,
      totalItems,
      childrenArray.length,
      smoothScrollToIndex,
      onItemClick,
    ],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      pauseAuto();
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) return;

    pauseAuto();
    dragState.current.isDown = true;
    dragState.current.hasDragged = false;

    if (dragState.current.isAnimating) {
      dragState.current.isAnimating = false;
      gsap.killTweensOf(scroller);
      scroller.style.scrollSnapType = "";
    }

    dragState.current.startX = e.pageX;
    const startY = e.pageY;
    dragState.current.scrollLeft = scroller.scrollLeft;

    let isHorizontalSwipe: boolean | null = null;

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (!dragState.current.isDown) return;

      const dx = Math.abs(moveEvent.pageX - dragState.current.startX);
      const dy = Math.abs(moveEvent.pageY - startY);

      if (dx > 5 || dy > 5) {
        dragState.current.hasDragged = true;
      }

      // Determine direction lock on first few pixels of movement
      if (isHorizontalSwipe === null && (dx > 5 || dy > 5)) {
        isHorizontalSwipe = dx > dy;
      }

      if (isHorizontalSwipe) {
        if (moveEvent.cancelable) {
          moveEvent.preventDefault(); // Block vertical scroll only if horizontally swiping
        }
        const walk = (dragState.current.startX - moveEvent.pageX) * 1.5;
        scroller.scrollLeft = dragState.current.scrollLeft + walk;
        updateVisuals();
      }
    };

    const onPointerUp = (upEvent: globalThis.PointerEvent) => {
      if (!dragState.current.isDown) return;
      dragState.current.isDown = false;

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (isInfinite) {
        handleInfiniteScrollWrap();
      }

      const dx = dragState.current.startX - upEvent.pageX;
      const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth;

      let snapIndex = Math.round(currentIndexFloat);
      const isMobile = window.innerWidth < 640;

      if (isMobile) {
        const startIndex = Math.round(
          dragState.current.scrollLeft / scroller.clientWidth,
        );
        if (isHorizontalSwipe) {
          if (dx > 50) snapIndex = startIndex + 1;
          else if (dx < -50) snapIndex = startIndex - 1;
          else snapIndex = startIndex; // Return to start if swipe wasn't strong enough

          // Clamp to strictly +/- 1 card from where the drag started
          if (snapIndex > startIndex + 1) snapIndex = startIndex + 1;
          if (snapIndex < startIndex - 1) snapIndex = startIndex - 1;
        }
      } else {
        // Desktop free dragging: allow jumping multiple cards
        if (isHorizontalSwipe) {
          if (dx > 50) {
            snapIndex = Math.ceil(currentIndexFloat);
          } else if (dx < -50) {
            snapIndex = Math.floor(currentIndexFloat);
          }
        }
      }

      if (Math.abs(snapIndex - currentIndexFloat) > 0.001) {
        smoothScrollToIndex(snapIndex, 0.4);
      } else {
        playAuto();
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const onScroll = () => {
    if (dragState.current.isDown || dragState.current.isAnimating) return;

    if (
      isInfinite &&
      scrollerRef.current &&
      scrollerRef.current.clientWidth > 0
    ) {
      handleInfiniteScrollWrap();
    }
    updateVisuals();
  };

  const onTouchEnd = () => {
    // When touch swipe ends, resume auto play since native scroll-snap handles the snapping
    playAuto();
  };

  useEffect(() => {
    playAuto();
    return () => pauseAuto();
  }, [playAuto, pauseAuto]);

  const api: CarouselAPI = {
    activeIndex,
    totalItems: childrenArray.length,
    goToLogicalIndex,
    bindProgressRef: (index: number) => (el: HTMLDivElement | null) => {
      progressRefs.current[index] = el;
    },
  };

  return {
    containerRef,
    scrollerRef,
    visualRefs,
    visualChildren,
    childrenArray,
    dummyCount,
    api,
    onPointerDown,
    onScroll,
    onTouchEnd,
    updateVisuals,
    dragState,
    totalItems,
    exactIndexRef,
  };
}

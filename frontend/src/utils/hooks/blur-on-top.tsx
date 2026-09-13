import React, { useState, useEffect, useCallback } from "react";

export interface UseBlurOnTopOptions {
  /**
   * Maximum blur radius in pixels. Defaults to 36.
   */
  blurAmount?: number;
  /**
   * Duration of the focus transition in milliseconds. Defaults to 3800.
   */
  durationMs?: number;
  /**
   * Delay before starting the focus transition in milliseconds. Defaults to 700.
   */
  delayMs?: number;
  /**
   * Whether to activate immediately on mount and trigger focus transition. Defaults to true.
   */
  immediate?: boolean;
}

export interface UseBlurOnTopReturn {
  isActive: boolean;
  opacity: number;
  blur: number;
  fadeIn: (duration?: number) => void;
  fadeOut: (duration?: number) => void;
  BlurOverlay: React.FC<{ className?: string; zIndexClassName?: string }>;
}

/**
 * Hook that displays an atmospheric full-viewport blur overlay on top of everything.
 * Starts with full blur and progressively unblurs down to 0px for a camera focus effect,
 * while providing manual fadeIn and fadeOut triggers.
 */
export function useBlurOnTop(options: UseBlurOnTopOptions = {}): UseBlurOnTopReturn {
  const {
    blurAmount = 36,
    durationMs = 3800,
    delayMs = 700,
    immediate = true,
  } = options;

  const [isActive, setIsActive] = useState<boolean>(immediate);
  const [blur, setBlur] = useState<number>(immediate ? blurAmount : 0);
  const [hasTransition, setHasTransition] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(durationMs);

  useEffect(() => {
    if (!immediate) return;

    let isMounted = true;

    const transitionTimer = setTimeout(() => {
      if (!isMounted) return;
      setHasTransition(true);
    }, 60);

    const unblurTimer = setTimeout(() => {
      if (!isMounted) return;
      setDuration(durationMs);
      setHasTransition(true);
      setBlur(0);
    }, delayMs);

    const finishTimer = setTimeout(() => {
      if (!isMounted) return;
      setIsActive(false);
    }, delayMs + durationMs);

    return () => {
      isMounted = false;
      clearTimeout(transitionTimer);
      clearTimeout(unblurTimer);
      clearTimeout(finishTimer);
    };
  }, [immediate, delayMs, durationMs]);

  const fadeIn = useCallback(
    (customDuration?: number) => {
      const dur = customDuration ?? 600;
      setDuration(dur);
      setIsActive(true);
      setHasTransition(true);
      requestAnimationFrame(() => {
        setBlur(blurAmount);
      });
    },
    [blurAmount]
  );

  const fadeOut = useCallback(
    (customDuration?: number) => {
      const dur = customDuration ?? durationMs;
      setDuration(dur);
      setHasTransition(true);
      requestAnimationFrame(() => {
        setBlur(0);
      });
      setTimeout(() => {
        setIsActive(false);
      }, dur);
    },
    [durationMs]
  );

  const BlurOverlay: React.FC<{ className?: string; zIndexClassName?: string }> = ({
    className = "",
    zIndexClassName = "z-[99999]",
  }) => {
    if (!isActive) return null;

    const transitionStyle = hasTransition
      ? `backdrop-filter ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1), -webkit-backdrop-filter ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
      : "none";

    return (
      <div
        className={`fixed inset-0 w-screen h-screen ${zIndexClassName} pointer-events-none ${className}`}
        style={{
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          transition: transitionStyle,
          willChange: "backdrop-filter",
        }}
        aria-hidden="true"
      />
    );
  };

  return {
    isActive,
    opacity: isActive ? 1 : 0,
    blur,
    fadeIn,
    fadeOut,
    BlurOverlay,
  };
}

export default useBlurOnTop;

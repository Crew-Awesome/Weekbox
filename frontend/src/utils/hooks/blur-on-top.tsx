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
    blurAmount = 16,
    durationMs = 600,
    delayMs = 200,
    immediate = true,
  } = options;

  const [isActive, setIsActive] = useState<boolean>(immediate);
  const [isFading, setIsFading] = useState<boolean>(false);

  useEffect(() => {
    if (!immediate) return;

    let isMounted = true;

    const fadeTimer = setTimeout(() => {
      if (!isMounted) return;
      setIsFading(true);
    }, delayMs);

    const finishTimer = setTimeout(() => {
      if (!isMounted) return;
      setIsActive(false);
    }, delayMs + durationMs);

    return () => {
      isMounted = false;
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [immediate, delayMs, durationMs]);

  const fadeIn = useCallback((_customDuration?: number) => {
    setIsActive(true);
    setIsFading(false);
  }, []);

  const fadeOut = useCallback(
    (customDuration?: number) => {
      const dur = customDuration ?? durationMs;
      setIsFading(true);
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

    return (
      <div
        className={`fixed inset-0 w-screen h-screen ${zIndexClassName} pointer-events-none transition-opacity ease-out ${className} ${
          isFading ? "opacity-0" : "opacity-100"
        }`}
        style={{
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
          transitionDuration: `${durationMs}ms`,
        }}
        aria-hidden="true"
      />
    );
  };

  return {
    isActive,
    opacity: isFading ? 0 : 1,
    blur: isFading ? 0 : blurAmount,
    fadeIn,
    fadeOut,
    BlurOverlay,
  };
}

export default useBlurOnTop;

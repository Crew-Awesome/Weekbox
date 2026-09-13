import { useState, useEffect, useCallback } from "react";

const MODAL_PATTERN_STORAGE_KEY = "wb_modal_circle_pattern";

type ModalPatternListener = (active: boolean) => void;
const listeners = new Set<ModalPatternListener>();

/**
 * Checks whether the modal circle pattern is active in settings.
 * Defaults to true.
 */
export function isModalPatternActive(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const item = localStorage.getItem(MODAL_PATTERN_STORAGE_KEY);
    if (item === null) return true;
    return item === "true";
  } catch {
    return true;
  }
}

/**
 * Persists the modal circle pattern setting and notifies all subscribers.
 */
export function setModalPatternActive(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODAL_PATTERN_STORAGE_KEY, String(active));
  } catch {}
  listeners.forEach((fn) => fn(active));
  window.dispatchEvent(
    new CustomEvent("wb:modal-pattern-changed", { detail: { active } })
  );
}

/**
 * Subscribes to changes in the modal circle pattern setting.
 */
export function subscribeModalPattern(listener: ModalPatternListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Hook to reactively consume and toggle the modal circle pattern.
 */
export function useModalPattern(): {
  isCirclePatternActive: boolean;
  setCirclePatternActive: (active: boolean) => void;
  toggleCirclePatternActive: () => void;
} {
  const [isCirclePatternActive, setIsCirclePatternActive] = useState<boolean>(isModalPatternActive);

  useEffect(() => {
    const unsubscribe = subscribeModalPattern((active) => {
      setIsCirclePatternActive(active);
    });
    return unsubscribe;
  }, []);

  const toggleCirclePatternActive = useCallback(() => {
    setModalPatternActive(!isModalPatternActive());
  }, []);

  return {
    isCirclePatternActive,
    setCirclePatternActive: setModalPatternActive,
    toggleCirclePatternActive,
  };
}

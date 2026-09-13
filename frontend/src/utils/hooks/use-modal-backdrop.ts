import { useState, useEffect, useCallback } from "react";

const MODAL_BACKDROP_STORAGE_KEY = "wb_modal_backdrop_image";

type ModalBackdropListener = (active: boolean) => void;
const listeners = new Set<ModalBackdropListener>();

/**
 * Checks whether the ambient modal backdrop image is active in settings.
 * Defaults to true.
 */
export function isModalBackdropActive(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const item = localStorage.getItem(MODAL_BACKDROP_STORAGE_KEY);
    if (item === null) return true;
    return item === "true";
  } catch {
    return true;
  }
}

/**
 * Persists the modal backdrop image setting and notifies all subscribers.
 */
export function setModalBackdropActive(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODAL_BACKDROP_STORAGE_KEY, String(active));
  } catch {}
  listeners.forEach((fn) => fn(active));
  window.dispatchEvent(
    new CustomEvent("wb:modal-backdrop-changed", { detail: { active } })
  );
}

/**
 * Subscribes to changes in the modal backdrop setting.
 */
export function subscribeModalBackdrop(listener: ModalBackdropListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Hook to reactively consume and toggle the modal thumbnail backdrop image setting.
 */
export function useModalBackdrop(): {
  isModalBackdropActive: boolean;
  setModalBackdropActive: (active: boolean) => void;
  toggleModalBackdropActive: () => void;
} {
  const [isBackdropActive, setIsBackdropActive] = useState<boolean>(isModalBackdropActive);

  useEffect(() => {
    const unsubscribe = subscribeModalBackdrop((active) => {
      setIsBackdropActive(active);
    });

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.active === "boolean") {
        setIsBackdropActive(customEvent.detail.active);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === MODAL_BACKDROP_STORAGE_KEY) {
        setIsBackdropActive(e.newValue === null ? true : e.newValue === "true");
      }
    };

    window.addEventListener("wb:modal-backdrop-changed", handleCustomEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("wb:modal-backdrop-changed", handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleModalBackdropActive = useCallback(() => {
    setModalBackdropActive(!isBackdropActive);
  }, [isBackdropActive]);

  return {
    isModalBackdropActive: isBackdropActive,
    setModalBackdropActive,
    toggleModalBackdropActive,
  };
}

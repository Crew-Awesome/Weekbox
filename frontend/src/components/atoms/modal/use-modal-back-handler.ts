import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";

/**
 * Handles Escape key and Capacitor hardware/gesture back button.
 * Uses refs to store onBack and onClose callbacks so listeners always invoke
 * the latest instance without re-registering or capturing stale closures.
 */
export const useModalBackHandler = (
  isOpen: boolean,
  onClose: () => void,
  onBack?: () => boolean | void
) => {
  const onBackRef = useRef(onBack);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onBackRef.current = onBack;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleBackAction = () => {
      if (onBackRef.current) {
        const handled = onBackRef.current();
        if (handled) return;
      }
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleBackAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    let backListenerHandle: { remove: () => Promise<void> } | null = null;

    App.addListener("backButton", () => {
      handleBackAction();
    })
      .then((handle) => {
        backListenerHandle = handle;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
    };
  }, [isOpen]);
};

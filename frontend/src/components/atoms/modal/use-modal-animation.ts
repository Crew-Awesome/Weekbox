import React, { useState, useEffect, useRef, useCallback } from "react";
import { SoundEffects } from "@utils";

export const useModalAnimation = (isOpen: boolean, onClose: () => void) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const prevIsOpenRef = useRef(false);

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      setIsVisible(false);
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let rafId: number;

    if (isOpen) {
      setIsRendered(true);
      rafId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      if (!prevIsOpenRef.current) {
        SoundEffects.playModalOpen();
      }
    } else {
      setIsVisible(false);
      if (prevIsOpenRef.current) {
        SoundEffects.playModalClose();
      }
      timeoutId = setTimeout(() => setIsRendered(false), 150);
    }

    prevIsOpenRef.current = isOpen;

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (prevIsOpenRef.current) {
        SoundEffects.playModalClose();
      }
    };
  }, []);

  return { isRendered, isVisible, handleClose };
};

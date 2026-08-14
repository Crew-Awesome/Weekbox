import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

interface UseFlipOptions {
  isExiting: boolean;
  isOpen: boolean;
  sourceElement: HTMLElement | null;
  onExited?: () => void;
  duration?: number;
  ease?: string;
}

/**
 * Custom hook to handle FLIP (First, Last, Invert, Play) animations using GSAP.
 * Used primarily for morphing elements like buttons into full-screen modals.
 * 
 * @param {UseFlipOptions} options - Configuration options for the FLIP animation.
 * @returns {Object} Refs to attach to the background, content, and overlay elements.
 */
export const useFlip = ({ 
  isOpen, 
  isExiting,
  sourceElement, 
  onExited,
  duration = 0.6, 
  ease = 'expo.out'
}: UseFlipOptions) => {
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const targetMetricsRef = useRef<{ rect: DOMRect, borderRadius: string, backgroundColor: string, boxShadow: string } | null>(null);
  const sourceMetricsRef = useRef<{ rect: DOMRect, borderRadius: string, backgroundColor: string, boxShadow: string } | null>(null);
  const originalSourceRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !bgRef.current || !contentRef.current) return;

    if (sourceElement && !isExiting) {
      originalSourceRef.current = sourceElement;
      const computed = getComputedStyle(sourceElement);
      sourceMetricsRef.current = {
        rect: sourceElement.getBoundingClientRect(),
        borderRadius: computed.borderRadius || '0px',
        backgroundColor: computed.backgroundColor || 'transparent',
        boxShadow: computed.boxShadow || 'none',
      };
    }

    const sourceMetrics = sourceMetricsRef.current;
    if (!sourceMetrics) return;

    const bg = bgRef.current;
    const content = contentRef.current;
    const sourceRect = sourceMetrics.rect;
   // const sourceRadius = sourceMetrics.borderRadius;

    if (!isExiting) {
      gsap.set(bg, { clearProps: 'all' });
      const targetRect = bg.getBoundingClientRect();
      const targetComputed = getComputedStyle(bg);
      const targetRadius = targetComputed.borderRadius || '1rem';
      
      targetMetricsRef.current = { 
        rect: targetRect, 
        borderRadius: targetRadius,
        backgroundColor: targetComputed.backgroundColor,
        boxShadow: targetComputed.boxShadow
      };

      const deltaX = sourceRect.left - targetRect.left;
      const deltaY = sourceRect.top - targetRect.top;
      const scaleX = sourceRect.width / targetRect.width;
      const scaleY = sourceRect.height / targetRect.height;

      /**
       * Compensate for the scale distortion on border-radius during the FLIP transform.
       * A standard 16px radius is assumed for the source button.
       */
      const compensatedRadiusX = 16 / scaleX;
      const compensatedRadiusY = 16 / scaleY;

      gsap.set(bg, {
        x: deltaX,
        y: deltaY,
        scaleX: scaleX,
        scaleY: scaleY,
        transformOrigin: 'top left',
        borderRadius: `${compensatedRadiusX}px ${compensatedRadiusY}px`,
        backgroundColor: sourceMetrics.backgroundColor,
        boxShadow: sourceMetrics.boxShadow
      });

      gsap.set(content, { opacity: 0 });
      if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0 });
      if (sourceElement) gsap.set(sourceElement, { opacity: 0 });

      const tl = gsap.timeline();
      
      if (overlayRef.current) {
        gsap.set(overlayRef.current, { opacity: 0 });
        tl.to(overlayRef.current, {
          opacity: 1,
          duration: duration,
          ease: ease,
        }, 0);
      }

      tl.to(bg, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        borderRadius: targetRadius,
        backgroundColor: targetMetricsRef.current.backgroundColor,
        boxShadow: targetMetricsRef.current.boxShadow,
        duration: duration,
        ease: ease,
      }, 0);

      tl.to(content, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.inOut',
      }, "-=0.3");

      return () => {
        tl.kill();
      };
      
    } else {
      const exitDuration = 0.5;
      const exitEase = 'power2.inOut';

      const currentSource = originalSourceRef.current;
      /**
       * Recalculate live bounds to account for layout shifts, scrolling, or resizing
       * that may have occurred while the modal was open.
       */
      const finalSourceRect = currentSource ? currentSource.getBoundingClientRect() : sourceMetrics.rect;

      const tl = gsap.timeline({
        onComplete: () => {
          if (currentSource) {
            gsap.set(currentSource, { clearProps: 'opacity' });
          }
          if (onExited) onExited();
        }
      });

      const targetRect = targetMetricsRef.current?.rect || bg.getBoundingClientRect();
      
      const deltaX = finalSourceRect.left - targetRect.left;
      const deltaY = finalSourceRect.top - targetRect.top;
      const scaleX = finalSourceRect.width / targetRect.width;
      const scaleY = finalSourceRect.height / targetRect.height;

      // Keep source element hidden during flight to prevent ghosting
      if (currentSource) {
        gsap.set(currentSource, { opacity: 0 });
      }

      // Fade out inner content before morphing the container
      tl.to(content, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.inOut',
      }, 0);

      if (overlayRef.current) {
        tl.to(overlayRef.current, {
          opacity: 0,
          duration: exitDuration,
          ease: exitEase,
        }, 0);
      }

      const compensatedRadiusX = 16 / scaleX;
      const compensatedRadiusY = 16 / scaleY;

      // Ensure background is fully opaque and origin is set before flight
      gsap.set(bg, { opacity: 1, transformOrigin: 'top left' });

      tl.to(bg, {
        x: deltaX,
        y: deltaY,
        scaleX: scaleX,
        scaleY: scaleY,
        borderRadius: `${compensatedRadiusX}px ${compensatedRadiusY}px`,
        backgroundColor: sourceMetrics.backgroundColor,
        boxShadow: sourceMetrics.boxShadow,
        duration: exitDuration,
        ease: exitEase,
      }, 0);

      /**
       * Execute a precise crossfade during the final 150ms of the animation.
       * The modal background fades out exactly as the real source button fades in,
       * creating a seamless illusion.
       */
      tl.to(bg, {
        opacity: 0,
        duration: 0.15,
        ease: 'power1.inOut'
      }, exitDuration - 0.15);

      if (currentSource) {
        tl.to(currentSource, {
          opacity: 1,
          duration: 0.15,
          ease: 'power1.inOut'
        }, exitDuration - 0.15);
      }

      return () => {
        tl.kill();
      };
    }
  }, [isOpen, isExiting, sourceElement, duration, ease, onExited]);

  return { bgRef, contentRef, overlayRef };
};

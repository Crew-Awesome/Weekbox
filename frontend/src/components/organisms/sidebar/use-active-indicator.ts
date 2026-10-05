import React, { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useSettingsStore } from "../../../store";

interface UseActiveIndicatorProps {
  activeId: string | null;
  btnRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  indicatorRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
}

export const useActiveIndicator = ({
  activeId,
  btnRefs,
  indicatorRef,
  containerRef,
}: UseActiveIndicatorProps) => {
  const uiScale = useSettingsStore((s) => s.uiScale);
  const prevActiveIdRef = useRef<string | null>(null);

  useGSAP(
    () => {
      const updatePosition = (immediate = false) => {
        const activeBtn = activeId ? btnRefs.current[activeId] : null;
        if (activeBtn && indicatorRef.current && containerRef.current) {
          const btnRect = activeBtn.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          if (btnRect.width === 0 || btnRect.height === 0 || containerRect.width === 0) {
            return;
          }

          const xPos = btnRect.left - containerRect.left;
          const yPos = btnRect.top - containerRect.top;

          if (immediate) {
            gsap.killTweensOf(indicatorRef.current);
            gsap.set(indicatorRef.current, {
              x: xPos,
              y: yPos,
              width: btnRect.width,
              height: btnRect.height,
              opacity: 1,
              scale: 1,
            });
          } else {
            gsap.to(indicatorRef.current, {
              x: xPos,
              y: yPos,
              width: btnRect.width,
              height: btnRect.height,
              opacity: 1,
              scale: 1,
              duration: 0.45,
              ease: "elastic.out(1, 0.75)",
              overwrite: true,
            });
          }
        } else if (indicatorRef.current) {
          if (immediate) {
            gsap.killTweensOf(indicatorRef.current);
            gsap.set(indicatorRef.current, {
              opacity: 0,
              scale: 0.5,
            });
          } else {
            gsap.to(indicatorRef.current, {
              opacity: 0,
              scale: 0.5,
              duration: 0.3,
              overwrite: true,
            });
          }
        }
      };

      const isIdChange = prevActiveIdRef.current !== activeId;
      prevActiveIdRef.current = activeId;

      // Animate if active button changed; snap immediately if scaling, resizing or initial mount
      updatePosition(!isIdChange);

      // Listen for window resize in real-time
      const handleResize = () => updatePosition(true);
      window.addEventListener("resize", handleResize);

      // Listen for webfont loading completion
      if (typeof document !== "undefined" && (document as any).fonts?.ready) {
        (document as any).fonts.ready.then(() => updatePosition(true)).catch(() => {});
      }

      // Observe real-time element resizes via ResizeObserver (layout shifts, UI scaling, font-size)
      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          updatePosition(true);
        });

        if (containerRef.current) {
          ro.observe(containerRef.current);
        }
        if (typeof document !== "undefined" && document.documentElement) {
          ro.observe(document.documentElement);
        }
        const activeBtn = activeId ? btnRefs.current[activeId] : null;
        if (activeBtn) {
          ro.observe(activeBtn);
        }
      }

      // Sync on next animation frame in case refs were mounting
      const rafId = requestAnimationFrame(() => {
        updatePosition(true);
      });

      return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(rafId);
        if (ro) {
          ro.disconnect();
        }
      };
    },
    { dependencies: [activeId, uiScale], scope: containerRef },
  );
};

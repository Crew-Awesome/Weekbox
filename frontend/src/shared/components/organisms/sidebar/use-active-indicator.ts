import React, { RefObject } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

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
  useGSAP(() => {
    const updatePosition = (isResize = false) => {
      const activeBtn = activeId ? btnRefs.current[activeId] : null;
      if (activeBtn && indicatorRef.current && containerRef.current) {
        const btnRect = activeBtn.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const xPos = btnRect.left - containerRect.left;
        const yPos = btnRect.top - containerRect.top;
        
        gsap.to(indicatorRef.current, {
          x: xPos,
          y: yPos,
          width: btnRect.width,
          height: btnRect.height,
          opacity: 1,
          scale: 1,
          duration: isResize ? 0 : 0.5,
          ease: "elastic.out(1, 0.75)",
          overwrite: "auto",
        });
      } else if (indicatorRef.current) {
        gsap.to(indicatorRef.current, {
          opacity: 0,
          scale: 0.5,
          duration: isResize ? 0 : 0.3,
          overwrite: "auto",
        });
      }
    };

    updatePosition();
    const handleResize = () => updatePosition(true);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, { dependencies: [activeId], scope: containerRef });
};

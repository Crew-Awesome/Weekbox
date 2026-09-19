import React, { useRef, useState, useEffect } from "react";
import { navItems, SettingsIcon } from "./sidebar-icons";
import { useActiveIndicator } from "./use-active-indicator";

interface MobileNavProps {
  activeItem: string | null;
  setActiveItem: (id: string) => void;
  onSecondaryClick?: (id: string, el: HTMLElement | null) => void;
}

/**
 * @description Organism: Mobile Navigation.
 * Displays a floating bottom bar for mobile screens using a GSAP pill indicator.
 * Automatically slides down and hides on downward scroll, and reappears smoothly on upward scroll.
 * @param {MobileNavProps} props - Component properties.
 */
export const MobileNav: React.FC<MobileNavProps> = ({
  activeItem,
  setActiveItem,
  onSecondaryClick,
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setIsVisible(true);
  }, [activeItem]);

  useEffect(() => {
    const mainElement = document.getElementById("main-scroll-container");
    if (!mainElement) return;

    let ticking = false;
    let accumulatedDelta = 0;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = mainElement.scrollTop;
          const maxScroll = mainElement.scrollHeight - mainElement.clientHeight;

          // Ignore elastic overscroll bouncing at top/bottom (iOS / Android)
          if (currentScrollY <= 0) {
            setIsVisible(true);
            lastScrollY.current = 0;
            accumulatedDelta = 0;
            ticking = false;
            return;
          }

          if (currentScrollY >= maxScroll - 5) {
            ticking = false;
            return;
          }

          const delta = currentScrollY - lastScrollY.current;

          // Near top: always visible
          if (currentScrollY <= 40) {
            setIsVisible(true);
            lastScrollY.current = currentScrollY;
            accumulatedDelta = 0;
            ticking = false;
            return;
          }

          // Accumulate delta in same direction
          if (
            (delta > 0 && accumulatedDelta < 0) ||
            (delta < 0 && accumulatedDelta > 0)
          ) {
            accumulatedDelta = 0;
          }
          accumulatedDelta += delta;

          if (accumulatedDelta > 20) {
            setIsVisible(false);
            accumulatedDelta = 0;
          } else if (accumulatedDelta < -15) {
            setIsVisible(true);
            accumulatedDelta = 0;
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    mainElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  useActiveIndicator({
    activeId: activeItem,
    btnRefs,
    indicatorRef,
    containerRef,
  });

  return (
    <nav
      ref={containerRef}
      className={`flex md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-auto max-w-[95%] h-14 bg-[var(--wb-front-bg)]/70 backdrop-blur-xl rounded-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] items-center justify-center gap-2 z-40 px-3 transition-all duration-300 ease-in-out ${
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-24 opacity-0 pointer-events-none"
      }`}
    >
      <div
        ref={indicatorRef}
        className="absolute top-0 left-0 rounded-full bg-[var(--wb-item-active)] shadow-lg pointer-events-none"
        style={{ opacity: 0 }}
      />

      {navItems.map((item) => {
        const isActive = activeItem === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[item.id] = el;
            }}
            onClick={() => setActiveItem(item.id)}
            className={`relative flex flex-col items-center justify-center w-11 h-11 rounded-full transition-colors duration-300 group outline-none z-10 ${
              isActive
                ? "text-[var(--wb-icon-active)]"
                : "text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)]"
            }`}
          >
            <item.icon
              className={`w-5 h-5 transition-transform duration-300 ${
                isActive
                  ? "scale-110 text-[var(--wb-icon-active)]"
                  : "group-hover:scale-110 group-hover:text-[var(--wb-icon-hover)]"
              }`}
            />
          </button>
        );
      })}

      <div className="w-[1px] h-6 bg-[var(--wb-outline-variant)]/60 mx-1 z-10" />

      <button
        ref={(el) => {
          btnRefs.current["settings"] = el;
        }}
        onClick={(e) => {
          if (onSecondaryClick) {
            onSecondaryClick("settings", e.currentTarget);
          } else {
            setActiveItem("settings");
          }
        }}
        className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-300 group outline-none z-10 ${
          activeItem === "settings"
            ? "text-[var(--wb-icon-active)]"
            : "text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)]"
        }`}
      >
        <SettingsIcon
          className={`w-5 h-5 transition-transform duration-300 ${
            activeItem === "settings"
              ? "rotate-90 text-[var(--wb-icon-active)]"
              : "group-hover:rotate-90 group-hover:text-[var(--wb-icon-hover)]"
          }`}
        />
      </button>
    </nav>
  );
};

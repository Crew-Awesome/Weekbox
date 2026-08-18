import React, { useRef } from "react";
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

  useActiveIndicator({
    activeId: activeItem,
    btnRefs,
    indicatorRef,
    containerRef,
  });

  return (
    <nav
      ref={containerRef}
      className="flex md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[22rem] max-w-[95%] h-[4.5rem] bg-[var(--wb-front-bg)]/70 backdrop-blur-xl rounded-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] items-center justify-center gap-4 z-50 px-4"
    >
      {/* Active Indicator */}
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
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-full transition-colors duration-300 group outline-none z-10 ${
              isActive
                ? "text-[var(--wb-icon-active)]"
                : "text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)]"
            }`}
          >
            <item.icon
              className={`w-6 h-6 transition-transform duration-300 ${
                isActive
                  ? "scale-110 text-[var(--wb-icon-active)]"
                  : "group-hover:scale-110 group-hover:text-[var(--wb-icon-hover)]"
              }`}
            />
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-[1px] h-8 bg-white/20 mx-1 z-10" />

      {/* Settings Button */}
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
        className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-colors duration-300 group outline-none z-10 ${
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

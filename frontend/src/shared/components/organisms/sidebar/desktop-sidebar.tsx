import React, { useRef } from 'react';
import launcherIcon from "/assets/icons/app/launcher-icon.png";
import { navItems, InfoIcon, SettingsIcon } from './sidebar-icons';
import { useActiveIndicator } from './use-active-indicator';

interface DesktopSidebarProps {
  activeMain: string;
  setActiveMain: (id: string) => void;
  activeSecondary: string | null;
  setActiveSecondary: (id: string | null) => void;
  onSecondaryClick?: (id: string, el: HTMLElement | null) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeMain, setActiveMain, activeSecondary, setActiveSecondary, onSecondaryClick }) => {
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useActiveIndicator({
    activeId: activeMain,
    btnRefs,
    indicatorRef,
    containerRef: navRef,
  });

  return (
    <aside className="hidden md:block relative w-32 h-full drop-shadow-2xl">
        {/* SEGUNDA PARTE (z-index 10) - Toggles */}
        <div className="absolute inset-y-0 left-0 right-6 bg-[var(--wb-back-bg)] rounded-tr-[16px] rounded-br-[16px] z-10 flex flex-col justify-end items-end pb-6 pr-3">
          <div className="flex flex-col space-y-4">
            <button
              onClick={(e) => {
                if (onSecondaryClick) {
                  onSecondaryClick('info', e.currentTarget);
                } else {
                  setActiveSecondary(activeSecondary === "info" ? null : "info");
                }
              }}
              title="Info"
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 group outline-none ${
                activeSecondary === "info"
                  ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]"
                  : "bg-transparent text-[var(--wb-icon-default)] hover:bg-[var(--wb-item-hover)] hover:text-[var(--wb-icon-hover)]"
              }`}
            >
              <InfoIcon className={`w-6 h-6 transition-transform duration-300 ${activeSecondary === "info" ? "text-[var(--wb-icon-active)]" : "group-hover:scale-110 group-hover:text-[var(--wb-icon-hover)]"}`} />
            </button>

            <button
              onClick={(e) => {
                if (onSecondaryClick) {
                  onSecondaryClick('settings', e.currentTarget);
                } else {
                  setActiveSecondary(activeSecondary === "settings" ? null : "settings");
                }
              }}
              title="Settings"
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 group outline-none ${
                activeSecondary === "settings"
                  ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]"
                  : "bg-transparent text-[var(--wb-icon-default)] hover:bg-[var(--wb-item-hover)] hover:text-[var(--wb-icon-hover)]"
              }`}
            >
              <SettingsIcon className={`w-6 h-6 transition-transform duration-300 ${activeSecondary === "settings" ? "rotate-90 text-[var(--wb-icon-active)]" : "group-hover:rotate-90 group-hover:text-[var(--wb-icon-hover)]"}`} />
            </button>
          </div>
        </div>

        {/* PRIMERA PARTE (z-index 20) - Radio Group */}
        <div className="absolute inset-0 z-20 flex flex-col pointer-events-none drop-shadow-[4px_0_8px_rgba(0,0,0,0.6)]">
          <div className="w-32 bg-[var(--wb-front-bg)] rounded-tr-[16px] flex flex-col items-center pt-8 pb-4 pointer-events-auto">
            <div className="flex items-center justify-center mb-8 w-full relative z-20 px-2">
              <img src={launcherIcon} alt="Weekbox" className="w-full h-auto object-contain drop-shadow-md" />
            </div>
            <nav ref={navRef} className="flex flex-col items-center w-full space-y-4 relative">
              {/* GSAP Indicator */}
              <div 
                ref={indicatorRef} 
                className="absolute top-0 left-0 rounded-2xl bg-[var(--wb-item-active)] pointer-events-none"
                style={{ opacity: 0 }}
              />

              {navItems.map((item) => {
                const isActive = activeMain === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => { btnRefs.current[item.id] = el; }}
                    onClick={() => setActiveMain(item.id)}
                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-colors duration-300 group outline-none relative z-10 ${
                      isActive ? "text-[var(--wb-icon-active)]" : "text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)]"
                    }`}
                  >
                    <item.icon className={`w-8 h-8 mb-1 transition-transform duration-300 ${isActive ? "text-[var(--wb-icon-active)]" : "group-hover:scale-110 group-hover:text-[var(--wb-icon-hover)]"}`} />
                    <span className="font-medium text-xs">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="w-32 h-20 pointer-events-auto relative -mt-[1px]">
            <svg viewBox="0 0 80 64" fill="none" preserveAspectRatio="none" className="block w-full h-full">
              <path d="M 80 0 C 80 32 20 32 20 64 L 0 64 L 0 0 Z" fill="var(--wb-front-bg)" />
            </svg>
          </div>
          <div className="w-8 flex-1 bg-[var(--wb-front-bg)] rounded-br-[16px] pointer-events-auto -mt-[1px]"></div>
        </div>
      </aside>
  );
};

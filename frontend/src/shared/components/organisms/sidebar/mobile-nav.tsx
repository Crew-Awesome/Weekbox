import React, { useRef } from 'react';
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { navItems, SettingsIcon } from './sidebar-icons';

interface MobileNavProps {
  activeItem: string;
  setActiveItem: (id: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeItem, setActiveItem }) => {
  const containerRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useGSAP(() => {
    const activeBtn = btnRefs.current[activeItem];
    if (activeBtn && indicatorRef.current && containerRef.current) {
      const btnRect = activeBtn.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const indicatorWidth = indicatorRef.current.offsetWidth || 56;
      
      // Calculate exactly where the center of the button is relative to the container
      const xPos = btnRect.left - containerRect.left + (btnRect.width / 2) - (indicatorWidth / 2);
      
      gsap.to(indicatorRef.current, {
        x: xPos,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.75)",
      });
    } else if (indicatorRef.current) {
      gsap.to(indicatorRef.current, {
        opacity: 0,
        scale: 0.5,
        duration: 0.3,
      });
    }
  }, { dependencies: [activeItem], scope: containerRef });

  return (
    <nav 
      ref={containerRef}
      className="flex md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[22rem] max-w-[95%] h-[4.5rem] bg-[#090f10]/70 backdrop-blur-xl rounded-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] items-center justify-evenly z-50 border border-white/10 px-4"
    >
      {/* Indicador animado GSAP */}
      <div 
        ref={indicatorRef}
        className="absolute top-1/2 -translate-y-1/2 left-0 w-14 h-14 rounded-full bg-[var(--wb-item-active)] shadow-lg pointer-events-none"
        style={{ opacity: 0 }}
      />

      {navItems.map((item) => {
        const isActive = activeItem === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => { btnRefs.current[item.id] = el; }}
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
      
      {/* Separador */}
      <div className="w-[1px] h-8 bg-white/20 mx-1 z-10" />
      
      {/* Botón de configuración */}
      <button
        ref={(el) => { btnRefs.current['settings'] = el; }}
        onClick={() => setActiveItem('settings')}
        className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-colors duration-300 group outline-none z-10 ${
          activeItem === 'settings'
            ? "text-[var(--wb-icon-active)]"
            : "text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)]"
        }`}
      >
        <SettingsIcon
          className={`w-5 h-5 transition-transform duration-300 ${
            activeItem === 'settings'
              ? "rotate-90 text-[var(--wb-icon-active)]"
              : "group-hover:rotate-90 group-hover:text-[var(--wb-icon-hover)]"
          }`}
        />
      </button>
    </nav>
  );
};

import React, { useState } from "react";
import launcherIcon from "../../../../assets/icons/app/launcher-icon.png";

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const LibraryIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m16 6 4 14" />
    <path d="M12 6v14" />
    <path d="M8 8v12" />
    <path d="M4 4v16" />
  </svg>
);

const ExploreIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

/**
 * @description Organismo Sidebar (Barra Lateral).
 * Maneja la navegación principal de la aplicación y agrupa las acciones globales
 * (Inicio, Biblioteca, Explorar) en una interfaz interactiva y animada.
 * Utiliza SVG para crear la rampita y tiene dos niveles de profundidad
 * para tener elementos de configuración en un bloque visualmente separado.
 * 
 * @returns {React.FC} El componente funcional de la barra lateral.
 */
export const Sidebar: React.FC = () => {
  const [activeItem, setActiveItem] = useState("home");

  const navItems = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "library", label: "Library", icon: LibraryIcon },
    { id: "explore", label: "Explore", icon: ExploreIcon },
  ];

  return (
    <>
      {/* SIDEBAR DE ESCRITORIO (Oculto en móvil) */}
      <aside className="hidden md:block relative w-20 h-full drop-shadow-2xl">
        {/* SEGUNDA PARTE (z-index 10) */}
        <div className="absolute inset-y-0 left-0 right-1 bg-[var(--wb-back-bg)] rounded-tr-[16px] rounded-br-[16px] z-10 flex flex-col justify-end items-center pb-6 pl-[28px]">
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => setActiveItem("info")}
              title="Info"
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 group outline-none ${
                activeItem === "info"
                  ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]"
                  : "text-[var(--wb-icon-default)] hover:bg-[var(--wb-item-hover)] hover:text-[var(--wb-icon-hover)]"
              }`}
            >
              <InfoIcon className={`w-5 h-5 transition-transform duration-300 ${activeItem === "info" ? "text-[var(--wb-icon-active)]" : "group-hover:scale-110 group-hover:text-[var(--wb-icon-hover)]"}`} />
            </button>

            <button
              onClick={() => setActiveItem("settings")}
              title="Settings"
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 group outline-none ${
                activeItem === "settings"
                  ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]"
                  : "text-[var(--wb-icon-default)] hover:bg-[var(--wb-item-hover)] hover:text-[var(--wb-icon-hover)]"
              }`}
            >
              <SettingsIcon className={`w-5 h-5 transition-transform duration-300 ${activeItem === "settings" ? "rotate-90 text-[var(--wb-icon-active)]" : "group-hover:rotate-90 group-hover:text-[var(--wb-icon-hover)]"}`} />
            </button>
          </div>
        </div>

        {/* PRIMERA PARTE (z-index 20) */}
        <div className="absolute inset-0 z-20 flex flex-col pointer-events-none drop-shadow-[4px_0_8px_rgba(0,0,0,0.6)]">
          <div className="w-20 bg-[var(--wb-front-bg)] rounded-tr-[16px] flex flex-col items-center pt-6 pb-2 pointer-events-auto">
            <div className="flex items-center justify-center mb-8 w-full relative z-20 px-2">
              <img src={launcherIcon} alt="Weekbox" className="w-full h-auto object-contain drop-shadow-md" />
            </div>
            <nav className="flex flex-col items-center w-full space-y-4">
              {navItems.map((item) => {
                const isActive = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveItem(item.id)}
                    className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 group outline-none relative ${
                      isActive ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]" : "text-[var(--wb-icon-default)] hover:bg-[var(--wb-item-hover)] hover:text-[var(--wb-icon-hover)]"
                    }`}
                  >
                    <item.icon className={`w-6 h-6 mb-1 transition-transform duration-300 ${isActive ? "text-[var(--wb-icon-active)]" : "group-hover:scale-110 group-hover:text-[var(--wb-icon-hover)]"}`} />
                    <span className="font-medium text-[10px]">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="w-20 h-16 pointer-events-auto relative -mt-[1px]">
            <svg width="80" height="64" viewBox="0 0 80 64" fill="none" preserveAspectRatio="none" className="block">
              <path d="M 80 0 C 80 5 78 7 75 10 L 33 54 C 30 57 28 59 28 64 L 0 64 L 0 0 Z" fill="var(--wb-front-bg)" />
            </svg>
          </div>
          <div className="w-7 flex-1 bg-[var(--wb-front-bg)] rounded-br-[16px] pointer-events-auto -mt-[1px]"></div>
        </div>
      </aside>

      {/* PÍLDORA INFERIOR MÓVIL (Visible solo en móvil) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-[68px] bg-[var(--wb-front-bg)] rounded-[34px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-evenly z-20 border border-white/5 px-2">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 group outline-none ${
                isActive
                  ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]"
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
        <div className="w-[1px] h-8 bg-white/10 mx-1" />
        
        {/* Botón de configuración */}
        <button
          onClick={() => setActiveItem('settings')}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group outline-none ${
            activeItem === 'settings'
              ? "bg-[var(--wb-item-active)] text-[var(--wb-icon-active)]"
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
    </>
  );
};

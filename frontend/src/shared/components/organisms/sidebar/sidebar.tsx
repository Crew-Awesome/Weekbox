import React, { useState } from "react";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileNav } from "./mobile-nav";

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
  const [activeMain, setActiveMain] = useState("home");
  const [activeSecondary, setActiveSecondary] = useState<string | null>(null);

  const handleMobileSet = (id: string) => {
    if (id === 'settings' || id === 'info') {
      setActiveSecondary(prev => prev === id ? null : id);
    } else {
      setActiveMain(id);
      setActiveSecondary(null);
    }
  };

  return (
    <>
      <DesktopSidebar 
        activeMain={activeMain} 
        setActiveMain={setActiveMain} 
        activeSecondary={activeSecondary} 
        setActiveSecondary={setActiveSecondary} 
      />
      <MobileNav 
        activeItem={activeSecondary || activeMain} 
        setActiveItem={handleMobileSet} 
      />
    </>
  );
};

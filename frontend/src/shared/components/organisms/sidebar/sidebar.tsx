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
  const [activeItem, setActiveItem] = useState("home");

  return (
    <>
      <DesktopSidebar activeItem={activeItem} setActiveItem={setActiveItem} />
      <MobileNav activeItem={activeItem} setActiveItem={setActiveItem} />
    </>
  );
};

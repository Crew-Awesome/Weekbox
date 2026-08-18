import React, { useState, useEffect } from "react";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileNav } from "./mobile-nav";
import { SidebarModals } from "./modals/sidebar-modals";
import Utils from "@utils";

interface SidebarProps {
  onNavigate?: (view: string) => void;
  onSecondaryClick?: (id: string, el: HTMLElement | null) => void;
}

/**
 * Sidebar Organism.
 * Handles primary application navigation and groups global actions
 * into an interactive interface.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  onSecondaryClick,
}) => {
  const [activeMain, setActiveMain] = useState("home");
  const [activeSecondary, setActiveSecondary] = useState<string | null>(null);

  const { morphModalData, openMorphModal, closeMorphModal } =
    Utils.hooks.useModals();

  useEffect(() => {
    if (onNavigate) {
      onNavigate(activeMain);
    }
  }, [activeMain, onNavigate]);

  const handleMobileSet = (id: string) => {
    if (id === "settings" || id === "info") {
      setActiveSecondary((prev) => (prev === id ? null : id));
    } else {
      setActiveMain(id);
      setActiveSecondary(null);
    }
  };

  const handleSecondaryClick = onSecondaryClick || openMorphModal;

  return (
    <>
      <DesktopSidebar
        activeMain={activeMain}
        setActiveMain={setActiveMain}
        activeSecondary={activeSecondary}
        setActiveSecondary={setActiveSecondary}
        onSecondaryClick={handleSecondaryClick}
      />
      <MobileNav
        activeItem={activeSecondary || activeMain}
        setActiveItem={handleMobileSet}
        onSecondaryClick={handleSecondaryClick}
      />

      <SidebarModals
        morphModalData={morphModalData}
        closeMorphModal={closeMorphModal}
      />
    </>
  );
};

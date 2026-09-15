import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileNav } from "./mobile-nav";
import { SidebarModals } from "./modals/sidebar-modals";
import Utils from "@utils";
import { useHomeStore } from "../../../store/home-store";

interface SidebarProps {
  onNavigate?: (view: string) => void;
  onSecondaryClick?: (id: string, el: HTMLElement | null) => void;
}

/**
 * Organism: Sidebar.
 * Handles primary application navigation and groups global actions
 * into an interactive interface, delegating responsive UI to Desktop/Mobile counterparts.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  onSecondaryClick,
}) => {
  const location = useLocation();
  const pathView = location.pathname.substring(1).split("/")[0] || "home";

  const [activeMain, setActiveMain] = useState(pathView);
  const [activeSecondary, setActiveSecondary] = useState<string | null>(null);

  const { morphModalData, openMorphModal, closeMorphModal } =
    Utils.hooks.useModals();

  useEffect(() => {
    setActiveMain(pathView);
  }, [pathView]);

  useEffect(() => {
    if (onNavigate && activeMain !== pathView) {
      onNavigate(activeMain);
    }
  }, [activeMain, onNavigate, pathView]);

  const handleMainSet = (id: string) => {
    if (activeMain === "home" && id === "home") {
      useHomeStore.getState().resetState();
      const mainContainer = document.getElementById("main-scroll-container");
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
    }
    setActiveMain(id);
  };

  const handleMobileSet = (id: string) => {
    if (id === "settings" || id === "info") {
      if (morphModalData?.id === id) {
        closeMorphModal();
        setActiveSecondary(null);
      } else {
        openMorphModal(id, null);
        setActiveSecondary(id);
      }
    } else {
      handleMainSet(id);
      setActiveSecondary(null);
    }
  };

  const handleSecondaryClick = (id: string, el: HTMLElement | null) => {
    if (onSecondaryClick) {
      onSecondaryClick(id, el);
    } else if (morphModalData?.id === id) {
      closeMorphModal();
      setActiveSecondary(null);
    } else {
      openMorphModal(id, el);
      setActiveSecondary(id);
    }
  };

  const handleCloseMorphModal = () => {
    closeMorphModal();
    setActiveSecondary(null);
  };

  return (
    <>
      <DesktopSidebar
        activeMain={activeMain}
        setActiveMain={handleMainSet}
        activeSecondary={morphModalData?.id || activeSecondary}
        setActiveSecondary={setActiveSecondary}
        onSecondaryClick={handleSecondaryClick}
      />
      <MobileNav
        activeItem={morphModalData?.id || activeSecondary || activeMain}
        setActiveItem={handleMobileSet}
        onSecondaryClick={handleSecondaryClick}
      />

      <SidebarModals
        morphModalData={morphModalData}
        closeMorphModal={handleCloseMorphModal}
      />
    </>
  );
};

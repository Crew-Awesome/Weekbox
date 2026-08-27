import React, { type ReactNode } from "react";
import Shared from "@shared";
import { LoadingScreen, type LoadingTask } from "./loading/loading-screen";
import Utils from "@utils";

interface LayoutProps {
  children?: ReactNode;
  loadingTasks?: LoadingTask[];
}

export const Layout: React.FC<LayoutProps> = ({ children, loadingTasks }) => {
  const { setCurrentView, renderView } = Utils.hooks.useViews("home");

  // Activa el atrapador de deeplinks en background
  Utils.hooks.useDeeplinkManager();

  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      <LoadingScreen tasks={loadingTasks} />
      <Shared.organisms.Sidebar onNavigate={setCurrentView} />
      <main
        id="main-scroll-container"
        className="flex-1 overflow-y-auto relative mobile-no-scrollbar"
      >
        <div className="relative z-10 px-8 pt-8 pb-28 md:p-8 h-full">
          {renderView(children)}
        </div>
      </main>
    </div>
  );
};

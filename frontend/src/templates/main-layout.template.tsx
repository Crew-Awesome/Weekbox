import React from "react";
import { Sidebar } from "../components/organisms/sidebar/sidebar";
import { ToastContainer } from "../components/molecules/toast-container";
import { LoadingScreen, type LoadingTask } from "../components/organisms/loading-screen/loading-screen";

export interface MainLayoutTemplateProps {
  tasks?: LoadingTask[];
  onNavigate?: (path: string) => void;
  children?: React.ReactNode;
}

/**
 * Reusable layout template for WeekBox pages (Atomic Design - Template level).
 * Renders the global navigation sidebar, notifications, loading layer, and page container slot.
 */
export const MainLayoutTemplate: React.FC<MainLayoutTemplateProps> = ({
  tasks,
  onNavigate,
  children,
}) => {
  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      {tasks && <LoadingScreen tasks={tasks} />}
      <ToastContainer />
      <Sidebar onNavigate={onNavigate} />
      <main
        id="main-scroll-container"
        className="flex-1 overflow-y-auto relative mobile-no-scrollbar"
      >
        <div className="relative z-10 px-8 pt-8 pb-28 md:p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayoutTemplate;

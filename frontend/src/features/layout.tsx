import React, { useState, type ReactNode } from 'react';
import Shared from '@shared';
import Features, { type LoadingTask } from '@features';

interface LayoutProps {
  children?: ReactNode;
  loadingTasks?: LoadingTask[];
}

export const Layout: React.FC<LayoutProps> = ({ children, loadingTasks }) => {
  const [currentView, setCurrentView] = useState("home");

  const renderView = () => {
    if (children) return children;
    
    switch (currentView) {
      case "home":
        return <Features.Home />;
      case "library":
        return <div className="text-white text-center mt-20 text-2xl font-bold">Library View (WIP)</div>;
      case "explore":
        return <div className="text-white text-center mt-20 text-2xl font-bold">Explore View (WIP)</div>;
      default:
        return <Features.Home />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      <Features.LoadingScreen tasks={loadingTasks} />
      <Shared.organisms.Sidebar onNavigate={setCurrentView} />
      <main className="flex-1 overflow-y-auto relative mobile-no-scrollbar">
        <div className="relative z-10 px-8 pt-8 pb-28 md:p-8 h-full">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

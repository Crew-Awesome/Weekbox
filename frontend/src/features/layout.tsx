import React, { type ReactNode } from 'react';
import Shared from '@shared';
import Features, { type LoadingTask } from '@features';
import Utils from '@utils';


interface LayoutProps {
  children?: ReactNode;
  loadingTasks?: LoadingTask[];
}

export const Layout: React.FC<LayoutProps> = ({ children, loadingTasks }) => {
  const { currentView, setCurrentView, RenderView } = Utils.hooks.useViews("home");

  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      <Features.LoadingScreen tasks={loadingTasks} />
      <Shared.organisms.Sidebar 
        onNavigate={setCurrentView} 
      />
      <main className="flex-1 overflow-y-auto relative mobile-no-scrollbar">
        <div className="relative z-10 px-8 pt-8 pb-28 md:p-8 h-full">
          <RenderView>{children}</RenderView>
        </div>
      </main>

      <Shared.molecules.ModalsFallback />
    </div>
  );
};

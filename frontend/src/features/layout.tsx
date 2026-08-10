import React, { type ReactNode } from 'react';
import Shared from '@shared';
import { LoadingScreen, type LoadingTask } from './loading/loading-screen';

interface LayoutProps {
  children: ReactNode;
  loadingTasks?: LoadingTask[];
}

export const Layout: React.FC<LayoutProps> = ({ children, loadingTasks }) => {
  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      <LoadingScreen tasks={loadingTasks} />
      <Shared.organisms.Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="relative z-10 px-8 pt-8 pb-28 md:p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

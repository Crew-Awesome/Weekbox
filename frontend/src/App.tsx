import React from "react";
import Features from "@features";
import Core from "@core";
import Shared from "@shared";
import Utils from "@utils";
import type { LoadingTask } from "@features";
import { Outlet } from "react-router-dom";

// Moved outside the component to keep the reference stable across renders.
// This prevents the LoadingScreen's useEffect from re-triggering unnecessarily.
const initTasks: LoadingTask[] = [
  {
    name: "Initializing environment...",
    action: async () => {
      try {
        await Core.os.syncProtocolRegistration(true);
      } catch (e) {
        console.warn("Error en la inicialización nativa:", e);
      }
    },
  },
  {
    name: "Obtaining Featured Mods...",
    action: async () => {
      await Core.services.gamebanana.getMods("ripe", 1, 15);
    },
  },
  {
    name: "Obtaining Gamebanana Mods...",
    action: async () => {
      await Core.services.gamebanana.getMods("popular", 1, 15);
    },
  },
];

function App() {
  const handleNavigate = Utils.hooks.useAppNavigation();

  // Activates background deep-link catcher
  Utils.hooks.useDeeplinkManager();

  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      <Features.LoadingScreen tasks={initTasks} />
      <Shared.organisms.Sidebar onNavigate={handleNavigate} />
      <main
        id="main-scroll-container"
        className="flex-1 overflow-y-auto relative mobile-no-scrollbar"
      >
        <div className="relative z-10 px-8 pt-8 pb-28 md:p-8 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default App;

import { useEffect } from "react";
import Features from "@features";
import Core from "@core";
import Shared from "@shared";
import Utils from "@utils";
import type { LoadingTask } from "@features";
import { Outlet, useLocation } from "react-router-dom";
import { useHomeStore } from "./store/home-store";
import { useDownloadStore } from "./store";

const initTasks: LoadingTask[] = [
  {
    name: "Initializing environment...",
    timeoutMs: 10000,
    retries: 1,
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
    retryName: "Retrying to obtain featured mods",
    timeoutMs: 18000,
    retries: 3,
    action: async () => {
      const featured = await Core.services.gamebanana.getFeaturedMods();
      if (featured && featured.length > 0) {
        const pool = featured.map((mod) => ({
          ...mod,
          __isCommunityPick: true,
          __featuredLabel: mod.__featuredLabel || "Featured",
        })) as any;
        useHomeStore.getState().setFeaturedPool(pool);
      }
    },
    onAttemptComplete: async () => {
      if (useHomeStore.getState().featuredPool.length === 0) {
        try {
          const featured = await Core.services.gamebanana.getFeaturedMods();
          if (featured && featured.length > 0) {
            useHomeStore.getState().setFeaturedPool(
              featured.map((mod) => ({
                ...mod,
                __isCommunityPick: true,
                __featuredLabel: mod.__featuredLabel || "Featured",
              })) as any,
            );
          }
        } catch {}
      }
    },
  },
  {
    name: "Obtaining Gamebanana Mods...",
    retryName: "Retrying to obtain GameBanana mods",
    timeoutMs: 30000,
    retries: 3,
    action: async () => {
      const mods = await Core.services.gamebanana.getMods("popular", 1, 45);
      if (mods && mods.length > 0) {
        useHomeStore.getState().setMods(mods);
      }
    },
    onAttemptComplete: async (attempt, success) => {
      const currentMods = useHomeStore.getState().mods;
      if (currentMods.length === 0) {
        try {
          const fallback = await Core.services.gamebanana.getMods("popular", 1, 15);
          if (fallback && fallback.length > 0) {
            useHomeStore.getState().setMods(fallback);
          }
        } catch (e) {
          console.warn(`[App initTasks] Attempt ${attempt} (success=${success}) fallback could not fetch mods:`, e);
        }
      }
    },
  },
];

function App() {
  const handleNavigate = Utils.hooks.useAppNavigation();
  const location = useLocation();

  Utils.hooks.useDeeplinkManager();

  useEffect(() => {
    useDownloadStore.getState().setCurrentRoute(location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-[var(--wb-bg)] text-[var(--wb-text-main)] overflow-hidden font-sans relative">
      <Features.LoadingScreen tasks={initTasks} />
      <Shared.molecules.ToastContainer />
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


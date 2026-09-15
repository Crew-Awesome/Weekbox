import { useEffect } from "react";
import Core from "@core";
import Utils from "@utils";
import { MainLayoutTemplate } from "@templates";
import type { LoadingTask } from "@components";
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
    onAttemptComplete: async (attempt: number, success: boolean) => {
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
    <MainLayoutTemplate tasks={initTasks} onNavigate={handleNavigate}>
      <Outlet />
    </MainLayoutTemplate>
  );
}

export default App;

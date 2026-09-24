import { useEffect } from "react";
import Core, { ServicesProvider } from "@core";
import Utils from "@utils";
import { MainLayoutTemplate } from "@templates";
import type { LoadingTask } from "@components";
import { Outlet, useLocation } from "react-router-dom";
import { useHomeStore } from "./store/home-store";
import { useDownloadStore } from "./store";
import { useTheme } from "./components/organisms/settings-modal/hooks/use-theme";

const initTasks: LoadingTask[] = [
  {
    name: "Initializing environment...",
    timeoutMs: 4000,
    retries: 0,
    action: async () => {
      try {
        await Core.os.syncProtocolRegistration(true);
      } catch (e) {
        console.warn("Error en la inicialización nativa:", e);
      }
      try {
        await Utils.hooks.checkNetworkConnectivity();
      } catch {}
    },
  },
  {
    name: "Obtaining Featured Mods...",
    retryName: "Retrying to obtain featured mods",
    timeoutMs: 6000,
    retries: 1,
    action: async () => {
      if (!Utils.hooks.useNetworkStore.getState().isOnline) {
        return;
      }
      try {
        const featured = await Core.services.gamebanana.getFeaturedMods();
        if (featured && featured.length > 0) {
          const pool = featured.map((mod) => ({
            ...mod,
            __isCommunityPick: true,
            __featuredLabel: mod.__featuredLabel || "Featured",
          })) as any;
          useHomeStore.getState().setFeaturedPool(pool);
        }
      } catch (e) {
        console.warn("[App] Could not load featured mods on startup:", e);
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          Utils.hooks.setNetworkOnline(false);
        }
      }
    },
    onAttemptComplete: async () => {
      if (!Utils.hooks.useNetworkStore.getState().isOnline) {
        return;
      }
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
    timeoutMs: 6000,
    retries: 1,
    action: async () => {
      if (!Utils.hooks.useNetworkStore.getState().isOnline) {
        return;
      }
      try {
        const mods = await Core.services.gamebanana.getMods("popular", 1, 30);
        if (mods && mods.length > 0) {
          useHomeStore.getState().setMods(mods);
        }
      } catch (e) {
        console.warn("[App] Could not load initial popular mods:", e);
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          Utils.hooks.setNetworkOnline(false);
        }
      }
    },
    onAttemptComplete: async (attempt: number, success: boolean) => {
      if (!Utils.hooks.useNetworkStore.getState().isOnline || success) {
        return;
      }
      if (attempt >= 1) {
        const currentMods = useHomeStore.getState().mods;
        if (currentMods.length === 0) {
          try {
            const fallbackPromise = Core.services.gamebanana.getMods("popular", 1, 15);
            const fallback = await Promise.race([
              fallbackPromise,
              new Promise<any[]>((_, reject) =>
                setTimeout(() => reject(new Error("Fallback timeout")), 3000),
              ),
            ]);
            if (fallback && fallback.length > 0) {
              useHomeStore.getState().setMods(fallback);
            }
          } catch (e) {
            console.warn(`[App initTasks] Attempt ${attempt} fallback could not fetch mods:`, e);
          }
        }
      }
    },
  },
];

function App() {
  useTheme();
  const handleNavigate = Utils.hooks.useAppNavigation();
  const location = useLocation();

  Utils.hooks.useDeeplinkManager();

  useEffect(() => {
    useDownloadStore.getState().setCurrentRoute(location.pathname);
  }, [location.pathname]);

  return (
    <ServicesProvider>
      <MainLayoutTemplate tasks={initTasks} onNavigate={handleNavigate}>
        <Outlet />
      </MainLayoutTemplate>
    </ServicesProvider>
  );
}

export default App;

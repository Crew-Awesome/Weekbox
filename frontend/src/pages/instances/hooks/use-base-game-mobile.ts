import { useState, useEffect, useMemo, useCallback } from "react";
import Core, { platform, CapacitorAppLauncher } from "@core";
import { App } from "@capacitor/app";

export const VSLICE_PLAYSTORE_SCREENSHOTS = [
  "/assets/images/carousel-base/base-game-preview (1).webp",
  "/assets/images/carousel-base/base-game-preview (2).webp",
  "/assets/images/carousel-base/base-game-preview (3).webp",
  "/assets/images/carousel-base/base-game-preview (4).webp",
  "/assets/images/carousel-base/base-game-preview (5).webp",
  "/assets/images/carousel-base/base-game-preview (6).webp",
  "/assets/images/carousel-base/base-game-preview (7).webp",
  "/assets/images/carousel-base/base-game-preview (8).webp",
];

export function useBaseGameMobile(selectedCategory: string) {
  const isCapacitor = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      platform.platformName === "capacitor" ||
      Core.isMobilePlatform()
    );
  }, []);

  const isBaseGameMobile = useMemo(() => {
    return isCapacitor && selectedCategory.toLowerCase() === "vslice";
  }, [isCapacitor, selectedCategory]);

  const [isBaseGameInstalled, setIsBaseGameInstalled] = useState<boolean>(false);

  const checkBaseGameStatus = useCallback(async () => {
    if (!isBaseGameMobile) return;
    try {
      const installed = await CapacitorAppLauncher.isBaseGameInstalled();
      setIsBaseGameInstalled(installed);
    } catch {
      setIsBaseGameInstalled(false);
    }
  }, [isBaseGameMobile]);

  useEffect(() => {
    checkBaseGameStatus();
    const handleFocus = () => {
      checkBaseGameStatus();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    let resumeListener: { remove: () => Promise<void> } | null = null;
    let stateListener: { remove: () => Promise<void> } | null = null;

    App.addListener("resume", () => {
      checkBaseGameStatus();
    })
      .then((handle) => {
        resumeListener = handle;
      })
      .catch(() => {});

    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        checkBaseGameStatus();
      }
    })
      .then((handle) => {
        stateListener = handle;
      })
      .catch(() => {});

    const unsubscribePackage = CapacitorAppLauncher.addPackageListener(() => {
      checkBaseGameStatus();
    });

    const intervalId = setInterval(() => {
      checkBaseGameStatus();
    }, 2000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      resumeListener?.remove();
      stateListener?.remove();
      unsubscribePackage();
      clearInterval(intervalId);
    };
  }, [checkBaseGameStatus]);

  return {
    isCapacitor,
    isBaseGameMobile,
    isBaseGameInstalled,
    checkBaseGameStatus,
  };
}

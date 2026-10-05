import { useState, useEffect, useMemo, useCallback } from "react";
import Core from "@core";

export function useInstalledEngines(selectedCategory: string) {
  const [installedEngineMap, setInstalledEngineMap] = useState<Record<string, boolean>>({});
  const [installedEnginesRegistry, setInstalledEnginesRegistry] = useState<
    Record<string, Record<string, any>>
  >({});

  /** List of installed versions for the selected category */
  const installedVersionsForCategory = useMemo(() => {
    const catData = installedEnginesRegistry[selectedCategory.toLowerCase()];
    if (!catData) return [];
    return Object.keys(catData);
  }, [installedEnginesRegistry, selectedCategory]);

  /** Load installed engine registry */
  const loadInstalledEngines = useCallback(async () => {
    if (!Core.platform.getInstalledEngines) return;
    try {
      const reg = await Core.platform.getInstalledEngines();
      setInstalledEnginesRegistry(reg || {});
    } catch {
      setInstalledEnginesRegistry({});
    }
  }, []);

  useEffect(() => {
    loadInstalledEngines();

    const handleEnginesChanged = () => {
      loadInstalledEngines();
    };

    window.addEventListener("wb:engines-changed", handleEnginesChanged);
    const unsubPlatform = Core.platform.onEvent("engines:changed", handleEnginesChanged);
    const unsubReady = Core.platform.onEvent("ready", handleEnginesChanged);

    return () => {
      window.removeEventListener("wb:engines-changed", handleEnginesChanged);
      unsubPlatform();
      unsubReady();
    };
  }, [loadInstalledEngines]);

  return {
    installedEnginesRegistry,
    setInstalledEnginesRegistry,
    installedVersionsForCategory,
    installedEngineMap,
    setInstalledEngineMap,
    loadInstalledEngines,
  };
}

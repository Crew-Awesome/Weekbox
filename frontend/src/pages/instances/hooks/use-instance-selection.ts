import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Core, { platform } from "@core";
import { ENGINE_CATEGORIES } from "../../../core/services/gamebanana/constants";
import type { InstanceSortOption } from "../components/instances-topbar";
import { useEngineDownloadStore } from "../../../store";

const INSTANCES_CATEGORY_STORAGE_KEY = "wb_instances_category";
const INSTANCES_SORT_STORAGE_KEY = "wb_instances_sort";
const INSTANCES_ONLY_INSTALLED_STORAGE_KEY = "wb_instances_only_installed";

export function loadSavedInstancesCategory(): string {
  if (typeof window === "undefined") return "vslice";
  try {
    const raw = localStorage.getItem(INSTANCES_CATEGORY_STORAGE_KEY);
    if (raw && typeof raw === "string") {
      const trimmed = raw.trim().toLowerCase();
      const isValid = Object.values(ENGINE_CATEGORIES).some(
        (c) => c.id.toLowerCase() === trimmed
      );
      if (isValid) return trimmed;
    }
  } catch (e) {
    console.warn("Could not load instances category from storage:", e);
  }
  return "vslice";
}

export function loadSavedInstancesSort(): InstanceSortOption {
  if (typeof window === "undefined") return "newest";
  try {
    const raw = localStorage.getItem(INSTANCES_SORT_STORAGE_KEY);
    if (raw && ["newest", "oldest", "version", "date"].includes(raw)) {
      return raw as InstanceSortOption;
    }
  } catch (e) {
    console.warn("Could not load instances sort from storage:", e);
  }
  return "newest";
}

export function loadSavedInstancesOnlyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(INSTANCES_ONLY_INSTALLED_STORAGE_KEY);
    if (raw !== null) {
      return raw === "true";
    }
  } catch (e) {
    console.warn("Could not load instances onlyInstalled from storage:", e);
  }
  return false;
}

interface UseInstanceSelectionProps {
  selectedVersion: string;
  setSelectedVersion: (ver: string) => void;
  selectedMod: any;
  selectedModId: string | null;
  setSelectedModId: (id: string | null) => void;
  isExecutable: boolean;
}

/**
 * Manages category selection, sorting, onlyInstalled filters,
 * persistence in localStorage, and synchronization with react-router and document.title.
 */
export function useInstanceSelection({
  selectedVersion,
  setSelectedVersion,
  selectedMod,
  selectedModId,
  setSelectedModId,
  isExecutable,
}: UseInstanceSelectionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isInitializedRef = useRef(false);

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const saved = loadSavedInstancesCategory();
    const isCapacitorPlatform =
      platform.platformName === "capacitor" || Core.isMobilePlatform();
    const isAllowedOnCapacitor =
      saved === "pslice" || saved === "codename" || saved === "vslice";
    if (isCapacitorPlatform && !isAllowedOnCapacitor) {
      return "vslice";
    }
    return saved;
  });

  const [sortOption, setSortOption] = useState<InstanceSortOption>(loadSavedInstancesSort);
  const [onlyInstalled, setOnlyInstalled] = useState<boolean>(loadSavedInstancesOnlyInstalled);

  const setCurrentView = useEngineDownloadStore((s) => s.setCurrentView);
  const setNavigateCallback = useEngineDownloadStore((s) => s.setNavigateCallback);

  useEffect(() => {
    try {
      localStorage.setItem(INSTANCES_CATEGORY_STORAGE_KEY, selectedCategory);
    } catch {}
  }, [selectedCategory]);

  useEffect(() => {
    try {
      localStorage.setItem(INSTANCES_SORT_STORAGE_KEY, sortOption);
    } catch {}
  }, [sortOption]);

  useEffect(() => {
    try {
      localStorage.setItem(INSTANCES_ONLY_INSTALLED_STORAGE_KEY, String(onlyInstalled));
    } catch {}
  }, [onlyInstalled]);

  const currentEngineMeta = useMemo(() => {
    const match = Object.values(ENGINE_CATEGORIES).find(
      (cat) => cat.id.toLowerCase() === selectedCategory.toLowerCase()
    );
    return (
      match || {
        id: selectedCategory,
        name: selectedCategory === "vslice" ? "Base Game" : selectedCategory,
        icon: "/assets/icons/categories/vslice.png",
      }
    );
  }, [selectedCategory]);

  // Set navigate callback in store
  useEffect(() => {
    setNavigateCallback(navigate);
  }, [navigate, setNavigateCallback]);

  // Set current view in store
  useEffect(() => {
    setCurrentView({
      route: location.pathname,
      viewingCategory: selectedCategory,
      viewingVersion: selectedVersion,
      activeModalModId: null,
    });
  }, [location.pathname, selectedCategory, selectedVersion, setCurrentView]);

  // Parse initial category and version/mod from route path
  useEffect(() => {
    const rawPath = location.pathname.replace(/^\/instances\/?/, "").trim();
    const parts = rawPath.split("/").map((p) => p.trim()).filter(Boolean);

    if (parts.length > 0) {
      const catParam = parts[0].toLowerCase();
      const matchCat = Object.values(ENGINE_CATEGORIES).find(
        (c) => c.id.toLowerCase() === catParam || c.name.toLowerCase() === catParam
      );
      if (matchCat) {
        const isCapacitorPlatform =
          Core.isMobilePlatform() || platform.platformName === "capacitor";
        const isAllowedOnCapacitor =
          matchCat.id === "pslice" ||
          matchCat.id === "codename" ||
          matchCat.id === "vslice";

        if (isCapacitorPlatform && !isAllowedOnCapacitor) {
          setSelectedCategory("vslice");
        } else {
          setSelectedCategory(matchCat.id);
        }
      } else if (catParam === "executable" || catParam === "3827") {
        const isCapacitorPlatform =
          Core.isMobilePlatform() || platform.platformName === "capacitor";
        setSelectedCategory(isCapacitorPlatform ? "vslice" : "executable");
      }

      if (parts.length > 1) {
        const itemParam = parts[1];
        if (catParam === "executable" || catParam === "3827") {
          if (!Core.isMobilePlatform()) {
            setSelectedModId(itemParam);
          }
        } else {
          setSelectedVersion(itemParam);
        }
      }
    }

    isInitializedRef.current = true;
  }, []);

  // Synchronize route URL and document title
  useEffect(() => {
    if (!isInitializedRef.current) return;

    let targetPath = `/instances/${selectedCategory}`;
    if (isExecutable) {
      if (selectedModId) {
        targetPath = `/instances/executable/${selectedModId}`;
      }
    } else if (selectedVersion) {
      targetPath = `/instances/${selectedCategory}/${selectedVersion}`;
    }

    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }

    // Update document title
    if (isExecutable) {
      const modTitle = selectedMod?.name || selectedMod?.title || "Executable Mods";
      document.title = `${modTitle} | Instances | WeekBox`;
    } else {
      const verText = selectedVersion
        ? selectedVersion === "Nightly"
          ? "Nightly"
          : `v${selectedVersion}`
        : "";
      const engineTitle = currentEngineMeta.id === "vslice" ? "Base Game" : currentEngineMeta.name;
      document.title = verText
        ? `${engineTitle} ${verText} | Instances | WeekBox`
        : `${engineTitle} | Instances | WeekBox`;
    }
  }, [
    selectedCategory,
    selectedVersion,
    selectedModId,
    selectedMod,
    isExecutable,
    currentEngineMeta,
    location.pathname,
    navigate,
  ]);

  return {
    selectedCategory,
    setSelectedCategory,
    sortOption,
    setSortOption,
    onlyInstalled,
    setOnlyInstalled,
    currentEngineMeta,
  };
}

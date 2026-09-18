import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Core, { platform, CapacitorAppLauncher } from "@core";
import { App } from "@capacitor/app";
import Utils from "@utils";
import { ENGINE_CATEGORIES } from "../../../core/services/gamebanana/constants";
import { useEngineReleases } from "./use-engine-releases";
import type { InstanceSortOption } from "../components/instances-topbar";
import {
  useEngineDownloadStore,
  useProcessStore,
  useSettingsStore,
  useStorageMigrationStore,
} from "../../../store";

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

export function useInstances() {
  const location = useLocation();
  const navigate = useNavigate();
  const isInitializedRef = useRef(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("vslice");
  const [sortOption, setSortOption] = useState<InstanceSortOption>("newest");
  const [onlyInstalled, setOnlyInstalled] = useState<boolean>(false);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      platform.platformName === "capacitor" ||
      /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    );
  }, []);
  const isBaseGameMobile = useMemo(() => {
    return isMobile && selectedCategory.toLowerCase() === "vslice";
  }, [isMobile, selectedCategory]);

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

  const isExecutable = useMemo(() => {
    return selectedCategory === "executable" || selectedCategory === "3827";
  }, [selectedCategory]);

  const {
    releases: rawReleases,
    selectedVersion: rawSelectedVersion,
    setSelectedVersion,
    currentRelease: rawCurrentRelease,
    isLoading: isLoadingReleases,
  } = useEngineReleases(selectedCategory);

  const releases = useMemo(() => {
    if (isBaseGameMobile) {
      const ver = "0.8.8";
      const body = `### About the Game
Hey, hope you’re enjoying Funkin’ on the go! We’ve been hard at work to make the game better for you:

- Story Mode & Freeplay featuring all official Weeks!
- Custom touch controls tailored for mobile screens.
- Secret cheat code input: push both thumbs onto the screen and apply as much pressure as possible!

### What's New in v0.8.8
- Android hotfixes and stability improvements.
- Fixed chart file handling and audio backend crashes.
- Shader rendering optimizations for mobile devices.`;

      return [
        {
          id: "playstore-0.8.8",
          version: ver,
          name: `Friday Night Funkin' v${ver}`,
          body,
          releasedAt: "2026-08-28T00:00:00.000Z",
          downloadUrl: "https://play.google.com/store/search?q=fnf&c=apps&h",
          previewMedia: VSLICE_PLAYSTORE_SCREENSHOTS,
        },
      ];
    }
    return rawReleases;
  }, [isBaseGameMobile, rawReleases, isBaseGameInstalled]);

  const selectedVersion = useMemo(() => {
    if (isBaseGameMobile && releases.length > 0) {
      return releases[0].version;
    }
    return rawSelectedVersion;
  }, [isBaseGameMobile, releases, rawSelectedVersion]);

  const currentRelease = useMemo(() => {
    if (isBaseGameMobile) {
      return releases[0] || null;
    }
    return rawCurrentRelease;
  }, [isBaseGameMobile, releases, rawCurrentRelease]);

  const [installedMods, setInstalledMods] = useState<any[]>([]);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [isLoadingMods, setIsLoadingMods] = useState<boolean>(false);

  const currentEngineTask = useEngineDownloadStore((s) => s.currentTask);
  const startEngineDownload = useEngineDownloadStore((s) => s.startEngineDownload);
  const cancelEngineDownload = useEngineDownloadStore((s) => s.cancelEngineDownload);
  const setCurrentView = useEngineDownloadStore((s) => s.setCurrentView);
  const setNavigateCallback = useEngineDownloadStore((s) => s.setNavigateCallback);

  const [installedEngineMap, setInstalledEngineMap] = useState<Record<string, boolean>>({});
  const [installedEnginesRegistry, setInstalledEnginesRegistry] = useState<
    Record<string, Record<string, any>>
  >({});
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState<boolean>(false);

  /** Parse initial category and version/mod from route path */
  useEffect(() => {
    const rawPath = location.pathname.replace(/^\/instances\/?/, "").trim();
    const parts = rawPath.split("/").map((p) => p.trim()).filter(Boolean);

    if (parts.length > 0) {
      const catParam = parts[0].toLowerCase();
      const matchCat = Object.values(ENGINE_CATEGORIES).find(
        (c) => c.id.toLowerCase() === catParam || c.name.toLowerCase() === catParam
      );
      if (matchCat) {
        if (Core.isMobilePlatform() && (matchCat.id === "executable" || matchCat.id === "3827")) {
          setSelectedCategory("vslice");
        } else {
          setSelectedCategory(matchCat.id);
        }
      } else if (catParam === "executable" || catParam === "3827") {
        setSelectedCategory(Core.isMobilePlatform() ? "vslice" : "executable");
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

  /** Load installed engine registry */
  const loadInstalledEngines = async () => {
    if (!Core.platform.getInstalledEngines) return;
    try {
      const reg = await Core.platform.getInstalledEngines();
      setInstalledEnginesRegistry(reg || {});
    } catch {
      setInstalledEnginesRegistry({});
    }
  };

  useEffect(() => {
    setNavigateCallback(navigate);
  }, [navigate, setNavigateCallback]);

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
  }, []);

  /** Load executable mods when category is executable */
  useEffect(() => {
    if (!isExecutable) return;

    let isMounted = true;
    setIsLoadingMods(true);

    Core.platform
      .getInstalledMods()
      .then((mods: any[]) => {
        if (!isMounted) return;
        const exes = (mods || []).filter((m: any) => {
          const eid = String(m.engineId || "").toLowerCase();
          const ename = String(m.engineName || "").toLowerCase();
          return eid === "executable" || eid === "3827" || ename.includes("executable");
        });

        setInstalledMods(exes);
        if (exes.length > 0) {
          setSelectedModId((prev) =>
            prev && exes.some((x: any) => String(x.id) === String(prev)) ? prev : String(exes[0].id)
          );
        } else {
          setSelectedModId(null);
        }
      })
      .catch(() => {
        if (isMounted) setInstalledMods([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMods(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isExecutable]);

  const selectedMod = useMemo(() => {
    if (!isExecutable || !installedMods.length) return null;
    return (
      installedMods.find((m) => String(m.id) === String(selectedModId)) ||
      installedMods[0] ||
      null
    );
  }, [isExecutable, installedMods, selectedModId]);

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

  /** List of installed versions for the selected category */
  const installedVersionsForCategory = useMemo(() => {
    const catData = installedEnginesRegistry[selectedCategory.toLowerCase()];
    if (!catData) return [];
    return Object.keys(catData);
  }, [installedEnginesRegistry, selectedCategory]);

  /** Checks if selected version is installed on disk */
  useEffect(() => {
    if (isExecutable || !currentRelease || !Core.platform.isEngineInstalled) return;

    const key = `${selectedCategory}:${currentRelease.version}`;
    let isMounted = true;

    Core.platform
      .isEngineInstalled(selectedCategory, currentRelease.version)
      .then((installed: boolean) => {
        if (isMounted) {
          setInstalledEngineMap((prev) => ({
            ...prev,
            [key]: installed,
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isExecutable, selectedCategory, currentRelease?.version]);

  const isCurrentEngineInstalled = useMemo(() => {
    if (isBaseGameMobile) return isBaseGameInstalled;
    if (isExecutable || !currentRelease) return false;
    const cleanCurrentVer = currentRelease.version.toLowerCase().replace(/^v/, "");
    const versionMatch = installedVersionsForCategory.some(
      (v) => v.toLowerCase().replace(/^v/, "") === cleanCurrentVer
    );
    return (
      versionMatch || Boolean(installedEngineMap[`${selectedCategory}:${currentRelease.version}`])
    );
  }, [
    isBaseGameMobile,
    isBaseGameInstalled,
    isExecutable,
    selectedCategory,
    currentRelease?.version,
    installedVersionsForCategory,
    installedEngineMap,
  ]);

  const isNightly = useMemo(() => {
    return Boolean(
      currentRelease?.isNightly || currentRelease?.version?.toLowerCase() === "nightly"
    );
  }, [currentRelease]);

  /** Check if installed Nightly is outdated compared to GitHub release */
  const isNightlyOutdated = useMemo(() => {
    if (!isNightly || !isCurrentEngineInstalled || !currentRelease?.releasedAt) return false;
    const catData = installedEnginesRegistry[selectedCategory.toLowerCase()] || {};
    const installedEntry =
      catData["nightly"] ||
      catData[currentRelease.version.toLowerCase()] ||
      Object.values(catData)[0];

    if (!installedEntry) return false;
    const installedTime = installedEntry.installedAt || installedEntry.releasedAt;
    if (!installedTime) return false;

    return new Date(currentRelease.releasedAt).getTime() > new Date(installedTime).getTime();
  }, [
    isNightly,
    isCurrentEngineInstalled,
    currentRelease?.releasedAt,
    installedEnginesRegistry,
    selectedCategory,
    currentRelease?.version,
  ]);

  const isDownloadingCurrent = useMemo(() => {
    if (!currentRelease || !currentEngineTask) return false;
    const catMatch = currentEngineTask.engineId.toLowerCase() === selectedCategory.toLowerCase();
    const verMatch =
      currentEngineTask.version.toLowerCase().replace(/^v/, "") ===
      currentRelease.version.toLowerCase().replace(/^v/, "");
    return catMatch && verMatch;
  }, [currentEngineTask, selectedCategory, currentRelease?.version]);

  useEffect(() => {
    setCurrentView({
      route: location.pathname,
      viewingCategory: selectedCategory,
      viewingVersion: selectedVersion,
      activeModalModId: null,
    });
  }, [location.pathname, selectedCategory, selectedVersion, setCurrentView]);

  /** Synchronize route URL and document title */
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

    /** Update document title */
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

  const handleDownloadRelease = async () => {
    if (isBaseGameMobile) {
      await CapacitorAppLauncher.openBaseGameStore();
      setTimeout(() => {
        checkBaseGameStatus();
      }, 2500);
      return;
    }

    if (!currentRelease?.downloadUrl) {
      Utils.toast.error("No download link available for this release on your platform.", {
        title: "Engine Download",
      });
      return;
    }

    await startEngineDownload({
      engineId: selectedCategory,
      version: currentRelease.version,
      engineName: currentEngineMeta.name,
      downloadUrl: currentRelease.downloadUrl,
    });

    await loadInstalledEngines();
  };

  const handleOpenEngineFolder = async () => {
    if (!currentRelease || !Core.platform.openEngineFolder) return;
    try {
      await Core.platform.openEngineFolder(selectedCategory, currentRelease.version);
    } catch {
      Utils.toast.error("Could not open engine directory.", {
        title: "File Manager Error",
      });
    }
  };

  const currentInstanceKey = isExecutable
    ? selectedMod
      ? `mod:${selectedMod.id}`
      : ""
    : currentRelease
    ? `engine:${selectedCategory}:${currentRelease.version}`
    : "";

  const playStatus = useProcessStore((s) =>
    currentInstanceKey ? s.getPlayState(currentInstanceKey) : "idle"
  );

  const isStorageMigrating = useStorageMigrationStore((s) => s.isMigrating);

  const handlePlayEngine = async () => {
    if (!currentRelease) return;
    if (isBaseGameMobile) {
      const launched = await CapacitorAppLauncher.launchBaseGame();
      if (!launched) {
        Utils.toast.warning("Base Game is not installed or could not be opened. Redirecting to Play Store...", {
          title: "Base Game",
        });
        await CapacitorAppLauncher.openBaseGameStore();
      }
      return;
    }

    try {
      const enginesDir = (await Core.platform.getEnginesPath?.()) || "";
      const safeEngineId = (selectedCategory || "vslice")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .toLowerCase();

      const safeVersion = (currentRelease.version || "latest")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      /* Guard against actions during storage migration */
      if (isStorageMigrating) {
        Utils.toast.warning(
          "Cannot launch game while storage migration is in progress. Please wait for the migration to complete.",
          { title: "Storage Relocation in Progress" }
        );
        return;
      }

      const folderPath = `${enginesDir}/${safeEngineId}/${safeVersion}`;
      const instanceKey = `engine:${selectedCategory}:${currentRelease.version}`;

      /* Find all installed mods matching this engine and version (including Any version) */
      const installedModsList = (await Core.platform.getInstalledMods?.()) || [];
      const modsDir = (await Core.platform.getModsPath?.()) || "";
      const currentCategory = (selectedCategory || "").toLowerCase().trim();
      const currentReleaseVer = (currentRelease.version || "").toLowerCase().trim();
      const cleanCurrentReleaseVer = currentReleaseVer.replace(/^v/, "");

      const matchingModPaths: string[] = [];

      for (const mod of installedModsList) {
        if (!mod) continue;

        const modEngId = String(mod.engineId || "").toLowerCase().trim();
        const modEngName = String(mod.engineName || "").toLowerCase().trim();

        /* Exclude standalone executable mods */
        if (
          modEngId === "executable" ||
          modEngId === "3827" ||
          modEngName.includes("executable")
        ) {
          continue;
        }

        /* Check if mod engine matches current engine category */
        const isEngineMatch =
          modEngId === currentCategory ||
          modEngName.includes(currentCategory) ||
          (currentCategory === "vslice" &&
            (modEngId === "29202" ||
              modEngName.includes("v-slice") ||
              modEngName.includes("base game"))) ||
          (currentCategory === "psych" &&
            (modEngId === "28367" || modEngName.includes("psych"))) ||
          (currentCategory === "codename" &&
            (modEngId === "34764" || modEngName.includes("codename"))) ||
          (currentCategory === "pslice" &&
            (modEngId === "43798" || modEngName.includes("p-slice"))) ||
          (currentCategory === "fpsplus" &&
            (modEngId === "43850" || modEngName.includes("fps plus"))) ||
          (currentCategory === "psychonline" &&
            (modEngId === "43788" || modEngName.includes("psych online")));

        if (!isEngineMatch) continue;

        /* Check if engine version matches or is Any version */
        const modVer = String(mod.engineVersion || "").toLowerCase().trim();
        const cleanModVer = modVer.replace(/^v/, "");

        const isVersionMatch =
          !modVer ||
          modVer === "any version" ||
          modVer === "any" ||
          cleanModVer === cleanCurrentReleaseVer ||
          cleanModVer === "latest";

        if (!isVersionMatch) continue;

        /* Determine mod folder path */
        const safeName = (mod.name || mod.title || "unknown")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();

        const modPath = mod.installPath || `${modsDir}/mod_${mod.id}_${safeName}`;
        if (!matchingModPaths.includes(modPath)) {
          matchingModPaths.push(modPath);
        }
      }

      await useProcessStore.getState().launchInstance(instanceKey, folderPath, {
        modFolderPaths: matchingModPaths,
      });
    } catch (err: any) {
      Utils.toast.error(err?.message || "Could not launch engine.", {
        title: "Launch Error",
      });
    }
  };

  const executeUninstallEngine = async () => {
    if (!currentRelease) return;
    if (isBaseGameMobile) {
      const ok = await CapacitorAppLauncher.uninstallBaseGame();
      if (ok) {
        Utils.toast.info("Opening uninstallation dialog...", {
          title: "Base Game",
        });
      } else {
        Utils.toast.error("Could not open uninstallation dialog.", {
          title: "Uninstall Error",
        });
      }
      return;
    }

    if (isStorageMigrating) {
      Utils.toast.warning(
        "Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }

    const ver = currentRelease.version;
    try {
      if (Core.platform.uninstallEngine) {
        await Core.platform.uninstallEngine(selectedCategory, ver);
        const key = `${selectedCategory}:${ver}`;
        setInstalledEngineMap((prev) => ({
          ...prev,
          [key]: false,
        }));
        await loadInstalledEngines();

        Utils.toast.success(`${currentEngineMeta.name} v${ver} uninstalled.`, {
          title: "Engine Uninstalled",
        });
      }
    } catch {
      Utils.toast.error(`Could not uninstall ${currentEngineMeta.name} v${ver}.`, {
        title: "Uninstall Error",
      });
    }
  };

  const handleUninstallEngine = async () => {
    if (!currentRelease) return;
    if (isStorageMigrating) {
      Utils.toast.warning(
        "Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }

    if (useSettingsStore.getState().isWarningDismissed("delete-engine")) {
      await executeUninstallEngine();
    } else {
      setIsUninstallConfirmOpen(true);
    }
  };

  const handlePlayExecutable = async () => {
    if (!selectedMod) return;
    if (isStorageMigrating) {
      Utils.toast.warning(
        "Cannot launch game while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }

    try {
      const modsDir = (await Core.platform.getModsPath?.()) || "";
      const safeName = (selectedMod.name || selectedMod.title || "unknown")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

      const folderPath = `${modsDir}/mod_${selectedMod.id}_${safeName}`;
      const instanceKey = `mod:${selectedMod.id}`;

      await useProcessStore.getState().launchInstance(instanceKey, folderPath);
    } catch (err: any) {
      Utils.toast.error(err?.message || "Could not launch executable mod.", {
        title: "Launch Error",
      });
    }
  };

  const handleStopInstance = async () => {
    if (!currentInstanceKey) return;
    await useProcessStore.getState().stopInstance(currentInstanceKey);
  };

  const footerTitle = isExecutable
    ? selectedMod?.name || selectedMod?.title || "Executable Mod"
    : currentEngineMeta.id === "vslice"
    ? "Base Game"
    : currentEngineMeta.name;

  const footerVersion = isExecutable
    ? selectedMod?.author
      ? `by ${selectedMod.author}`
      : "Installed"
    : selectedVersion;

  const footerIcon = isExecutable
    ? selectedMod?.icon || "/assets/icons/categories/exe.png"
    : currentEngineMeta.icon;

  return {
    selectedCategory,
    setSelectedCategory,
    sortOption,
    setSortOption,
    onlyInstalled,
    setOnlyInstalled,
    isExecutable,
    releases,
    selectedVersion,
    setSelectedVersion,
    currentRelease,
    isLoadingReleases,
    installedMods,
    selectedModId,
    setSelectedModId,
    selectedMod,
    isLoadingMods,
    currentEngineMeta,
    installedVersionsForCategory,
    isCurrentEngineInstalled,
    isNightly,
    isNightlyOutdated,
    isDownloadingCurrent,
    currentEngineTask,
    playStatus,
    isStorageMigrating,
    handleDownloadRelease,
    handleOpenEngineFolder,
    handlePlayEngine,
    handlePlayExecutable,
    handleStopInstance,
    handleUninstallEngine,
    cancelEngineDownload,
    isUninstallConfirmOpen,
    setIsUninstallConfirmOpen,
    executeUninstallEngine,
    footerTitle,
    footerVersion,
    footerIcon,
    isBaseGameMobile,
    isBaseGameInstalled,
    checkBaseGameStatus,
  };
}

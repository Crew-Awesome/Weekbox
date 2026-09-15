import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Core from "@core";
import Utils from "@utils";
import { ENGINE_CATEGORIES } from "../../core/services/gamebanana/constants";
import { useEngineReleases } from "./hooks/use-engine-releases";
import { InstancesTopbar, type InstanceSortOption } from "./components/instances-topbar";
import { InstancesVersionAside } from "./components/instances-version-aside";
import { InstancesMarkdownViewer } from "./components/instances-markdown-viewer";
import { InstancesExecutableView } from "./components/instances-executable-view";
import { InstancesFooter } from "./components/instances-footer";
import {
  useEngineDownloadStore,
  useProcessStore,
  useSettingsStore,
  useStorageMigrationStore,
} from "../../store";
import { ConfirmationModal } from "@components";

/**
 * Organism / Feature: Instances View.
 * Displays engine version management, markdown changelogs, and executable mod launching.
 * Synchronizes route (/instances/:category/:version) and document title.
 */
export const Instances: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isInitializedRef = useRef(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("vslice");
  const [sortOption, setSortOption] = useState<InstanceSortOption>("newest");
  const [onlyInstalled, setOnlyInstalled] = useState<boolean>(false);

  const isExecutable = useMemo(() => {
    return selectedCategory === "executable" || selectedCategory === "3827";
  }, [selectedCategory]);

  const {
    releases,
    selectedVersion,
    setSelectedVersion,
    currentRelease,
    isLoading: isLoadingReleases,
  } = useEngineReleases(selectedCategory);

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
        setSelectedCategory(matchCat.id);
      } else if (catParam === "executable" || catParam === "3827") {
        setSelectedCategory("executable");
      }

      if (parts.length > 1) {
        const itemParam = parts[1];
        if (catParam === "executable" || catParam === "3827") {
          setSelectedModId(itemParam);
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

    Core.platform.getInstalledMods().then((mods) => {
      if (!isMounted) return;
      const exes = (mods || []).filter((m: any) => {
        const eid = String(m.engineId || "").toLowerCase();
        const ename = String(m.engineName || "").toLowerCase();
        return eid === "executable" || eid === "3827" || ename.includes("executable");
      });

      setInstalledMods(exes);
      if (exes.length > 0) {
        setSelectedModId((prev) => (prev && exes.some((x: any) => String(x.id) === String(prev)) ? prev : String(exes[0].id)));
      } else {
        setSelectedModId(null);
      }
    }).catch(() => {
      if (isMounted) setInstalledMods([]);
    }).finally(() => {
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
    return match || {
      id: selectedCategory,
      name: selectedCategory === "vslice" ? "Base Game" : selectedCategory,
      icon: "/assets/icons/categories/vslice.png",
    };
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

    Core.platform.isEngineInstalled(selectedCategory, currentRelease.version).then((installed) => {
      if (isMounted) {
        setInstalledEngineMap((prev) => ({
          ...prev,
          [key]: installed,
        }));
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isExecutable, selectedCategory, currentRelease?.version]);

  const isCurrentEngineInstalled = useMemo(() => {
    if (isExecutable || !currentRelease) return false;
    const cleanCurrentVer = currentRelease.version.toLowerCase().replace(/^v/, "");
    const versionMatch = installedVersionsForCategory.some(
      (v) => v.toLowerCase().replace(/^v/, "") === cleanCurrentVer
    );
    return versionMatch || Boolean(installedEngineMap[`${selectedCategory}:${currentRelease.version}`]);
  }, [isExecutable, selectedCategory, currentRelease?.version, installedVersionsForCategory, installedEngineMap]);

  const isNightly = useMemo(() => {
    return Boolean(currentRelease?.isNightly || currentRelease?.version?.toLowerCase() === "nightly");
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
  }, [isNightly, isCurrentEngineInstalled, currentRelease?.releasedAt, installedEnginesRegistry, selectedCategory, currentRelease?.version]);

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
      const verText = selectedVersion ? (selectedVersion === "Nightly" ? "Nightly" : `v${selectedVersion}`) : "";
      const engineTitle = currentEngineMeta.id === "vslice" ? "Base Game" : currentEngineMeta.name;
      document.title = verText ? `${engineTitle} ${verText} | Instances | WeekBox` : `${engineTitle} | Instances | WeekBox`;
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
    ? (selectedMod ? `mod:${selectedMod.id}` : "")
    : (currentRelease ? `engine:${selectedCategory}:${currentRelease.version}` : "");

  const playStatus = useProcessStore((s) =>
    currentInstanceKey ? s.getPlayState(currentInstanceKey) : "idle"
  );

  const isStorageMigrating = useStorageMigrationStore((s) => s.isMigrating);

  const handlePlayEngine = async () => {
    if (!currentRelease) return;
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
      const installedMods = (await Core.platform.getInstalledMods?.()) || [];
      const modsDir = (await Core.platform.getModsPath?.()) || "";
      const currentCategory = (selectedCategory || "").toLowerCase().trim();
      const currentReleaseVer = (currentRelease.version || "").toLowerCase().trim();
      const cleanCurrentReleaseVer = currentReleaseVer.replace(/^v/, "");

      const matchingModPaths: string[] = [];

      for (const mod of installedMods) {
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
          (currentCategory === "vslice" && (modEngId === "29202" || modEngName.includes("v-slice") || modEngName.includes("base game"))) ||
          (currentCategory === "psych" && (modEngId === "28367" || modEngName.includes("psych"))) ||
          (currentCategory === "codename" && (modEngId === "34764" || modEngName.includes("codename"))) ||
          (currentCategory === "pslice" && (modEngId === "43798" || modEngName.includes("p-slice"))) ||
          (currentCategory === "fpsplus" && (modEngId === "43850" || modEngName.includes("fps plus"))) ||
          (currentCategory === "psychonline" && (modEngId === "43788" || modEngName.includes("psych online")));

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
    ? (selectedMod?.author ? `by ${selectedMod.author}` : "Installed")
    : selectedVersion;

  const footerIcon = isExecutable
    ? selectedMod?.icon || "/assets/icons/categories/exe.png"
    : currentEngineMeta.icon;

  return (
    <div className="flex flex-col flex-1 w-[calc(100%+4rem)] h-[calc(100%+4rem)] overflow-hidden bg-[var(--wb-bg)] text-[var(--wb-text-main)] -m-8">
      {/** Topbar */}
      <InstancesTopbar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onlyInstalled={onlyInstalled}
        onOnlyInstalledChange={setOnlyInstalled}
        isExecutable={isExecutable}
      />

      {/** Main split area */}
      <div className="flex flex-col md:flex-row flex-1 w-full min-h-0 overflow-hidden relative">
        {/** Left Aside */}
        <InstancesVersionAside
          isExecutable={isExecutable}
          releases={releases}
          selectedVersion={selectedVersion}
          onSelectVersion={setSelectedVersion}
          isLoadingReleases={isLoadingReleases}
          installedMods={installedMods}
          selectedModId={selectedModId}
          onSelectMod={(mod) => setSelectedModId(String(mod.id))}
          isLoadingMods={isLoadingMods}
          engineIcon={currentEngineMeta.icon}
          sortOption={sortOption}
          onlyInstalled={onlyInstalled}
          installedVersions={installedVersionsForCategory}
        />

        {/** Right Content View with docked footer */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--wb-surface)]/20 relative">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isExecutable ? (
              <InstancesExecutableView mod={selectedMod} />
            ) : (
              <InstancesMarkdownViewer
                release={currentRelease}
                isLoading={isLoadingReleases}
              />
            )}
          </div>

          <InstancesFooter
            isExecutable={isExecutable}
            icon={footerIcon}
            title={footerTitle}
            version={footerVersion}
            downloadUrl={currentRelease?.downloadUrl}
            isInstalled={isExecutable ? true : isCurrentEngineInstalled}
            isNightly={isNightly}
            isNightlyOutdated={isNightlyOutdated}
            onDownload={handleDownloadRelease}
            onCancelDownload={cancelEngineDownload}
            onUpdate={handleDownloadRelease}
            onUninstall={handleUninstallEngine}
            onOpenFolder={handleOpenEngineFolder}
            onPlay={isExecutable ? handlePlayExecutable : handlePlayEngine}
            onStop={handleStopInstance}
            playStatus={playStatus}
            isStorageMigrating={isStorageMigrating}
            isDownloading={isDownloadingCurrent}
            downloadProgress={isDownloadingCurrent ? currentEngineTask?.progress ?? 0 : 0}
            downloadStatusText={isDownloadingCurrent ? currentEngineTask?.status ?? "" : ""}
            currentExtractingFile={isDownloadingCurrent ? currentEngineTask?.currentFile : undefined}
          />
        </main>
      </div>

      {currentRelease && (
        <ConfirmationModal
          isOpen={isUninstallConfirmOpen}
          onClose={() => setIsUninstallConfirmOpen(false)}
          onConfirm={async (dontAskAgain: boolean) => {
            if (dontAskAgain) {
              await useSettingsStore.getState().dismissWarning("delete-engine");
            }
            setIsUninstallConfirmOpen(false);
            await executeUninstallEngine();
          }}
          title="Uninstall Engine Version"
          description={
            <span>
              Are you sure you want to uninstall{" "}
              <strong>
                {currentEngineMeta.name} v{currentRelease.version}
              </strong>
              ? This engine version and all its local files will be permanently deleted from disk.
            </span>
          }
          cancelLabel="Nevermind!"
          confirmLabel="Uninstall"
          isDestructive={true}
          showDontAskAgain={true}
        />
      )}
    </div>
  );
};

export default Instances;


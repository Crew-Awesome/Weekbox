import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Core from "@core";
import Utils from "@utils";
import { ENGINE_CATEGORIES } from "../../core/services/gamebanana/constants";
import { useEngineReleases } from "./hooks/use-engine-releases";
import { InstancesTopbar } from "./components/instances-topbar";
import { InstancesVersionAside } from "./components/instances-version-aside";
import { InstancesMarkdownViewer } from "./components/instances-markdown-viewer";
import { InstancesExecutableView } from "./components/instances-executable-view";
import { InstancesFooter } from "./components/instances-footer";

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
  const [sortOption, setSortOption] = useState<"date" | "version">("date");
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

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusText, setDownloadStatusText] = useState<string>("");
  const [installedEngineMap, setInstalledEngineMap] = useState<Record<string, boolean>>({});
  const [installedEnginesRegistry, setInstalledEnginesRegistry] = useState<
    Record<string, Record<string, any>>
  >({});

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
    loadInstalledEngines();

    const handleEnginesChanged = () => {
      loadInstalledEngines();
    };

    window.addEventListener("wb:engines-changed", handleEnginesChanged);
    const unsubPlatform = Core.platform.onEvent("engines:changed", handleEnginesChanged);

    return () => {
      window.removeEventListener("wb:engines-changed", handleEnginesChanged);
      unsubPlatform();
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
    const versionMatch = installedVersionsForCategory.some(
      (v) => v.toLowerCase() === currentRelease.version.toLowerCase()
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
    if (!currentRelease) return false;
    return downloadingKey === `${selectedCategory}:${currentRelease.version}`;
  }, [downloadingKey, selectedCategory, currentRelease?.version]);

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

    if (downloadingKey) {
      Utils.toast.info("A download is already in progress.", {
        title: "Engine Download",
      });
      return;
    }

    const key = `${selectedCategory}:${currentRelease.version}`;
    setDownloadingKey(key);
    setDownloadProgress(0);
    setDownloadStatusText("Starting download...");

    const toastId = Utils.toast.info(`Downloading ${currentEngineMeta.name} v${currentRelease.version}...`, {
      title: "Engine Download",
      duration: 60000,
    });

    try {
      if (Core.platform.downloadEngine) {
        await Core.platform.downloadEngine(
          currentRelease.downloadUrl,
          selectedCategory,
          currentRelease.version,
          (percent, status) => {
            setDownloadProgress(percent);
            setDownloadStatusText(status || "Downloading...");
            if (status === "Flattening folder structure..." || status === "Flattening") {
              Utils.toast.update(toastId, {
                title: "Engine Download",
                message: `Flattening folder structure for ${currentEngineMeta.name} v${currentRelease.version}...`,
                type: "info",
              });
            } else if (status === "Extracting archive..." || status === "Extracting") {
              Utils.toast.update(toastId, {
                title: "Engine Download",
                message: `Extracting ${currentEngineMeta.name} v${currentRelease.version}...`,
                type: "info",
              });
            }
          }
        );

        setInstalledEngineMap((prev) => ({
          ...prev,
          [key]: true,
        }));
        await loadInstalledEngines();

        Utils.toast.update(toastId, {
          title: "Engine Download",
          message: `${currentEngineMeta.name} v${currentRelease.version} downloaded and extracted!`,
          type: "success",
          duration: 4000,
        });
      } else {
        await Core.platform.openUrl(currentRelease.downloadUrl);
        Utils.toast.update(toastId, {
          title: "Engine Download",
          message: `Download opened in browser for ${currentEngineMeta.name} v${currentRelease.version}.`,
          type: "success",
          duration: 4000,
        });
      }
    } catch (error: any) {
      Utils.toast.update(toastId, {
        title: "Engine Download",
        message: error?.message || `Could not download ${currentEngineMeta.name} v${currentRelease.version}.`,
        type: "error",
        duration: 5000,
      });
    } finally {
      setDownloadingKey(null);
      setDownloadProgress(0);
      setDownloadStatusText("");
    }
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

  const handlePlayEngine = async () => {
    if (!currentRelease) return;
    try {
      if (Core.platform.openEngineFolder) {
        await Core.platform.openEngineFolder(selectedCategory, currentRelease.version);
        Utils.toast.info(`Opened folder for ${currentEngineMeta.name} v${currentRelease.version}.`, {
          title: "Launch Engine",
        });
      }
    } catch {
      Utils.toast.error("Could not launch engine.", {
        title: "Launch Error",
      });
    }
  };

  const handleUninstallEngine = async () => {
    if (!currentRelease) return;
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

  const handlePlayExecutable = async () => {
    if (!selectedMod) return;

    try {
      if (Core.platform.openModFolder) {
        await Core.platform.openModFolder(String(selectedMod.id), selectedMod.name || selectedMod.title);
        Utils.toast.info(`Opened folder for "${selectedMod.name || selectedMod.title}".`, {
          title: "Launch Executable",
        });
      } else {
        Utils.toast.info(`"${selectedMod.name || selectedMod.title}" is ready.`, {
          title: "Launch Executable",
        });
      }
    } catch {
      Utils.toast.error("Could not launch executable mod.", {
        title: "Launch Error",
      });
    }
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
            onUpdate={handleDownloadRelease}
            onUninstall={handleUninstallEngine}
            onOpenFolder={handleOpenEngineFolder}
            onPlay={isExecutable ? handlePlayExecutable : handlePlayEngine}
            isDownloading={isDownloadingCurrent}
            downloadProgress={downloadProgress}
            downloadStatusText={downloadStatusText}
          />
        </main>
      </div>
    </div>
  );
};

export default Instances;


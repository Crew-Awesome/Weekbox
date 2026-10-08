import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Core, { CapacitorAppLauncher } from "@core";
import Utils from "@utils";
import type { ModalViewProps } from "../types";
import type { ModModalTab } from "../components/mod-nav-pills";
import {
  useDownloadStore,
  useFavoritesStore,
  useEngineDownloadStore,
  useProcessStore,
  useSettingsStore,
  useStorageMigrationStore,
} from "../../../../../store";

/**
 * @description Controller hook for the Mod Details Modal. Manages state for tabs, engine selection, editing, and actions.
 * @param {Pick<ModalViewProps, "displayCard" | "engineName" | "formatDate" | "formatFullDate" | "isInstalled" | "onUpdateMod" | "onClose">} props - The props containing the active mod card, engine data, and callbacks.
 * @returns {Object} An object containing all the state variables and handler functions required by the Mod Details view.
 */
export function useModDetails({
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  isInstalled: isInstalledProp = false,
  onUpdateMod,
  onClose,
}: Pick<
  ModalViewProps,
  "displayCard" | "engineName" | "formatDate" | "formatFullDate" | "isInstalled" | "onUpdateMod" | "onClose"
>) {
  const navigate = useNavigate();
  const isMobilePlatform = Core.isMobilePlatform();

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = viewportWidth < 768;

  const [hoverTooltip, setHoverTooltip] = useState<"submitted" | "updated" | "installed" | null>(null);
  const [isInstalled, setIsInstalled] = useState(Boolean(isInstalledProp));
  const [localInstalledAt, setLocalInstalledAt] = useState<number | undefined>(displayCard?.installedAt);
  const [installedModData, setInstalledModData] = useState<any | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false);

  const modInstanceKey = `mod:${displayCard?.id}`;
  const playStatus = useProcessStore((s) => s.getPlayState(modInstanceKey));
  const isStorageMigrating = useStorageMigrationStore((s) => s.isMigrating);
  const [activeTab, setActiveTab] = useState<ModModalTab>("description");
  const isDropdownOpen = activeTab === "details";

  const authorAvatar = useMemo(() => {
    if (displayCard?.userPfp) return displayCard.userPfp;
    const authorLower = (displayCard?.author || "").trim().toLowerCase();
    return displayCard?.credits
      ?.flatMap((g) => g.authors || [])
      ?.find(
        (a) =>
          a.name?.trim().toLowerCase() === authorLower && Boolean(a.avatarUrl)
      )?.avatarUrl;
  }, [displayCard?.userPfp, displayCard?.credits, displayCard?.author]);

  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => {
    setAvatarError(false);
  }, [authorAvatar]);

  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const scrollContainer = mobileContainerRef.current?.parentElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentY = scrollContainer.scrollTop;
      const delta = currentY - lastScrollY.current;

      if (currentY <= 20) {
        setIsHeaderVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      if (delta > 10) {
        setIsHeaderVisible(false);
        lastScrollY.current = currentY;
      } else if (delta < -10) {
        setIsHeaderVisible(true);
        lastScrollY.current = currentY;
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(displayCard?.name || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(displayCard?.htmlBody || displayCard?.description || "");

  useEffect(() => {
    setTitleInput(displayCard?.name || "");
    setIsEditingTitle(false);
  }, [displayCard?.id, displayCard?.name]);

  useEffect(() => {
    setDescInput(displayCard?.htmlBody || displayCard?.description || "");
    setIsEditingDesc(false);
  }, [displayCard?.id, displayCard?.htmlBody, displayCard?.description]);

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === displayCard?.name) {
      setTitleInput(displayCard?.name || "");
      return;
    }
    if (onUpdateMod) {
      onUpdateMod({ name: trimmed, title: trimmed });
      Utils.toast.success("Mod title updated", { duration: 2500 });
    }
  }, [titleInput, displayCard?.name, onUpdateMod]);

  const handleSaveDesc = useCallback(() => {
    setIsEditingDesc(false);
    if (descInput === (displayCard?.htmlBody || displayCard?.description || "")) {
      return;
    }
    if (onUpdateMod) {
      onUpdateMod({ htmlBody: descInput });
      Utils.toast.success("Mod description updated", { duration: 2500 });
    }
  }, [descInput, displayCard?.htmlBody, displayCard?.description, onUpdateMod]);

  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const engineDropdownRef = useRef<HTMLDivElement>(null);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>(
    (displayCard as any)?.engineVersion || ""
  );

  const [installedEnginesRegistry, setInstalledEnginesRegistry] = useState<
    Record<string, Record<string, any>>
  >({});
  const [isInstallingEngine, setIsInstallingEngine] = useState<boolean>(false);
  const [isEngineInstalledOnDevice, setIsEngineInstalledOnDevice] = useState<boolean>(true);

  const loadEngines = useCallback(async () => {
    if (!Core.platform.getInstalledEngines) return;
    try {
      const reg = await Core.platform.getInstalledEngines();
      setInstalledEnginesRegistry(reg || {});
    } catch {
      setInstalledEnginesRegistry({});
    }
  }, []);

  useEffect(() => {
    loadEngines();
    window.addEventListener("wb:engines-changed", loadEngines);
    const unsub = Core.platform.onEvent("engines:changed", loadEngines);
    return () => {
      window.removeEventListener("wb:engines-changed", loadEngines);
      unsub();
    };
  }, [loadEngines]);

  const currentEngineKey = String(displayCard?.engineId || "vslice").toLowerCase();

  useEffect(() => {
    if (!isMobilePlatform) return;
    let isMounted = true;
    const check = async () => {
      let installed = false;
      if (currentEngineKey === "vslice" || currentEngineKey === "base_game" || currentEngineKey === "fnf") {
        installed = await CapacitorAppLauncher.isBaseGameInstalled();
      } else if (currentEngineKey.includes("psych")) {
        installed = await CapacitorAppLauncher.isAppInstalled("com.shadowmario.psychengine");
      } else if (currentEngineKey.includes("codename")) {
        installed = await CapacitorAppLauncher.isAppInstalled("org.codenameengine.fnf");
      } else if (currentEngineKey.includes("kade")) {
        installed = await CapacitorAppLauncher.isAppInstalled("com.kade.kadeengine");
      } else {
        installed = await CapacitorAppLauncher.isAppInstalled(currentEngineKey);
      }
      if (isMounted) setIsEngineInstalledOnDevice(installed);
    };
    check();
    const unsub = CapacitorAppLauncher.addPackageListener(() => check());
    window.addEventListener("focus", check);
    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener("focus", check);
    };
  }, [isMobilePlatform, currentEngineKey]);

  const installedEngineVersions = useMemo(() => {
    const catData = installedEnginesRegistry[currentEngineKey];
    if (!catData) return [];
    return Object.keys(catData);
  }, [installedEnginesRegistry, currentEngineKey]);

  useEffect(() => {
    if (installedEngineVersions.length > 0) {
      if (!selectedVersion) {
        setSelectedVersion("Any version");
      } else if (
        selectedVersion !== "Any version" &&
        selectedVersion !== "any" &&
        !installedEngineVersions.includes(selectedVersion)
      ) {
        setSelectedVersion(installedEngineVersions[0]);
      }
    }
  }, [installedEngineVersions, selectedVersion]);

  const handleInstallLatestEngine = async () => {
    if (isMobilePlatform) {
      if (currentEngineKey === "vslice" || currentEngineKey === "base_game") {
        await CapacitorAppLauncher.openBaseGameStore();
      } else {
        onClose?.();
        navigate(`/instances/${currentEngineKey}`);
      }
      return;
    }

    if (isInstallingEngine) return;
    setIsInstallingEngine(true);
    try {
      const releases = await Core.services.engines.fetchEngineReleases(currentEngineKey);
      const latestWithDownload = releases.find((r) => r.downloadUrl);
      if (!latestWithDownload || !latestWithDownload.downloadUrl) {
        Utils.toast.error("No download available for this engine on your system.", {
          title: "Engine Install",
        });
        return;
      }

      await useEngineDownloadStore.getState().startEngineDownload({
        engineId: currentEngineKey,
        version: latestWithDownload.version,
        engineName,
        downloadUrl: latestWithDownload.downloadUrl,
      });

      await loadEngines();
    } catch (err: any) {
      Utils.toast.error(err?.message || "Failed to install engine.", {
        title: "Install Error",
      });
    } finally {
      setIsInstallingEngine(false);
    }
  };

  const isExecutable = useMemo(() => {
    const eid = String(displayCard?.engineId || "").toLowerCase();
    const ename = (engineName || "").toLowerCase();
    return eid === "executable" || eid === "3827" || ename.includes("executable");
  }, [displayCard?.engineId, engineName]);

  useEffect(() => {
    setIsInstalled(Boolean(isInstalledProp));
  }, [isInstalledProp]);

  useEffect(() => {
    if (!isEngineDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (engineDropdownRef.current && !engineDropdownRef.current.contains(e.target as Node)) {
        setIsEngineDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEngineDropdownOpen]);

  useEffect(() => {
    if (!isVersionDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) {
        setIsVersionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVersionDropdownOpen]);

  const handleSelectVersion = useCallback(
    (ver: string) => {
      setSelectedVersion(ver);
      setIsVersionDropdownOpen(false);
      if (onUpdateMod) {
        onUpdateMod({ engineVersion: ver });
      }
    },
    [onUpdateMod]
  );

  const handleSelectEngine = useCallback(
    (cat: { id: string; name: string; icon: string }) => {
      setIsEngineDropdownOpen(false);
      if (cat.name === engineName && cat.id === displayCard?.engineId) return;
      if (onUpdateMod) {
        const defaultEngineId = displayCard?.defaultEngineId || displayCard?.engineId;
        onUpdateMod({
          engineId: cat.id,
          engineName: cat.name,
          icon: cat.icon,
          defaultEngineId: defaultEngineId,
        });
      }
    },
    [engineName, displayCard?.engineId, displayCard?.defaultEngineId, onUpdateMod]
  );

  const isFav = useFavoritesStore(
    (s) => Boolean(displayCard?.id && s.favorites[String(displayCard.id)])
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!displayCard) return;
    toggleFavorite(displayCard);
  }, [displayCard, toggleFavorite]);

  useEffect(() => {
    setActiveTab("description");
  }, [displayCard?.id]);

  const downloadTasks = useDownloadStore((s) => s.tasks);
  const startDownloadTask = useDownloadStore((s) => s.startDownload);
  const cancelDownloadTask = useDownloadStore((s) => s.cancelDownload);

  const downloadProgress = useMemo(() => {
    const map: { [key: string]: number } = {};
    Object.keys(downloadTasks).forEach((key) => {
      map[key] = downloadTasks[key].progress;
    });
    return map;
  }, [downloadTasks]);

  useEffect(() => {
    const checkInstall = async () => {
      if (displayCard?.id) {
        try {
          const mod = await Core.platform.getInstalledMod(displayCard.id.toString());
          if (mod) {
            setIsInstalled(true);
            setInstalledModData(mod);
            setLocalInstalledAt(mod.installedAt);
          } else {
            setIsInstalled(false);
            setInstalledModData(null);
            setLocalInstalledAt(undefined);
          }
        } catch {
          setIsInstalled(false);
          setInstalledModData(null);
          setLocalInstalledAt(undefined);
        }
      }
    };
    checkInstall();

    const handleModsChanged = () => {
      checkInstall();
    };
    window.addEventListener("wb:mods-changed", handleModsChanged);
    const unsubPlatform = Core.platform.onEvent?.("mods:changed", handleModsChanged);

    return () => {
      window.removeEventListener("wb:mods-changed", handleModsChanged);
      unsubPlatform?.();
    };
  }, [displayCard?.id, downloadTasks]);

  const getTimestampMs = useCallback((val: any): number => {
    if (!val) return 0;
    if (typeof val === "number") {
      return val < 10000000000 ? val * 1000 : val;
    }
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const latestModTimestamp = useMemo(() => {
    if (!displayCard) return 0;
    let maxTime = getTimestampMs(displayCard.updatedAt) || getTimestampMs(displayCard.submittedAt);
    if (Array.isArray(displayCard.files)) {
      for (const f of displayCard.files) {
        const fileTime = getTimestampMs(f._tsDateAdded || f.date || f._tsDateModified);
        if (fileTime > maxTime) maxTime = fileTime;
      }
    }
    if (Array.isArray(displayCard.updates)) {
      for (const u of displayCard.updates) {
        const updateTime = getTimestampMs(u._tsDateAdded);
        if (updateTime > maxTime) maxTime = updateTime;
      }
    }
    return maxTime;
  }, [displayCard, getTimestampMs]);

  const installedTimestamp = useMemo(() => {
    return getTimestampMs(localInstalledAt || installedModData?.installedAt);
  }, [localInstalledAt, installedModData?.installedAt, getTimestampMs]);

  const hasUpdate = useMemo(() => {
    if (!isInstalled) return false;
    const hasDateUpdate = installedTimestamp > 0 && latestModTimestamp > installedTimestamp + 60000;
    const currentVersion = displayCard?.version ? String(displayCard.version).trim() : null;
    const installedVersion = installedModData?.version ? String(installedModData.version).trim() : null;
    const hasVersionUpdate = Boolean(currentVersion && installedVersion && currentVersion !== installedVersion);

    return hasDateUpdate || hasVersionUpdate;
  }, [isInstalled, installedTimestamp, latestModTimestamp, displayCard?.version, installedModData?.version]);

  const activeModTask = useMemo(() => {
    if (!displayCard?.id) return null;
    return (
      Object.values(downloadTasks).find(
        (t) => String(t.modId) === String(displayCard.id)
      ) || null
    );
  }, [displayCard?.id, downloadTasks]);

  const isUpdating = Boolean(activeModTask);
  const updateProgress = activeModTask?.progress ?? 0;

  const handleUpdateClick = async () => {
    if (isStorageMigrating) {
      Utils.toast.warning(
        "Cannot update while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }

    const validFilesList = (displayCard?.files || []).filter(
      (f: any) => f._sDownloadUrl && f._sDownloadUrl.trim() !== ""
    );

    if (validFilesList.length === 0) {
      Utils.toast.error("No downloadable files found for this update.", {
        title: "Update Unavailable",
      });
      return;
    }

    const sortedFiles = [...validFilesList].sort((a: any, b: any) => {
      const timeA = getTimestampMs(a._tsDateAdded || a.date || a._tsDateModified);
      const timeB = getTimestampMs(b._tsDateAdded || b.date || b._tsDateModified);
      return timeB - timeA;
    });

    const fileToDownload = sortedFiles[0];
    if (sortedFiles.length > 1) {
      Utils.toast.info(`Updating with latest release: "${fileToDownload._sFile || "Latest file"}"`, {
        title: "Mod Update",
      });
    }

    await handleDownload(fileToDownload._sDownloadUrl, String(fileToDownload._idRow));
  };

  const executeUninstall = async () => {
    if (!displayCard?.id) return;
    if (useStorageMigrationStore.getState().isMigrating) {
      Utils.toast.warning(
        "Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }
    setIsUninstalling(true);
    try {
      await Core.platform.uninstallMod(displayCard.id.toString());
      setIsInstalled(false);
      setLocalInstalledAt(undefined);
      Utils.toast.success(`"${displayCard.name}" uninstalled successfully!`, {
        title: "Mod Uninstalled",
      });
    } catch (e: any) {
      Utils.toast.error(e?.message || "Failed to uninstall mod.", {
        title: "Uninstall Error",
      });
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!displayCard?.id) return;
    if (useStorageMigrationStore.getState().isMigrating) {
      Utils.toast.warning(
        "Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }
    if (useSettingsStore.getState().isWarningDismissed("delete-mod")) {
      await executeUninstall();
    } else {
      setIsUninstallConfirmOpen(true);
    }
  };

  const isLoading = displayCard?.files === undefined;
  const validFiles = Object.values(displayCard?.files || {}).filter((file: any) => file._nFilesize >= 5 * 1024 * 1024);
  const hasMultipleFiles = validFiles.length > 1;
  const hasNoFiles = validFiles.length === 0;

  const singleFileId = validFiles[0]?._idRow;
  const singleFileTask = singleFileId ? downloadTasks[singleFileId] : undefined;
  const singleFileProgress = singleFileTask ? singleFileTask.progress : undefined;
  const singleFileStatus = singleFileTask ? singleFileTask.status : undefined;
  const singleFileDownloaded = singleFileTask?.downloaded;
  const singleFileTotal = singleFileTask?.total || validFiles[0]?._nFilesize;
  const singleFileCurrentFile = singleFileTask?.currentFile;

  const activeDownloadsCount = useMemo(() => {
    return validFiles.filter((file: any) => {
      const task = downloadTasks[file._idRow];
      const prog = task ? task.progress : downloadProgress[file._idRow];
      return prog !== undefined && prog >= 0 && prog < 100;
    }).length;
  }, [validFiles, downloadTasks, downloadProgress]);

  const handleDownload = async (url: string, id: string) => {
    if (downloadTasks[id] !== undefined) {
      cancelDownloadTask(id);
      return;
    }

    if (isStorageMigrating) {
      Utils.toast.warning("Storage migration in progress. Downloads are temporarily disabled.", {
        title: "Storage Relocation",
      });
      return;
    }

    if (!displayCard?.id) return;
    const card = displayCard as any;
    const payload = {
      id: displayCard.id,
      gameId: card.gameId,
      name: displayCard.name,
      title: displayCard.name,
      description: displayCard.description,
      htmlBody: displayCard.htmlBody,
      author: displayCard.author,
      userId: card.userId,
      userPfp: card.userPfp,
      authors: displayCard.authors || card.authors,
      credits: displayCard.credits,
      version: displayCard.version,
      updatesCount: displayCard.updatesCount,
      updates: displayCard.updates,
      externalLinks: displayCard.externalLinks,
      studio: displayCard.studio,
      categoryName: displayCard.categoryName,
      engineId: displayCard.engineId,
      engineName: engineName,
      defaultEngineId: displayCard.defaultEngineId || displayCard.engineId,
      likes: displayCard.likes ?? card.likes,
      views: displayCard.views ?? card.views,
      downloads: displayCard.downloads ?? card.downloads,
      submittedAt: displayCard.submittedAt || card.submittedAt,
      updatedAt: displayCard.updatedAt || card.updatedAt,
      timeAgo: card.timeAgo,
      thumbnail: card.thumbnail || displayCard.img,
      img: displayCard.img,
      icon: displayCard.icon,
      isNsfw: displayCard.isNsfw ?? card.isNsfw,
      previewMedia: displayCard.previewMedia,
      files: displayCard.files,
      downloadedFileId: id,
      installedFileId: id,
      installedAt: Date.now(),
      formatDate,
      formatFullDate,
    };

    await startDownloadTask({
      url,
      fileId: id,
      modId: displayCard.id.toString(),
      modName: displayCard.name,
      payload,
    });

    if (displayCard.id) {
      Core.platform.getInstalledMod(displayCard.id.toString()).then((mod: any) => {
        setIsInstalled(Boolean(mod));
        if (mod?.installedAt) setLocalInstalledAt(mod.installedAt);
      }).catch(() => {});
    }
  };

  const handleManage = async () => {
    if (!displayCard?.id) return;
    if (useStorageMigrationStore.getState().isMigrating) {
      Utils.toast.warning(
        "Cannot launch game while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }
    try {
      const modsDir = (await Core.platform.getModsPath?.()) || "";
      const safeName = (displayCard.name || "unknown")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

      const modPath = `${modsDir}/mod_${displayCard.id}_${safeName}`;
      const engId = displayCard.engineId || "vslice";

      if (engId === "executable" || engId === "3827") {
        if (isMobilePlatform) {
          Utils.toast.warning("Executable mods (.exe) cannot be launched on mobile devices.", {
            title: "Incompatible Platform",
          });
          return;
        }
      }

      let targetFolder = modPath;
      let modFolderPath: string | undefined = undefined;
      let args: string[] | undefined = undefined;

      if (Core.platform.platformName === "capacitor") {
        targetFolder = engId || "vslice";
        modFolderPath = modPath;
      } else if (engId && engId !== "executable" && engId !== "3827") {
        const enginesDir = (await Core.platform.getEnginesPath?.()) || "";
        const engVer =
          selectedVersion && selectedVersion !== "Any version" && selectedVersion !== "any"
            ? selectedVersion
            : installedEngineVersions[0] || "latest";
        targetFolder = `${enginesDir}/${engId}/${engVer}`;
        modFolderPath = modPath;

        const isCodename =
          String(engId).toLowerCase() === "codename" ||
          String(engId).toLowerCase() === "34764" ||
          String(engineName || "").toLowerCase().includes("codename");

        if (isCodename) {
          const modFolderName = `mod_${displayCard.id}_${safeName}`;
          args = ["-mod", modFolderName];
        }
      }

      await useProcessStore.getState().launchInstance(modInstanceKey, targetFolder, {
        modFolderPath,
        args,
      });
    } catch {
      Utils.toast.error("Could not launch mod.", {
        title: "Launch Error",
      });
    }
  };

  const handleStop = async () => {
    if (!displayCard?.id) return;
    await useProcessStore.getState().stopInstance(modInstanceKey);
  };

  const handleOpenFolder = async () => {
    if (!displayCard?.id) return;
    try {
      const modsDir = (await Core.platform.getModsPath?.()) || "";
      const safeName = (displayCard.name || "unknown")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
      const modPath = `${modsDir}/mod_${displayCard.id}_${safeName}`;
      await Core.platform.openUrl?.(modPath);
    } catch (err) {
      Utils.toast.error("Could not open mod folder.", { title: "Error" });
    }
  };

  return {
    viewportWidth,
    isMobile,
    isInstalled,
    localInstalledAt,
    installedModData,
    isUninstalling,
    isUninstallConfirmOpen,
    setIsUninstallConfirmOpen,
    executeUninstall,
    handleUninstall,
    modInstanceKey,
    playStatus,
    isStorageMigrating,
    activeTab,
    setActiveTab,
    isDropdownOpen,
    authorAvatar,
    avatarError,
    setAvatarError,
    mobileContainerRef,
    isHeaderVisible,
    isEditingTitle,
    setIsEditingTitle,
    titleInput,
    setTitleInput,
    handleSaveTitle,
    isEditingDesc,
    setIsEditingDesc,
    descInput,
    setDescInput,
    handleSaveDesc,
    isEngineDropdownOpen,
    setIsEngineDropdownOpen,
    engineDropdownRef,
    handleSelectEngine,
    isVersionDropdownOpen,
    setIsVersionDropdownOpen,
    versionDropdownRef,
    selectedVersion,
    handleSelectVersion,
    installedEnginesRegistry,
    installedEngineVersions,
    isInstallingEngine,
    isEngineInstalledOnDevice,
    handleInstallLatestEngine,
    isExecutable,
    isFav,
    handleToggleFavorite,
    downloadTasks,
    downloadProgress,
    hasUpdate,
    activeModTask,
    isUpdating,
    updateProgress,
    handleUpdateClick,
    isLoading,
    validFiles,
    hasMultipleFiles,
    hasNoFiles,
    singleFileId,
    singleFileTask,
    singleFileProgress,
    singleFileStatus,
    singleFileDownloaded,
    singleFileTotal,
    singleFileCurrentFile,
    activeDownloadsCount,
    handleDownload,
    handleManage,
    handleStop,
    handleOpenFolder,
    hoverTooltip,
    setHoverTooltip,
  };
}

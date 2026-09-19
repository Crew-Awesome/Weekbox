import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ExternalLink,
  Plus,
  RefreshCw,
  Download,
  List,
  ChevronUp,
  Loader2,
  Trash2,
  HardDrive,
  Languages,
  Heart,
  Pencil,
  ChevronDown,
  Tag,
  Play,
  Square,
  Activity,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { type ModalViewProps, formatFileSize } from "./types";
import { ModMediaCarousel, ModThumbnailStrip } from "./components/mod-media-carousel";
import { ModNavPills, type ModModalTab } from "./components/mod-nav-pills";
import { ModCreditsView } from "./components/mod-credits-view";
import { ModDetailsTab } from "./components/mod-details-tab";
import Core from "@core";
import Utils from "@utils";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";
import {
  useDownloadStore,
  DownloadStatus,
  useFavoritesStore,
  useEngineDownloadStore,
  useProcessStore,
  useSettingsStore,
  useStorageMigrationStore,
} from "../../../../store";
import { ConfirmationModal } from "@components";

interface DesktopViewProps extends ModalViewProps {
  carouselRef: React.RefObject<HTMLDivElement | null>;
  thumbnailsRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Desktop specific render for the Mod Details Modal.
 * Includes the 3D overlapping layout and dual absolute layers.
 */
export const DesktopView: React.FC<DesktopViewProps> = ({
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  activeIndex,
  scrollToIndex,
  prevImage,
  nextImage,
  onMouseEnterCarousel,
  onMouseLeaveCarousel,
  carouselRef,
  thumbnailsRef,
  translatedHtml = null,
  isTranslating = false,
  showTranslated = true,
  setShowTranslated = () => {},
  onManualTranslate,
  targetLanguage = "en",
  isInstalled: isInstalledProp = false,
  onUpdateMod,
}) => {
  const [hoverTooltip, setHoverTooltip] = useState<"submitted" | "updated" | "installed" | null>(null);
  const [isInstalled, setIsInstalled] = useState(Boolean(isInstalledProp));
  const [localInstalledAt, setLocalInstalledAt] = useState<number | undefined>(displayCard.installedAt);
  const [installedModData, setInstalledModData] = useState<any | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false);
  const modInstanceKey = `mod:${displayCard.id}`;
  const playStatus = useProcessStore((s) => s.getPlayState(modInstanceKey));
  const isStorageMigrating = useStorageMigrationStore((s) => s.isMigrating);
  const [activeTab, setActiveTab] = useState<ModModalTab>("description");
  const isDropdownOpen = activeTab === "details";

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(displayCard.name || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(displayCard.htmlBody || displayCard.description || "");
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const engineDropdownRef = useRef<HTMLDivElement>(null);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>(
    (displayCard as any).engineVersion || ""
  );

  const [installedEnginesRegistry, setInstalledEnginesRegistry] = useState<
    Record<string, Record<string, any>>
  >({});
  const [isInstallingEngine, setIsInstallingEngine] = useState<boolean>(false);

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

  const currentEngineKey = String(displayCard.engineId || "vslice").toLowerCase();
  const installedEngineVersions = React.useMemo(() => {
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

  const isExecutable = React.useMemo(() => {
    const eid = String(displayCard.engineId || "").toLowerCase();
    const ename = (engineName || "").toLowerCase();
    return eid === "executable" || eid === "3827" || ename.includes("executable");
  }, [displayCard.engineId, engineName]);

  useEffect(() => {
    setIsInstalled(Boolean(isInstalledProp));
  }, [isInstalledProp]);

  useEffect(() => {
    setTitleInput(displayCard.name || "");
    setIsEditingTitle(false);
  }, [displayCard.id, displayCard.name]);

  useEffect(() => {
    setDescInput(displayCard.htmlBody || displayCard.description || "");
    setIsEditingDesc(false);
  }, [displayCard.id, displayCard.htmlBody, displayCard.description]);

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

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === displayCard.name) {
      setTitleInput(displayCard.name || "");
      return;
    }
    if (onUpdateMod) {
      onUpdateMod({ name: trimmed, title: trimmed });
      Utils.toast.success("Mod title updated", { duration: 2500 });
    }
  }, [titleInput, displayCard.name, onUpdateMod]);

  const handleSaveDesc = useCallback(() => {
    setIsEditingDesc(false);
    if (descInput === (displayCard.htmlBody || displayCard.description || "")) {
      return;
    }
    if (onUpdateMod) {
      onUpdateMod({ htmlBody: descInput });
      Utils.toast.success("Mod description updated", { duration: 2500 });
    }
  }, [descInput, displayCard.htmlBody, displayCard.description, onUpdateMod]);

  const handleSelectEngine = useCallback(
    (cat: { id: string; name: string; icon: string }) => {
      setIsEngineDropdownOpen(false);
      if (cat.name === engineName && cat.id === displayCard.engineId) return;
      if (onUpdateMod) {
        const defaultEngineId = displayCard.defaultEngineId || displayCard.engineId;
        onUpdateMod({
          engineId: cat.id,
          engineName: cat.name,
          icon: cat.icon,
          defaultEngineId: defaultEngineId,
        });
      }
    },
    [engineName, displayCard.engineId, displayCard.defaultEngineId, onUpdateMod]
  );

  const isFav = useFavoritesStore(
    (s) => Boolean(displayCard?.id && s.favorites[String(displayCard.id)])
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(displayCard);
  }, [displayCard, toggleFavorite]);

  useEffect(() => {
    setActiveTab("description");
  }, [displayCard.id]);

  const downloadTasks = useDownloadStore((s) => s.tasks);
  const startDownloadTask = useDownloadStore((s) => s.startDownload);
  const cancelDownloadTask = useDownloadStore((s) => s.cancelDownload);

  const downloadProgress = React.useMemo(() => {
    const map: { [key: string]: number } = {};
    Object.keys(downloadTasks).forEach((key) => {
      map[key] = downloadTasks[key].progress;
    });
    return map;
  }, [downloadTasks]);


  useEffect(() => {
    const checkInstall = async () => {
      if (displayCard.id) {
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
  }, [displayCard.id, downloadTasks]);

  /* Helper to normalize numeric or string dates to epoch milliseconds */
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
    /* Compare latest update date with installed date (with 60s buffer) */
    const hasDateUpdate = installedTimestamp > 0 && latestModTimestamp > installedTimestamp + 60000;
    /* Also check version difference if available */
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

    const validFiles = (displayCard.files || []).filter(
      (f: any) => f._sDownloadUrl && f._sDownloadUrl.trim() !== ""
    );

    if (validFiles.length === 0) {
      Utils.toast.error("No downloadable files found for this update.", {
        title: "Update Unavailable",
      });
      return;
    }

    /* Sort files by date descending to find the latest file */
    const sortedFiles = [...validFiles].sort((a: any, b: any) => {
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
    
    if (!displayCard.id) return;
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
      formatDate: formatDate,
      formatFullDate: formatFullDate,
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
    if (!displayCard.id) return;
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

      let targetFolder = modPath;
      let modFolderPath: string | undefined = undefined;
      let args: string[] | undefined = undefined;

      if (engId && engId !== "executable" && engId !== "3827") {
        const enginesDir = (await Core.platform.getEnginesPath?.()) || "";
        const engVer =
          selectedVersion && selectedVersion !== "Any version" && selectedVersion !== "any"
            ? selectedVersion
            : installedEngineVersions[0] || "latest";
        targetFolder = `${enginesDir}/${engId}/${engVer}`;
        modFolderPath = modPath;

        /* Pass -mod parameter when launching mod in Codename Engine */
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
    if (!displayCard.id) return;
    await useProcessStore.getState().stopInstance(modInstanceKey);
  };

  const executeUninstall = async () => {
    if (!displayCard.id) return;
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
    if (!displayCard.id) return;
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

  const isLoading = displayCard.files === undefined;
  const validFiles = Object.values(displayCard.files || {}).filter((file: any) => file._nFilesize >= 5 * 1024 * 1024);
  const hasMultipleFiles = validFiles.length > 1;
  const hasNoFiles = validFiles.length === 0;
  
  const singleFileId = validFiles[0]?._idRow;
  const singleFileTask = singleFileId ? downloadTasks[singleFileId] : undefined;
  const singleFileProgress = singleFileTask ? singleFileTask.progress : undefined;
  const singleFileStatus = singleFileTask ? singleFileTask.status : undefined;
  const singleFileDownloaded = singleFileTask?.downloaded;
  const singleFileTotal = singleFileTask?.total || validFiles[0]?._nFilesize;
  const singleFileCurrentFile = singleFileTask?.currentFile;

  const activeDownloadsCount = React.useMemo(() => {
    return validFiles.filter((file: any) => {
      const task = downloadTasks[file._idRow];
      const prog = task ? task.progress : downloadProgress[file._idRow];
      return prog !== undefined && prog >= 0 && prog < 100;
    }).length;
  }, [validFiles, downloadTasks, downloadProgress]);

  return (
    <div className="hidden md:block w-full h-full relative">
      {displayCard && displayCard.previewMedia && displayCard.previewMedia.length > 1 && (
        <div
          onMouseEnter={onMouseEnterCarousel}
          onMouseLeave={onMouseLeaveCarousel}
          className="absolute top-[60%] md:top-[55%] bottom-6 left-2 md:bottom-10 md:left-4 w-[calc(100%-1rem)] md:w-[calc(60%+3rem)] p-4 md:p-6 md:pr-16 md:pt-12 z-0 flex items-end justify-start pointer-events-auto bg-[var(--wb-surface-container-lowest)] rounded-bl-3xl"
        >
          <ModThumbnailStrip
            media={displayCard.previewMedia}
            activeIndex={activeIndex}
            onSelectIndex={scrollToIndex}
            stripRef={thumbnailsRef}
            onPrev={prevImage}
            onNext={nextImage}
            variant="desktop"
          />
        </div>
      )}

      <div className="flex flex-col h-full overflow-hidden text-[var(--wb-on-surface)] w-full relative z-10 pointer-events-none">
        <div className="relative z-30 flex items-center px-4 md:px-6 pt-2 pb-3 md:pt-3 md:pb-4 shrink-0 bg-[var(--wb-surface-container)] min-h-[56px] pr-16 md:pr-4 rounded-t-2xl pointer-events-auto">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap z-10">
            <a href={`https://gamebanana.com/mods/${displayCard.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--wb-surface-bright)] hover:bg-white/10 transition-colors relative group shrink-0">
              <img src="/assets/icons/app/gamebanana.webp" alt="GameBanana" className="w-4 h-4 object-contain opacity-80" />
              <div className="absolute -bottom-1 -right-1 bg-[var(--wb-surface-container)] rounded-full p-[2px]">
                <ExternalLink className="w-3 h-3 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-on-surface)]" />
              </div>
            </a>
            <div className="w-[1px] h-5 bg-[var(--wb-outline-variant)]/40 mx-0.5" />
            {displayCard.icon && (
              <div className="relative z-40 shrink-0" ref={engineDropdownRef}>
                <div
                  onClick={() => isInstalled && setIsEngineDropdownOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] border border-[var(--wb-primary)]/30 shrink-0 ${
                    isInstalled ? "cursor-pointer hover:bg-[var(--wb-primary)]/25 transition-all select-none group" : ""
                  }`}
                  title={isInstalled ? "Click to change engine" : engineName}
                >
                  <img src={displayCard.icon} alt={engineName} className="w-4 h-4 object-contain brightness-150 shrink-0" />
                  <span className="text-xs md:text-sm font-semibold leading-none truncate max-w-[120px]">{engineName}</span>
                  {isInstalled && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                        isEngineDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </div>

                {isInstalled && isEngineDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {Object.values(ENGINE_CATEGORIES).map((cat) => {
                      const isSelected =
                        String(cat.id).toLowerCase() === String(displayCard.engineId).toLowerCase() ||
                        cat.name.toLowerCase() === engineName.toLowerCase();
                      const defaultEngineId = displayCard.defaultEngineId || displayCard.engineId;
                      const isDefault =
                        Boolean(defaultEngineId) &&
                        (String(cat.id).toLowerCase() === String(defaultEngineId).toLowerCase() ||
                         cat.name.toLowerCase() === String(defaultEngineId).toLowerCase());
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectEngine(cat)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left w-full ${
                            isSelected
                              ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                              : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                          }`}
                        >
                          <img src={cat.icon} alt={cat.name} className="w-4 h-4 object-contain brightness-125 shrink-0" />
                          <span className="truncate">{cat.name}</span>
                          {isDefault && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                              Default
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!isExecutable && isInstalled && (
              installedEngineVersions.length > 0 ? (
                <div className="relative z-40 shrink-0" ref={versionDropdownRef}>
                  <div
                    onClick={() => setIsVersionDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-surface-bright)]/70 hover:bg-[var(--wb-surface-bright)] text-[var(--wb-on-surface)] border border-[var(--wb-outline-variant)]/40 hover:border-[var(--wb-primary)]/40 shrink-0 cursor-pointer transition-all select-none group"
                    title="Select engine version"
                  >
                    <Tag className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                    <span className="text-xs md:text-sm font-semibold leading-none truncate max-w-[100px]">
                      {selectedVersion || "Any version"}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                        isVersionDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {isVersionDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-2 py-1 text-[10px] font-bold text-[var(--wb-on-surface-variant)] uppercase tracking-wider">
                        Installed Versions
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectVersion("Any version")}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left w-full transition-colors ${
                          selectedVersion === "Any version" || selectedVersion === "any"
                            ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                            : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Layers className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                          <span className="truncate">Any version</span>
                        </div>
                        {(selectedVersion === "Any version" || selectedVersion === "any") && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                            Selected
                          </span>
                        )}
                      </button>
                      {installedEngineVersions.map((ver, idx) => {
                        const isSelected = selectedVersion === ver;
                        return (
                          <button
                            key={ver}
                            type="button"
                            onClick={() => handleSelectVersion(ver)}
                            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left w-full transition-colors ${
                              isSelected
                                ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                                : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Tag className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                              <span className="truncate">{ver}</span>
                            </div>
                            {idx === 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                                Default
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallLatestEngine}
                  disabled={isInstallingEngine}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] shrink-0 cursor-pointer transition-all select-none shadow-sm text-xs md:text-sm font-bold active:scale-95 disabled:opacity-50"
                  title={`Install latest version of ${engineName}`}
                >
                  {isInstallingEngine ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Download className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Install Engine</span>
                </button>
              )
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none hidden md:flex">
            <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
              <div 
                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs select-none cursor-default"
                onMouseEnter={() => setHoverTooltip("submitted")}
                onMouseLeave={() => setHoverTooltip(null)}
              >
                <Plus className="w-3 h-3" />
                <span>{formatDate(displayCard.submittedAt)}</span>
                <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "submitted" ? "opacity-100" : "opacity-0"}`}>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[var(--wb-surface-container-highest)]"></div>
                  <div className="bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                    Submitted: {formatFullDate(displayCard.submittedAt)}
                  </div>
                </div>
              </div>

              {displayCard.updatedAt && displayCard.updatedAt !== displayCard.submittedAt && (
                <div 
                  className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs select-none cursor-default"
                  onMouseEnter={() => setHoverTooltip("updated")}
                  onMouseLeave={() => setHoverTooltip(null)}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{formatDate(displayCard.updatedAt)}</span>
                  <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "updated" ? "opacity-100" : "opacity-0"}`}>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[var(--wb-surface-container-highest)]"></div>
                    <div className="bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                      Updated: {formatFullDate(displayCard.updatedAt)}
                    </div>
                  </div>
                </div>
              )}

              {isInstalled && localInstalledAt && (
                <div 
                  className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs select-none cursor-default"
                  onMouseEnter={() => setHoverTooltip("installed")}
                  onMouseLeave={() => setHoverTooltip(null)}
                >
                  <HardDrive className="w-3 h-3 text-[var(--wb-primary)]" />
                  <span>Installed: {formatDate(localInstalledAt)}</span>
                  <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "installed" ? "opacity-100" : "opacity-0"}`}>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[var(--wb-surface-container-highest)]"></div>
                    <div className="bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                      Installed: {formatFullDate(localInstalledAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full relative z-10 min-h-0">
          <div className="w-full md:w-[60%] flex flex-col shrink-0 relative z-10 min-h-0">
            <div className="w-full bg-[var(--wb-surface-container)] rounded-bl-2xl flex flex-col p-4 md:p-6 pb-6 md:pb-8 relative pointer-events-auto">
              <ModMediaCarousel
                media={displayCard.previewMedia}
                fallbackImage={displayCard.img}
                title={displayCard.name}
                showCaption={true}
                activeIndex={activeIndex}
                carouselRef={carouselRef}
                onPrev={prevImage}
                onNext={nextImage}
                onMouseEnter={onMouseEnterCarousel}
                onMouseLeave={onMouseLeaveCarousel}
              />
              <div className="absolute -bottom-6 -right-[1px] w-[calc(1.5rem+1px)] h-6 pointer-events-none hidden md:block">
                 <svg viewBox="0 0 24 24" className="w-full h-full fill-[var(--wb-surface-container)]" preserveAspectRatio="none"><path d="M 0 0 C 13 0 24 11 24 24 L 24 0 Z" /></svg>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[40%] flex flex-col bg-[var(--wb-surface-container)] p-4 md:p-6 overflow-hidden relative rounded-b-2xl z-0 min-h-0 h-full pointer-events-auto">
            <div className="shrink-0 flex flex-col">
              <div className="flex items-start gap-3">
                {isEditingTitle ? (
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") {
                          setTitleInput(displayCard.name || "");
                          setIsEditingTitle(false);
                        }
                      }}
                      autoFocus
                      className="w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg px-3 py-1.5 text-2xl md:text-3xl font-bold text-[var(--wb-on-surface)] outline-none font-display shadow-inner"
                      placeholder="Mod title..."
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => isInstalled && setIsEditingTitle(true)}
                    className={`group flex-1 min-w-0 ${isInstalled ? "cursor-pointer" : ""}`}
                    title={isInstalled ? "Click to edit title" : displayCard.name}
                  >
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--wb-on-surface)] leading-tight font-display break-words line-clamp-2">
                      <span>{displayCard.name}</span>
                      {isInstalled && (
                        <span className="inline-flex items-center align-middle ml-2 opacity-60 group-hover:opacity-100 group-hover:text-[var(--wb-primary)] transition-all">
                          <Pencil className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                        </span>
                      )}
                    </h1>
                  </div>
                )}
              </div>
              {displayCard.description && (
                <p className="text-[var(--wb-on-surface-variant)] text-xs md:text-sm mt-1.5 line-clamp-2 leading-relaxed opacity-85">
                  {displayCard.description}
                </p>
              )}
              <span className="text-[var(--wb-on-surface-variant)] text-xs md:text-sm mt-1 block">
                by {displayCard.author || "Unknown"}
              </span>
              <ModNavPills
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                contributorsCount={displayCard.credits?.reduce((acc, g) => acc + g.authors.length, 0) || displayCard.authors?.length}
                filesCount={validFiles.length}
                extraActions={
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    title={isFav ? "Remove from favorites" : "Add to favorites"}
                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                    className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-100 cursor-pointer ml-0.5 ${
                      isFav
                        ? "bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25"
                        : "bg-[var(--wb-surface-bright)]/60 border-transparent hover:border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface-variant)] hover:text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-100 active:scale-125 ${
                        isFav ? "fill-red-500 text-red-500" : "fill-transparent"
                      }`}
                    />
                  </button>
                }
              />
              <hr className="border-[var(--wb-outline-variant)]/30 my-3 md:my-4" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 pr-1">
              {activeTab === "description" && (
                <div className="flex flex-col">
                  {/** Top toolbar: Edit description + Translation pill */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {isInstalled && !isEditingDesc && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDesc(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-primary)] transition-colors cursor-pointer border border-white/5 shrink-0"
                        title="Edit description"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                        <span>Edit description</span>
                      </button>
                    )}

                    {isTranslating ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] text-xs font-semibold border border-[var(--wb-primary)]/20 shrink-0 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Translating...</span>
                      </div>
                    ) : translatedHtml ? (
                      <button
                        type="button"
                        onClick={() => setShowTranslated(!showTranslated)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-primary)]/15 hover:bg-[var(--wb-primary)]/25 text-[var(--wb-primary)] text-xs font-semibold border border-[var(--wb-primary)]/30 transition-all cursor-pointer shrink-0"
                        title={showTranslated ? "Click to show original description" : "Click to show translated description"}
                      >
                        <Languages className="w-3.5 h-3.5 shrink-0" />
                        <span>{showTranslated ? `Translated (${targetLanguage === "es" ? "ES" : "EN"})` : "Show Translation"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onManualTranslate}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer border border-white/5 shrink-0"
                        title={`Translate description to ${targetLanguage === "es" ? "Spanish" : "English"}`}
                      >
                        <Languages className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                        <span>Translate to {targetLanguage === "es" ? "Spanish" : "English"}</span>
                      </button>
                    )}
                  </div>

                  {isEditingDesc ? (
                    <div className="flex flex-col gap-2 pb-4">
                      <textarea
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        onBlur={handleSaveDesc}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setDescInput(displayCard.description || "");
                            setIsEditingDesc(false);
                          }
                        }}
                        autoFocus
                        rows={7}
                        className="w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg p-3 text-sm md:text-base text-[var(--wb-on-surface)] outline-none custom-scrollbar resize-y shadow-inner font-sans"
                        placeholder="Enter custom mod description..."
                      />
                      <div className="flex items-center justify-between text-[11px] text-[var(--wb-on-surface-variant)] px-1">
                        <span>Click outside or press Escape to finish</span>
                        <button
                          type="button"
                          onClick={handleSaveDesc}
                          className="px-2.5 py-1 rounded-md bg-[var(--wb-primary)]/20 hover:bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : displayCard.htmlBody ? (
                    <div
                      onClick={() => isInstalled && setIsEditingDesc(true)}
                      className={`text-[var(--wb-on-surface-variant)] prose prose-invert prose-sm md:prose-base max-w-full pb-4 overflow-x-hidden break-words [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_table]:block [&_table]:overflow-x-auto ${
                        isInstalled ? "cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1" : ""
                      }`}
                      title={isInstalled ? "Click to edit description" : undefined}
                      dangerouslySetInnerHTML={{
                        __html: showTranslated && translatedHtml ? translatedHtml : displayCard.htmlBody,
                      }}
                    />
                  ) : (
                    <p
                      onClick={() => isInstalled && setIsEditingDesc(true)}
                      className={`text-[var(--wb-on-surface-variant)] text-sm md:text-base pb-4 break-words ${
                        isInstalled ? "cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1" : ""
                      }`}
                      title={isInstalled ? "Click to edit description" : undefined}
                    >
                      {showTranslated && translatedHtml ? translatedHtml : displayCard.description}
                    </p>
                  )}
                </div>
              )}
              {activeTab === "contributors" && (
                <ModCreditsView
                  credits={displayCard.credits}
                  authors={displayCard.authors}
                  author={displayCard.author}
                />
              )}
              {activeTab === "details" && (
                <ModDetailsTab
                  displayCard={{
                    ...displayCard,
                    installedAt: localInstalledAt || displayCard.installedAt,
                  }}
                  engineName={engineName}
                  formatDate={formatDate}
                  formatFullDate={formatFullDate}
                  onDownloadFile={handleDownload}
                  onManageFile={handleManage}
                  isInstalled={isInstalled}
                />
              )}
            </div>
            <div 
              className="pt-4 md:pt-6 mt-auto shrink-0 bg-[var(--wb-surface-container)]"
            >
              <div className="relative w-full">
                {isInstalled ? (
                  <div className="flex gap-3 w-full">
                    {(hasUpdate || isUpdating) && (
                      isUpdating ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 bg-amber-500/25 border border-amber-500/40 text-amber-300 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold cursor-wait animate-pulse"
                        >
                          <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-amber-400" />
                          <span className="text-base md:text-lg">
                            {updateProgress > 0 ? `Updating ${updateProgress}%` : "Updating..."}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleUpdateClick}
                          disabled={isStorageMigrating}
                          className={`flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 transition-all duration-300 font-black shadow-lg hover:scale-102 active:scale-98 cursor-pointer ${
                            isStorageMigrating ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
                          }`}
                          title="New version or update available for this mod"
                        >
                          <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                          <span className="text-base md:text-lg">Update</span>
                        </button>
                      )
                    )}
                    {playStatus === "launching" ? (
                      <button
                        disabled
                        className="flex-1 bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold cursor-not-allowed border border-white/10"
                      >
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-[var(--wb-primary)]" />
                        <span className="text-base md:text-lg">Launching...</span>
                      </button>
                    ) : playStatus === "playing" ? (
                      <button
                        onClick={handleStop}
                        className="flex-1 bg-emerald-600/30 hover:bg-rose-600/30 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold cursor-pointer transition-all group"
                        title="Click to stop process"
                      >
                        <Activity className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 group-hover:hidden animate-pulse" />
                        <Square className="w-5 h-5 md:w-6 md:h-6 fill-current text-rose-400 hidden group-hover:inline" />
                        <span className="text-base md:text-lg group-hover:hidden">Playing</span>
                        <span className="text-base md:text-lg hidden group-hover:inline">Stop</span>
                      </button>
                    ) : playStatus === "stopping" ? (
                      <button
                        disabled
                        className="flex-1 bg-amber-600/30 text-amber-300 border border-amber-500/40 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold cursor-not-allowed"
                      >
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-amber-400" />
                        <span className="text-base md:text-lg">Stopping...</span>
                      </button>
                    ) : playStatus === "error" ? (
                      <button
                        disabled
                        className="flex-1 bg-rose-600/30 text-rose-300 border border-rose-500/40 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold cursor-not-allowed animate-in fade-in"
                      >
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-rose-400" />
                        <span className="text-base md:text-lg">Error</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleManage}
                        className={`flex-1 bg-[var(--wb-primary)] text-[var(--wb-on-primary)] py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 transition-all duration-300 font-bold ${
                          isStorageMigrating
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:opacity-90 cursor-pointer"
                        }`}
                        title={
                          isStorageMigrating
                            ? "Cannot launch game while storage migration is in progress"
                            : "Play mod"
                        }
                      >
                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                        <span className="text-base md:text-lg">Play</span>
                      </button>
                    )}
                    <button 
                      onClick={handleUninstall}
                      disabled={isUninstalling}
                      className={`flex-1 bg-red-500/10 text-red-400 py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 transition-all duration-300 font-bold border border-red-500/20 ${
                        isStorageMigrating
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-red-500/20 cursor-pointer"
                      }`}
                      title={
                        isStorageMigrating
                          ? "Cannot uninstall while storage migration is in progress"
                          : "Uninstall mod"
                      }
                    >
                      {isUninstalling ? (
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                      )}
                      <span className="text-base md:text-lg">{isUninstalling ? "Uninstalling..." : "Uninstall"}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {isLoading ? (
                      <button 
                        disabled
                        className="w-full bg-[var(--wb-primary)] text-[var(--wb-on-primary)] py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold opacity-80 cursor-wait"
                      >
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                        <span className="text-base md:text-lg">Loading...</span>
                      </button>
                    ) : hasNoFiles ? (
                      <button 
                        disabled
                        className="w-full bg-[var(--wb-surface-variant)] text-[var(--wb-on-surface-variant)] cursor-not-allowed py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 font-bold opacity-60 select-none pointer-events-auto transition-none shadow-none hover:bg-[var(--wb-surface-variant)] hover:opacity-60 hover:transform-none active:transform-none"
                      >
                        <Download className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" />
                        <span className="text-base md:text-lg pointer-events-none">No downloads available</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          if (isStorageMigrating) return;
                          if (hasMultipleFiles) {
                            setActiveTab("details");
                          } else if (validFiles.length === 1) {
                            handleDownload(validFiles[0]._sDownloadUrl, validFiles[0]._idRow.toString());
                          }
                        }}
                        disabled={(!hasMultipleFiles && singleFileProgress === -1) || isStorageMigrating}
                        className={`${!hasMultipleFiles && singleFileProgress === -1 ? "opacity-80 cursor-wait" : isStorageMigrating ? "opacity-50 cursor-not-allowed" : "group"} relative w-full bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] py-3 md:py-4 rounded-xl flex items-center justify-center px-6 transition-all duration-300 font-bold overflow-hidden`}
                      >
                        {!hasMultipleFiles && singleFileProgress !== undefined && singleFileProgress >= 0 && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-black/20 pointer-events-none transition-all duration-300" 
                            style={{ width: `${singleFileProgress}%` }} 
                          />
                        )}
                        
                        {!hasMultipleFiles && singleFileProgress !== undefined && singleFileProgress >= 0 && singleFileProgress < 100 && (
                          <div className="absolute inset-0 bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                            <span className="text-white font-bold text-base md:text-lg">Cancel Download</span>
                          </div>
                        )}
                        
                        {hasMultipleFiles ? (
                          <>
                            <div className="flex items-center justify-center gap-2 md:gap-3 relative z-10">
                              <List className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="text-base md:text-lg leading-tight font-bold">Multiple Files</span>
                                {activeDownloadsCount > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold opacity-90 mt-0.5">
                                    <span>Active Downloads</span>
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--wb-on-primary)] text-[var(--wb-primary)] text-[10px] font-black leading-none shadow-sm">
                                      {activeDownloadsCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronUp className={`absolute right-6 w-5 h-5 md:w-6 md:h-6 transition-transform relative z-10 ${isDropdownOpen ? "rotate-180" : ""}`} />
                          </>
                        ) : (
                          <div className={`flex items-center justify-center gap-2 md:gap-3 relative z-10 transition-opacity duration-200 ${singleFileProgress !== undefined && singleFileProgress >= 0 && singleFileProgress < 100 ? "group-hover:opacity-0" : ""}`}>
                            {singleFileProgress === -1 ? (
                              <>
                                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin opacity-80" />
                                <span className="text-base md:text-lg">Canceling...</span>
                              </>
                            ) : singleFileProgress === 100 ? (
                              <span className="text-base md:text-lg">Completed</span>
                            ) : (singleFileStatus && singleFileStatus !== DownloadStatus.DOWNLOADING) || singleFileProgress === 99 ? (
                              <div className="flex items-center justify-center gap-2 md:gap-3 max-w-full px-2">
                                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin shrink-0" />
                                <div className="flex flex-col items-center leading-tight min-w-0 overflow-hidden">
                                  <span className="text-base md:text-lg truncate max-w-full">
                                    {singleFileStatus || "Extracting archive..."}
                                  </span>
                                  {singleFileCurrentFile ? (
                                    <span className="text-xs font-normal opacity-80 truncate max-w-[260px] md:max-w-[340px] leading-none mt-1">
                                      {singleFileCurrentFile}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : singleFileProgress !== undefined ? (
                              <div className="flex items-center justify-center gap-2 md:gap-3 max-w-full px-2">
                                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin shrink-0" />
                                <div className="flex flex-col items-center leading-tight min-w-0">
                                  <span className="text-base md:text-lg">
                                    Downloading... {singleFileProgress}%
                                  </span>
                                  {singleFileDownloaded !== undefined && singleFileDownloaded > 0 ? (
                                    <span className="text-xs font-normal opacity-80 leading-none mt-1">
                                      {formatFileSize(singleFileDownloaded)} {singleFileTotal && singleFileTotal > 0 ? `/ ${formatFileSize(singleFileTotal)}` : ""}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <>
                                <Download className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="text-base md:text-lg leading-tight">Download</span>
                                  {validFiles[0]?._nFilesize ? (
                                    <span className="text-xs font-normal opacity-80 leading-none mt-0.5">
                                      {formatFileSize(validFiles[0]._nFilesize)}
                                    </span>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isUninstallConfirmOpen}
        onClose={() => setIsUninstallConfirmOpen(false)}
        onConfirm={async (dontAskAgain: boolean) => {
          if (dontAskAgain) {
            await useSettingsStore.getState().dismissWarning("delete-mod");
          }
          setIsUninstallConfirmOpen(false);
          await executeUninstall();
        }}
        title="Uninstall Mod"
        description={`Are you sure you want to uninstall "${displayCard.name}"? All files for this mod will be permanently removed.`}
        confirmLabel="LET'S GO!"
        cancelLabel="Nevermind!"
        isDestructive={true}
      />
    </div>
  );
};

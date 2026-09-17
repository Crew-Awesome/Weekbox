import React, { useState } from "react";
import { HardDrive, Trash2, Folder, DownloadCloud, Cpu, RotateCcw } from "lucide-react";
import Core from "@core";
import Utils from "@utils";
import {
  ConfirmationModal,
  type ConfirmationStats,
  type SelectableModalItem,
} from "../../../molecules/confirmation-modal/confirmation-modal";
import { formatBytes } from "../../../../utils/formatters";
import { useSettingsStore, useStorageMigrationStore, useProcessStore } from "../../../../store";

interface PendingMove {
  type: "mods" | "engines";
  sourcePath: string;
  targetPath: string;
  stats?: ConfirmationStats;
}

const formatEstimatedTime = (bytes: number): string => {
  const seconds = Math.ceil(bytes / (45 * 1024 * 1024));
  if (seconds <= 1) return "< 1s";
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes}m`;
};

export const StorageTab: React.FC = () => {
  const {
    modsPath,
    enginesPath,
    defaultModsPath,
    defaultEnginesPath,
    isWarningDismissed,
    dismissWarning,
  } = useSettingsStore();

  const { isMigrating, startMigration } = useStorageMigrationStore();

  const [concurrentDownloads, setConcurrentDownloads] = useState("3");
  const [clearing, setClearing] = useState(false);
  const [clearedMessage, setClearedMessage] = useState(false);

  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalculatingStats, setIsCalculatingStats] = useState(false);

  const [selectableMods, setSelectableMods] = useState<SelectableModalItem[]>([]);
  const [selectedModIds, setSelectedModIds] = useState<Set<string>>(new Set());

  const handleClearCache = () => {
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      setClearedMessage(true);
      setTimeout(() => setClearedMessage(false), 2500);
    }, 600);
  };

  const initiateMove = async (type: "mods" | "engines", targetPath: string) => {
    const sourcePath = type === "mods" ? modsPath : enginesPath;
    if (!targetPath || sourcePath.toLowerCase() === targetPath.toLowerCase()) {
      return;
    }

    if (useProcessStore.getState().hasRunningProcesses()) {
      Utils.toast.warning(
        "Cannot relocate storage while a game instance is running. Please close the game first.",
        { title: "Game Running" }
      );
      return;
    }

    /* Validate destination directory: reject if foreign subdirectories exist */
    if (Core.platform.validateStorageFolder) {
      try {
        const validation = await Core.platform.validateStorageFolder(targetPath, type);
        if (!validation.valid) {
          Utils.toast.error(
            validation.reason ||
              "Target folder is occupied by foreign folders. Please select an empty folder or a valid WeekBox storage directory.",
            { title: "Invalid Storage Folder", duration: 5000 }
          );
          return;
        }
      } catch (err: any) {
        Utils.toast.error(
          err?.message || "Failed to validate target storage directory.",
          { title: "Validation Error" }
        );
        return;
      }
    }

    const warningKey = `move-${type}`;
    if (isWarningDismissed(warningKey)) {
      await startMigration(type, sourcePath, targetPath);
      return;
    }

    /* Reset mod selection state */
    setSelectableMods([]);
    setSelectedModIds(new Set());

    /* Open confirmation modal immediately with calculating state */
    setPendingMove({
      type,
      sourcePath,
      targetPath,
      stats: undefined,
    });
    setIsCalculatingStats(true);
    setIsModalOpen(true);

    /* Inspect source folder asynchronously to calculate count, size, and load selectable items */
    try {
      if (Core.platform.inspectStorage) {
        const inspected = await Core.platform.inspectStorage(sourcePath);

        if (type === "mods") {
          let installedMods: any[] = [];
          if (Core.platform.getInstalledMods) {
            try {
              installedMods = await Core.platform.getInstalledMods();
            } catch {}
          }

          const modsList: SelectableModalItem[] = (inspected.items || []).map((item: any) => {
            const matchedMod = installedMods.find((m: any) => {
              if (item.name.startsWith(`mod_${m.id}_`)) return true;
              if (m.installPath) {
                const normalized = m.installPath.replace(/\\/g, "/");
                if (normalized.endsWith("/" + item.name)) return true;
              }
              return false;
            });

            return {
              id: matchedMod?.id ? String(matchedMod.id) : item.name,
              folderName: item.name,
              name: matchedMod?.name || matchedMod?.title || item.name,
              description: matchedMod?.description || "",
              thumbnail:
                matchedMod?.thumbnailBase64 ||
                matchedMod?.thumbnail ||
                matchedMod?.img ||
                matchedMod?.icon ||
                "",
              sizeFormatted: item.formattedSize,
              bytes: item.bytes,
            };
          });

          setSelectableMods(modsList);
          setSelectedModIds(new Set(modsList.map((m) => m.id)));
        }

        setPendingMove((prev) =>
          prev
            ? {
                ...prev,
                stats: {
                  count: inspected.count,
                  countLabel: type === "mods" ? "Mods" : "Engines",
                  totalSize: inspected.formattedSize,
                  estimatedTime: inspected.estimatedTime,
                },
              }
            : null
        );
      }
    } catch {
      setPendingMove((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                count: 0,
                countLabel: type === "mods" ? "Mods" : "Engines",
                totalSize: "0 B",
                estimatedTime: "< 1s",
              },
            }
          : null
      );
    } finally {
      setIsCalculatingStats(false);
    }
  };

  const handlePickFolder = async (type: "mods" | "engines") => {
    if (isMigrating) return;
    const title = type === "mods" ? "Select New Mods Folder" : "Select New Engines Folder";
    const current = type === "mods" ? modsPath : enginesPath;

    if (Core.platform.showFolderDialog) {
      const selected = await Core.platform.showFolderDialog(title, current);
      if (selected) {
        await initiateMove(type, selected.replace(/\\/g, "/"));
      }
    }
  };

  const handleUseDefault = async (type: "mods" | "engines") => {
    if (isMigrating) return;
    const target = type === "mods" ? defaultModsPath : defaultEnginesPath;
    if (target) {
      await initiateMove(type, target);
    }
  };

  const handleToggleModItem = (id: string) => {
    setSelectedModIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllMods = () => {
    setSelectedModIds(new Set(selectableMods.map((m) => m.id)));
  };

  const handleDeselectAllMods = () => {
    setSelectedModIds(new Set());
  };

  const dynamicStats: ConfirmationStats | undefined = pendingMove?.stats
    ? pendingMove.type === "mods" && selectableMods.length > 0
      ? {
          count: selectedModIds.size,
          countLabel: "Mods",
          totalSize: formatBytes(
            selectableMods
              .filter((m) => selectedModIds.has(m.id))
              .reduce((acc, curr) => acc + (curr.bytes || 0), 0)
          ),
          estimatedTime: formatEstimatedTime(
            selectableMods
              .filter((m) => selectedModIds.has(m.id))
              .reduce((acc, curr) => acc + (curr.bytes || 0), 0)
          ),
        }
      : pendingMove.stats
    : undefined;

  const handleConfirmMove = async (dontAskAgain: boolean) => {
    if (!pendingMove || isCalculatingStats) return;
    const { type, sourcePath, targetPath } = pendingMove;

    if (dontAskAgain) {
      await dismissWarning(`move-${type}`);
    }

    let selectedFolderNames: string[] | undefined = undefined;
    if (type === "mods" && selectableMods.length > 0) {
      selectedFolderNames = selectableMods
        .filter((m) => selectedModIds.has(m.id))
        .map((m) => m.folderName);
    }

    setIsModalOpen(false);
    setPendingMove(null);
    setSelectableMods([]);
    setSelectedModIds(new Set());

    await startMigration(type, sourcePath, targetPath, selectedFolderNames);
  };

  const isModsCustom =
    Boolean(modsPath && defaultModsPath) &&
    modsPath.toLowerCase() !== defaultModsPath.toLowerCase();

  const isEnginesCustom =
    Boolean(enginesPath && defaultEnginesPath) &&
    enginesPath.toLowerCase() !== defaultEnginesPath.toLowerCase();

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Storage & Directory Paths</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Mods Folder Location */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Folder className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Mods Folder Location
                </span>
                <span
                  className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] font-mono truncate"
                  title={modsPath || "%APPDATA%\\WeekBox\\mods"}
                >
                  {modsPath || "%APPDATA%\\WeekBox\\mods"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isModsCustom && (
                <button
                  type="button"
                  disabled={isMigrating}
                  onClick={() => handleUseDefault("mods")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-white/10 text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  title="Reset to default mods directory"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Use Default</span>
                </button>
              )}

              <button
                type="button"
                disabled={isMigrating}
                onClick={() => handlePickFolder("mods")}
                className="px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                Change Location
              </button>
            </div>
          </div>

          {/* Engines Folder Location */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Cpu className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Engines Folder Location
                </span>
                <span
                  className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] font-mono truncate"
                  title={enginesPath || "%APPDATA%\\WeekBox\\engines"}
                >
                  {enginesPath || "%APPDATA%\\WeekBox\\engines"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isEnginesCustom && (
                <button
                  type="button"
                  disabled={isMigrating}
                  onClick={() => handleUseDefault("engines")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-white/10 text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  title="Reset to default engines directory"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Use Default</span>
                </button>
              )}

              <button
                type="button"
                disabled={isMigrating}
                onClick={() => handlePickFolder("engines")}
                className="px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                Change Location
              </button>
            </div>
          </div>

          {/* Simultaneous Downloads */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <DownloadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Simultaneous Downloads
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Limit maximum concurrent network downloads
                </span>
              </div>
            </div>

            <select
              value={concurrentDownloads}
              onChange={(e) => setConcurrentDownloads(e.target.value)}
              className="bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-semibold px-4 py-2.5 rounded-2xl border border-white/10 outline-none cursor-pointer hover:border-[var(--wb-primary)]/50 transition-colors shrink-0"
            >
              <option value="1">1 download</option>
              <option value="2">2 downloads</option>
              <option value="3">3 downloads (recommended)</option>
              <option value="5">5 downloads</option>
            </select>
          </div>

          {/* Temporary Cache */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 text-rose-400" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Temporary Cache
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Delete residual downloaded archives and thumbnail cache
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={clearing}
              onClick={handleClearCache}
              className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-sm font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {clearing ? "Clearing..." : clearedMessage ? "Cache Cleared!" : "Clear Cache"}
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal for Relocating Storage */}
      {pendingMove && (
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setIsCalculatingStats(false);
            setPendingMove(null);
            setSelectableMods([]);
            setSelectedModIds(new Set());
          }}
          onConfirm={handleConfirmMove}
          title={`Move ${pendingMove.type === "mods" ? "Mods" : "Engines"} Folder`}
          description={
            <span>
              Are you sure? All your installed{" "}
              <strong>{pendingMove.type === "mods" ? "mods" : "engines"}</strong> will be
              relocated to:
              <br />
              <code className="text-xs font-mono bg-black/30 px-2 py-1 rounded-md text-[var(--wb-primary)] mt-2 inline-block break-all">
                {pendingMove.targetPath}
              </code>
            </span>
          }
          stats={dynamicStats}
          isLoadingStats={isCalculatingStats}
          selectableItems={pendingMove.type === "mods" ? selectableMods : undefined}
          selectedItemIds={pendingMove.type === "mods" ? selectedModIds : undefined}
          onToggleItem={handleToggleModItem}
          onSelectAll={handleSelectAllMods}
          onDeselectAll={handleDeselectAllMods}
          cancelLabel="Nevermind!"
          confirmLabel="LET'S GO!"
          showDontAskAgain={true}
        />
      )}
    </div>
  );
};

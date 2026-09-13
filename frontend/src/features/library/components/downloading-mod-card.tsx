import React from "react";
import Shared from "@shared";
import { Download, Loader2, User } from "lucide-react";
import { useDownloadStore } from "../../../store";
import type { ModItem } from "../../home/types";
import { ENGINE_CATEGORIES } from "../../../core/services/gamebanana/constants";

interface DownloadingModCardProps {
  /**
   * Unique file ID of the active download task.
   */
  fileId: string;
  /**
   * Callback invoked when clicking on the downloading card to view details in the modal.
   */
  onCardClick: (modItem: ModItem) => void;
}

/**
 * @description Dedicated card component for mods currently being downloaded/installed.
 * Subscribes strictly to its own file task in useDownloadStore, preventing other cards in
 * the library from re-rendering during download progress ticks.
 * Renders in a muted/dimmed presentation style with an animated download overlay over the thumbnail.
 */
export const DownloadingModCard: React.FC<DownloadingModCardProps> = ({
  fileId,
  onCardClick,
}) => {
  const task = useDownloadStore((s) => s.tasks[fileId]);

  if (!task) return null;

  const modItem: ModItem = {
    id: Number(task.modId) || 0,
    name: task.modName || task.payload?.title || task.payload?.name || "Downloading Mod",
    description: task.payload?.description || "",
    htmlBody: task.payload?.htmlBody,
    img: task.payload?.thumbnail || task.payload?.img || "",
    icon: task.payload?.engineIcon || task.payload?.icon,
    previewMedia: task.payload?.previewMedia || [],
    author: task.payload?.author || "Unknown",
    authors: task.payload?.authors,
    credits: task.payload?.credits,
    submittedAt: task.payload?.submittedAt,
    updatedAt: task.payload?.updatedAt,
    engineId: task.payload?.engineId,
    files: task.payload?.files || [],
  };

  const thumbnailOverlay = (
    <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center pointer-events-none">
      <div className="w-10 h-10 rounded-full bg-[var(--wb-primary)]/20 border border-[var(--wb-primary)]/50 flex items-center justify-center mb-1.5 shadow-lg shadow-[var(--wb-primary)]/20">
        <Download className="w-5 h-5 text-[var(--wb-primary)] animate-bounce" />
      </div>
      <span className="text-white text-xs font-extrabold tracking-wider uppercase drop-shadow-md truncate max-w-full px-2">
        {task.status || "Downloading..."}
      </span>
      <div className="w-28 max-w-[85%] h-1.5 bg-white/20 rounded-full overflow-hidden mt-1.5">
        <div
          className="h-full bg-[var(--wb-primary)] transition-all duration-200 rounded-full"
          style={{ width: `${Math.max(5, task.progress)}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-white/90 mt-1 drop-shadow-sm">
        {task.progress}%
      </span>
    </div>
  );

  const engineCategory = task.payload?.engineId
    ? Object.values(ENGINE_CATEGORIES).find(
        (c) =>
          String(c.id).toLowerCase() === String(task.payload.engineId).toLowerCase() ||
          c.name.toLowerCase() === String(task.payload.engineId).toLowerCase()
      )
    : null;
  const engineTooltip = engineCategory?.name || (task.payload?.engineId ? String(task.payload.engineId) : undefined);

  return (
    <div className="h-full">
      <Shared.molecules.Card
        title={modItem.name}
        description={modItem.description}
        thumbnail={modItem.img}
        icon={modItem.icon}
        iconTooltip={engineTooltip}
        isNsfw={task.payload?.isNsfw}
        clickableArea="whole-card"
        onClick={() => onCardClick(modItem)}
        extractColor={false}
        lazyLoad={false}
        isDimmed={true}
        thumbnailOverlay={thumbnailOverlay}
      >
        <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-[var(--wb-outline-variant)]/20">
          <div className="flex items-center gap-2 overflow-hidden">
            {task.payload?.userPfp ? (
              <img
                src={task.payload.userPfp}
                alt={modItem.author}
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/5 opacity-70"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--wb-surface-variant)] flex items-center justify-center shrink-0 text-[var(--wb-on-surface-variant)] opacity-70">
                <User size={12} />
              </div>
            )}
            <span className="text-[var(--wb-on-surface-variant)] text-xs truncate opacity-80">
              {modItem.author}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--wb-primary)] text-xs font-bold shrink-0">
            <Loader2 size={13} className="animate-spin" />
            <span>
              {task.status?.toLowerCase().includes("extract") ? "Extracting..." : "Installing..."}
            </span>
          </div>
        </div>
      </Shared.molecules.Card>
    </div>
  );
};

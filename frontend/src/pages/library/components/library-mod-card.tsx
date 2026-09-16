import React from "react";
import Components from "@components";
const Shared = Components;
import {
  User,
  Activity,
  Square,
  Play,
  Download,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useProcessStore } from "../../../store";
import { ENGINE_CATEGORIES } from "../../../core/services/gamebanana/constants";
import type { ModItem } from "../../home/types";

export interface LibraryModCardProps {
  item: any;
  isFavorite: boolean;
  onCardClick: (modItem: ModItem) => void;
}

export const LibraryModCard: React.FC<LibraryModCardProps> = ({
  item,
  isFavorite,
  onCardClick,
}) => {
  const processInstances = useProcessStore((s) => s.instances);
  const isItemInstalled = item.isInstalled !== false;

  const modItem: ModItem = {
    id: item.id,
    name: item.title || item.name || "Unknown Mod",
    description: item.description || "",
    htmlBody: item.htmlBody,
    img: item.img || item.thumbnail || item.thumbnailBase64 || "",
    icon: item.engineIcon || item.icon,
    previewMedia:
      Array.isArray(item.previewMedia) && item.previewMedia.length > 0
        ? item.previewMedia
        : item.img
          ? [item.img]
          : item.thumbnail
            ? [item.thumbnail]
            : item.thumbnailBase64
              ? [item.thumbnailBase64]
              : [],
    author: item.author || "Unknown",
    authors: item.authors,
    credits: item.credits,
    submittedAt: item.submittedAt,
    updatedAt: item.updatedAt,
    engineId: item.engineId,
    files: item.files,
  };

  const engineCategory = item.engineId
    ? Object.values(ENGINE_CATEGORIES).find(
        (c) =>
          String(c.id).toLowerCase() === String(item.engineId).toLowerCase() ||
          c.name.toLowerCase() === String(item.engineId).toLowerCase()
      )
    : null;
  const engineTooltip = engineCategory?.name || (item.engineId ? String(item.engineId) : undefined);
  const playStatus = processInstances[`mod:${item.id}`]?.status || "idle";

  return (
    <div className="h-full">
      <Shared.molecules.Card
        title={modItem.name}
        description={modItem.description}
        thumbnail={item.thumbnailBase64 || modItem.img}
        icon={modItem.icon}
        iconTooltip={engineTooltip}
        isNsfw={item.isNsfw}
        isFavorite={isFavorite}
        clickableArea="whole-card"
        onClick={() => onCardClick(modItem)}
        extractColor={true}
        lazyLoad={false}
      >
        <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-[var(--wb-outline-variant)]/20">
          <div className="flex items-center gap-2 overflow-hidden">
            {item.userPfp ? (
              <img
                src={item.userPfp}
                alt={modItem.author}
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/5"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--wb-surface-variant)] flex items-center justify-center shrink-0 text-[var(--wb-on-surface-variant)]">
                <User size={12} />
              </div>
            )}
            <span className="text-[var(--wb-on-surface-variant)] text-xs truncate">
              {modItem.author}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isItemInstalled ? (
              playStatus === "launching" ? (
                <div className="flex items-center gap-1 text-[var(--wb-primary)] text-xs font-bold animate-pulse">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Launching...</span>
                </div>
              ) : playStatus === "playing" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    useProcessStore.getState().stopInstance(`mod:${item.id}`);
                  }}
                  className="flex items-center gap-1 text-emerald-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer group/btn"
                  title="Click to stop process"
                >
                  <Activity size={13} className="group-hover/btn:hidden text-emerald-400 animate-pulse" />
                  <Square size={13} className="hidden group-hover/btn:inline fill-current text-rose-400" />
                  <span className="group-hover/btn:hidden">Playing</span>
                  <span className="hidden group-hover/btn:inline">Stop</span>
                </button>
              ) : playStatus === "stopping" ? (
                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold animate-pulse">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Stopping...</span>
                </div>
              ) : playStatus === "error" ? (
                <div className="flex items-center gap-1 text-rose-400 text-xs font-bold">
                  <AlertTriangle size={13} />
                  <span>Error</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[var(--wb-primary)] text-xs font-bold">
                  <Play size={13} className="fill-current" />
                  <span>Play</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <Download size={13} />
                <span>Install</span>
              </div>
            )}
          </div>
        </div>
      </Shared.molecules.Card>
    </div>
  );
};

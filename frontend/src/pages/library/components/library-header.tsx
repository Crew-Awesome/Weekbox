import React from "react";
import Components from "@components";
const Shared = Components;
import { Heart } from "lucide-react";

export interface LibraryHeaderProps {
  dynamicTitle: string;
  showFavoritesOnly: boolean;
  filteredCount: number;
  installedCount: number;
  activeInstallingCount: number;
}

/**
 * Header section of the Library page, rendering the title
 * and reactive counter badges for favorites, installed mods, and active installations.
 */
export const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  dynamicTitle,
  showFavoritesOnly,
  filteredCount,
  installedCount,
  activeInstallingCount,
}) => {
  return (
    <Shared.atoms.Titles title={dynamicTitle}>
      <div className="flex items-center gap-2">
        {showFavoritesOnly ? (
          <div className="text-xs font-semibold text-red-400 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center gap-1.5">
            <Heart size={12} className="fill-red-400" />
            <span>
              {filteredCount} {filteredCount === 1 ? "favorite" : "favorites"}
            </span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-[var(--wb-on-surface-variant)] px-3 py-1.5 rounded-full bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/20">
            {installedCount} {installedCount === 1 ? "mod installed" : "mods installed"}
          </div>
        )}
        {activeInstallingCount > 0 && (
          <div className="text-xs font-semibold text-[var(--wb-primary)] px-3 py-1.5 rounded-full bg-[var(--wb-primary)]/10 border border-[var(--wb-primary)]/30 animate-pulse">
            {activeInstallingCount} installing
          </div>
        )}
      </div>
    </Shared.atoms.Titles>
  );
};

import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, FolderDown, Compass } from "lucide-react";

export interface LibraryEmptyStateProps {
  type: "empty-favorites" | "empty-library" | "no-matches";
  searchQuery?: string;
  showFavoritesOnly?: boolean;
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
  type,
  searchQuery,
  showFavoritesOnly,
}) => {
  const navigate = useNavigate();

  if (type === "empty-favorites") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 w-full text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--wb-surface-container)] flex items-center justify-center mb-5 border border-[var(--wb-outline-variant)]/30 shadow-none">
          <Heart className="w-10 h-10 text-red-500 opacity-90" />
        </div>
        <h2 className="text-[var(--wb-on-surface)] text-2xl font-black tracking-wide">
          No favorite mods yet
        </h2>
        <p className="text-[var(--wb-on-surface-variant)] text-sm mt-2 max-w-md opacity-80 leading-relaxed">
          Open any mod details modal and tap the heart icon to save your favorite mods here, whether downloaded or not.
        </p>
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[var(--wb-primary)]/20"
        >
          <Compass className="w-4 h-4" />
          Discover Mods
        </button>
      </div>
    );
  }

  if (type === "empty-library") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 w-full text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--wb-surface-container)] flex items-center justify-center mb-5 border border-[var(--wb-outline-variant)]/30 shadow-none">
          <FolderDown className="w-10 h-10 text-[var(--wb-primary)] opacity-90" />
        </div>
        <h2 className="text-[var(--wb-on-surface)] text-2xl font-black tracking-wide">
          Your Library is empty
        </h2>
        <p className="text-[var(--wb-on-surface-variant)] text-sm mt-2 max-w-md opacity-80 leading-relaxed">
          You haven't installed any mods yet. Explore the Discover section to browse popular Friday Night Funkin' mods and download them right here.
        </p>
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[var(--wb-primary)]/20"
        >
          <Compass className="w-4 h-4" />
          Discover Mods
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 w-full text-center">
      <span className="text-[var(--wb-on-surface)] text-2xl font-bold opacity-80">
        No matches found
      </span>
      <span className="text-[var(--wb-on-surface-variant)] text-sm mt-2 opacity-60">
        {searchQuery?.trim()
          ? `No ${showFavoritesOnly ? "favorite" : "installed"} mod matched "${searchQuery}"`
          : "No mods match the selected engine filter"}
      </span>
    </div>
  );
};

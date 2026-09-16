import React, { useEffect, useRef } from "react";
import Components from "@components";
const Shared = Components;
import { RefreshCw, Filter, Clock, ArrowDownAZ, ArrowUpZA, Star, User, Heart } from "lucide-react";
import type { LibrarySortOption } from "../hooks/use-library-filters";

export interface LibraryFilterPopoverProps {
  isLoading: boolean;
  onRefresh: () => void;
  showFilters: boolean;
  setShowFilters: (val: boolean | ((prev: boolean) => boolean)) => void;
  isFilterActive: boolean;
  sortOption: LibrarySortOption;
  setSortOption: (val: LibrarySortOption) => void;
  engineFilter: string[];
  setEngineFilter: (val: string[]) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const LibraryFilterPopover: React.FC<LibraryFilterPopoverProps> = ({
  isLoading,
  onRefresh,
  showFilters,
  setShowFilters,
  isFilterActive,
  sortOption,
  setSortOption,
  engineFilter,
  setEngineFilter,
  showFavoritesOnly,
  setShowFavoritesOnly,
}) => {
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters, setShowFilters]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRefresh}
        title="Refresh library"
        className="p-3 rounded-2xl flex items-center justify-center border bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] transition-colors cursor-pointer"
      >
        <RefreshCw className={`w-6 h-6 ${isLoading ? "animate-spin" : ""}`} />
      </button>

      <div className="relative" ref={filtersRef}>
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          title="Filter & Sort"
          className={`p-3 rounded-2xl flex items-center justify-center border transition-colors cursor-pointer ${
            showFilters || isFilterActive
              ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm"
              : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)]"
          }`}
        >
          <Filter className="w-6 h-6" />
        </button>

        {showFilters && (
          <div className="absolute top-full right-0 md:left-0 md:right-auto pt-2 z-50">
            <div className="bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/60 rounded-2xl p-4 shadow-2xl flex flex-row flex-wrap items-center gap-3 min-w-[320px] backdrop-blur-xl">
              <Shared.molecules.PillDropdown
                label="Sort by"
                value={sortOption}
                onChange={setSortOption}
                options={[
                  {
                    label: "Most Recent",
                    value: "recent",
                    icon: <Clock size={16} />,
                  },
                  {
                    label: "A - Z",
                    value: "az",
                    icon: <ArrowDownAZ size={16} />,
                  },
                  {
                    label: "Z - A",
                    value: "za",
                    icon: <ArrowUpZA size={16} />,
                  },
                  {
                    label: "Most Popular",
                    value: "popular",
                    icon: <Star size={16} />,
                  },
                  {
                    label: "Author",
                    value: "author",
                    icon: <User size={16} />,
                  },
                ]}
              />
              <Shared.organisms.EngineFilterPill
                value={engineFilter}
                onChange={setEngineFilter}
                isMulti={true}
              />
              <button
                type="button"
                onClick={() => setShowFavoritesOnly((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-200 border outline-none cursor-pointer select-none ${
                  showFavoritesOnly
                    ? "bg-red-500/20 border-red-500/50 text-red-500 shadow-sm"
                    : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface-variant)] hover:text-red-400"
                }`}
              >
                <Heart
                  size={16}
                  className={showFavoritesOnly ? "fill-red-500 text-red-500" : "opacity-80"}
                />
                <span>Favorites</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

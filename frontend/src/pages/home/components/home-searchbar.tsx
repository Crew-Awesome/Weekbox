import React, { useState, useEffect, useRef } from "react";
import Components from "@components";
const Shared = Components;
import { Filter, Star, Sparkles, Flame, RefreshCcw } from "lucide-react";
import { useHomeStore } from "../../../store/home-store";
import {
  extractModIdOrUrl,
  handleDirectModLookup,
} from "@utils";
import { getSupportedEngineCategories } from "../../../core/services/gamebanana/constants";

const SORT_OPTIONS = [
  { label: "Popular", value: "popular", icon: <Star className="w-3.5 h-3.5" /> },
  { label: "Newest", value: "new", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { label: "Most Ripped", value: "ripe", icon: <Flame className="w-3.5 h-3.5" /> },
  { label: "Recently Updated", value: "updated", icon: <RefreshCcw className="w-3.5 h-3.5" /> },
];

interface HomeSearchbarProps {
  onSearchSubmit: (query: string) => void;
  sortFilter: string;
  setSortFilter: (val: string) => void;
  categoryFilter: string[];
  setCategoryFilter: (val: string[]) => void;
}

export const HomeSearchbar: React.FC<HomeSearchbarProps> = ({
  onSearchSubmit,
  sortFilter,
  setSortFilter,
  categoryFilter,
  setCategoryFilter,
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);
  const searchQuery = useHomeStore((state) => state.searchQuery);

  useEffect(() => {
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    const TOP_THRESHOLD = 90;
    const SCROLL_DELTA = 15;

    const handleScroll = () => {
      const currentScrollY = mainElement.scrollTop;

      // Keep searchbar unconditionally visible near the top of the page
      if (currentScrollY <= TOP_THRESHOLD) {
        setIsSearchVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollY.current;

      // Only toggle on substantial scroll movements (hysteresis) to prevent jitter/limbo
      if (delta > SCROLL_DELTA) {
        setIsSearchVisible(false);
        setShowFilters(false);
        lastScrollY.current = currentScrollY;
      } else if (delta < -SCROLL_DELTA) {
        setIsSearchVisible(true);
        lastScrollY.current = currentScrollY;
      }
    };

    mainElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = async (query: string) => {
    const directId = extractModIdOrUrl(query);
    if (directId !== null) {
      onSearchSubmit("");
      setShowFilters(false);
      await handleDirectModLookup(directId);
      return;
    }
    onSearchSubmit(query);
    setShowFilters(false);
  };

  const filterButton = (
    <div className="hidden md:block relative z-50" ref={filterRef}>
      <button
        onClick={() => setShowFilters(!showFilters)}
        title="Filter & Sort"
        className={`transition-colors p-3 rounded-2xl flex items-center justify-center border cursor-pointer ${
          showFilters
            ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm"
            : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)]"
        }`}
      >
        <Filter className="w-6 h-6" />
      </button>

      {showFilters && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/60 rounded-2xl p-4 shadow-2xl flex flex-row flex-wrap gap-3 min-w-[320px] backdrop-blur-xl">
            <Shared.molecules.PillDropdown
              label="Sort by"
              value={sortFilter}
              onChange={setSortFilter}
              options={[
                {
                  label: "Popular",
                  value: "popular",
                  icon: <Star size={16} />,
                },
                { label: "Newest", value: "new", icon: <Sparkles size={16} /> },
                {
                  label: "Most Ripped",
                  value: "ripe",
                  icon: <Flame size={16} />,
                },
                {
                  label: "Recently Updated",
                  value: "updated",
                  icon: <RefreshCcw size={16} />,
                },
              ]}
            />
            <Shared.organisms.EngineFilterPill
              value={categoryFilter}
              onChange={setCategoryFilter}
              isMulti={true}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`sticky top-0 z-30 w-full pt-10 md:pt-0 bg-[var(--wb-surface-container)]/70 backdrop-blur-xl border-b md:border-b-0 border-[var(--wb-outline-variant)]/20 shadow-sm md:bg-transparent md:backdrop-blur-none transition-all duration-300 ease-in-out md:${
        isSearchVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden md:overflow-visible md:max-h-none md:opacity-100 ${
          isSearchVisible
            ? "max-h-16 opacity-100"
            : "max-md:max-h-0 max-md:opacity-0 max-md:pointer-events-none"
        }`}
      >
        <Shared.molecules.Searchbar
          placeholders={[
            "Paste your favorite mod's ID...",
            "Search for mods...",
            "Search on GameBanana...",
          ]}
          filterButton={filterButton}
          initialValue={searchQuery}
          onSearch={handleSearch}
        />
      </div>

      {/* Mobile Filter Carousel: transparent background inheriting parent blur */}
      <div className="md:hidden w-full overflow-x-auto no-scrollbar py-2 px-4 bg-transparent flex items-center gap-2 touch-pan-x">
        {/* Sort Options */}
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortFilter(opt.value)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer select-none border ${
                isActive
                  ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] border-[var(--wb-primary)] font-semibold shadow-sm"
                  : "bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface-variant)] border-[var(--wb-outline-variant)]/60 hover:bg-[var(--wb-surface-container-highest)]"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}

        <div className="h-4 w-[1px] bg-[var(--wb-outline-variant)]/60 shrink-0 mx-0.5" />

        {/* Engine Categories (only pslice and vslice on mobile) */}
        {getSupportedEngineCategories(true).map((cat) => {
          const isSelected = categoryFilter.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (isSelected) {
                  const remaining = categoryFilter.filter((id) => id !== cat.id);
                  setCategoryFilter(remaining.length === 0 ? ["all"] : remaining);
                } else {
                  setCategoryFilter([
                    ...categoryFilter.filter((id) => id !== "all"),
                    cat.id,
                  ]);
                }
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer select-none border ${
                isSelected
                  ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] border-[var(--wb-primary)] font-semibold shadow-sm"
                  : "bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface-variant)] border-[var(--wb-outline-variant)]/60 hover:bg-[var(--wb-surface-container-highest)]"
              }`}
            >
              {cat.icon && (
                <img
                  src={cat.icon}
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                />
              )}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

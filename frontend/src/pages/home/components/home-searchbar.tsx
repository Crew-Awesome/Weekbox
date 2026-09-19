import React, { useState, useEffect, useRef, useCallback } from "react";
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

  const filterContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const centerPill = useCallback((key: string) => {
    const btn = pillRefs.current[key];
    const container = filterContainerRef.current;
    if (!btn || !container) return;

    const btnLeft = btn.offsetLeft;
    const btnWidth = btn.offsetWidth;
    const containerWidth = container.clientWidth;

    const targetScrollLeft = btnLeft - (containerWidth - btnWidth) / 2;

    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (sortFilter) {
      centerPill(`sort:${sortFilter}`);
    }
  }, [sortFilter, centerPill]);

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
  const [filterMenuAlign, setFilterMenuAlign] = useState<"left" | "right">("left");

  useEffect(() => {
    if (!showFilters || !filterRef.current) return;
    const rect = filterRef.current.getBoundingClientRect();
    const menuWidth = 288;
    if (rect.left + menuWidth > window.innerWidth - 16) {
      setFilterMenuAlign("right");
    } else {
      setFilterMenuAlign("left");
    }
  }, [showFilters]);

  const searchQuery = useHomeStore((state) => state.searchQuery);

  useEffect(() => {
    const mainElement =
      document.getElementById("main-scroll-container") ||
      document.querySelector("main");
    if (!mainElement) return;

    let ticking = false;
    let accumulatedDelta = 0;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = mainElement.scrollTop;
          const maxScroll = mainElement.scrollHeight - mainElement.clientHeight;

          // 1. Elastic bounce / overscroll protection
          if (currentScrollY <= 0) {
            setIsSearchVisible(true);
            lastScrollY.current = 0;
            accumulatedDelta = 0;
            ticking = false;
            return;
          }

          if (currentScrollY >= maxScroll - 5) {
            ticking = false;
            return;
          }

          const delta = currentScrollY - lastScrollY.current;

          // 2. Near top of page: always keep visible
          if (currentScrollY <= 80) {
            setIsSearchVisible(true);
            lastScrollY.current = currentScrollY;
            accumulatedDelta = 0;
            ticking = false;
            return;
          }

          // 3. Directional accumulation with hysteresis
          if (
            (delta > 0 && accumulatedDelta < 0) ||
            (delta < 0 && accumulatedDelta > 0)
          ) {
            accumulatedDelta = 0;
          }
          accumulatedDelta += delta;

          if (accumulatedDelta > 20) {
            setIsSearchVisible(false);
            setShowFilters(false);
            accumulatedDelta = 0;
          } else if (accumulatedDelta < -15) {
            setIsSearchVisible(true);
            accumulatedDelta = 0;
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
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
        className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--wb-surface-container)] hover:bg-[var(--wb-surface-container-high)] text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] transition-all cursor-pointer shadow-none"
        aria-label="Filtros"
      >
        <Filter className="w-5 h-5" />
      </button>

      {showFilters && (
        <div
          className={`absolute ${
            filterMenuAlign === "right"
              ? "right-0 origin-top-right"
              : "left-0 origin-top-left"
          } top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/60 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex flex-col gap-4">
            <Shared.molecules.PillDropdown
              label="Sort by"
              value={sortFilter}
              onChange={(val: string) => {
                if (val) setSortFilter(val);
              }}
              options={[
                {
                  label: "Popular",
                  value: "popular",
                  icon: <Star size={16} />,
                },
                {
                  label: "Newest",
                  value: "new",
                  icon: <Sparkles size={16} />,
                },
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
      className={`sticky top-0 z-30 w-full pt-10 md:pt-0 bg-[var(--wb-surface-container)]/70 backdrop-blur-xl border-b md:border-b-0 border-[var(--wb-outline-variant)]/20 shadow-sm md:bg-transparent md:backdrop-blur-none transition-all duration-300 ease-in-out ${
        isSearchVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "-translate-y-full opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto"
      }`}
    >
      <div>
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
      <div
        ref={filterContainerRef}
        className="md:hidden w-full overflow-x-auto no-scrollbar py-2 px-4 bg-transparent flex items-center gap-2 touch-pan-x scroll-smooth"
      >
        {/* Sort Options */}
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortFilter === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                pillRefs.current[`sort:${opt.value}`] = el;
              }}
              type="button"
              onClick={() => {
                setSortFilter(opt.value);
                centerPill(`sort:${opt.value}`);
              }}
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
              ref={(el) => {
                pillRefs.current[`engine:${cat.id}`] = el;
              }}
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
                  centerPill(`engine:${cat.id}`);
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

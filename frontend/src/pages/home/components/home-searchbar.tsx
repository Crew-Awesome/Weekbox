import React, { useState, useEffect, useRef } from "react";
import Components from "@components";
const Shared = Components;
import { Filter, Star, Sparkles, Flame, RefreshCcw } from "lucide-react";
import { useHomeStore } from "../../../store/home-store";
import {
  extractModIdOrUrl,
  handleDirectModLookup,
} from "@utils";

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

    const handleScroll = () => {
      const currentScrollY = mainElement.scrollTop;

      if (currentScrollY <= 0) {
        setIsSearchVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsSearchVisible(false);
        setShowFilters(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsSearchVisible(true);
      }

      lastScrollY.current = currentScrollY;
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
    <div className="relative z-50" ref={filterRef}>
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
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ease-in-out ${
        isSearchVisible ? "translate-y-0" : "-translate-y-full"
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
  );
};

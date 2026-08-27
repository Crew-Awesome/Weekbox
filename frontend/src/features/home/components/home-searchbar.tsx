import React, { useState, useEffect, useRef } from "react";
import Shared from "@shared";
import { Filter, Star, Sparkles, Flame, RefreshCcw } from "lucide-react";
import { useHomeStore } from "../../../store/home-store";

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
        setShowFilters(false); // Close filters when scrolling down
      } else if (currentScrollY < lastScrollY.current) {
        setIsSearchVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    mainElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (query: string) => {
    onSearchSubmit(query);
    setShowFilters(false);
  };

  const filterButton = (
    <div className="relative" onMouseLeave={() => setShowFilters(false)}>
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`transition-colors p-3 rounded-2xl flex items-center justify-center border ${
          showFilters
            ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)]"
            : "bg-[var(--wb-surface-container)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)] text-[var(--wb-on-surface)]"
        }`}
      >
        <Filter className="w-6 h-6" />
      </button>

      {showFilters && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)] rounded-2xl p-4 shadow-2xl flex flex-row flex-wrap gap-4 min-w-[300px]">
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

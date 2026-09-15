import React, { useState, useRef, useEffect } from "react";
import Components from "@components";
const Shared = Components;
import { Filter, Clock, Layers, CheckCircle2 } from "lucide-react";
import { ENGINE_CATEGORIES } from "../../../core/services/gamebanana/constants";

export type InstanceSortOption = "newest" | "oldest" | "version" | "date";

interface InstancesTopbarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  sortOption: InstanceSortOption;
  onSortChange: (sort: InstanceSortOption) => void;
  onlyInstalled: boolean;
  onOnlyInstalledChange: (only: boolean) => void;
  isExecutable?: boolean;
}

/**
 * Topbar for the Instances view.
 * Styled with a height matching searchbar menus and provides:
 * 1. Filter & Sort popover (Sort by Date / Version, Filter by Only Installed)
 * 2. Engine Category selector pill-dropdown
 */
export const InstancesTopbar: React.FC<InstancesTopbarProps> = ({
  selectedCategory,
  onSelectCategory,
  sortOption,
  onSortChange,
  onlyInstalled,
  onOnlyInstalledChange,
  isExecutable = false,
}) => {
  const [showFilters, setShowFilters] = useState(false);
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
  }, [showFilters]);

  const engineOptions = React.useMemo(() => {
    return Object.values(ENGINE_CATEGORIES).map((cat) => ({
      label: cat.id === "vslice" ? "Base Game" : cat.name,
      value: cat.id,
      icon: cat.icon,
    }));
  }, []);

  const isFilterActive = onlyInstalled || (sortOption !== "newest" && sortOption !== "date");

  return (
    <div className="sticky top-0 z-40 flex items-center w-full md:w-auto h-25 rounded-none md:rounded-b-[16px] bg-[var(--wb-surface-container)]/90 backdrop-blur-md mx-0 md:mx-2 px-4 md:px-6 shadow-md border-b md:border-b-0 border-[var(--wb-outline-variant)]/20">
      <div className="flex items-center gap-3">
        {/* Filter & Sort Popover Button */}
        <div className="relative z-50" ref={filtersRef}>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            title="Filter & Sort"
            className={`transition-colors p-3 rounded-2xl flex items-center justify-center border cursor-pointer ${
              showFilters || isFilterActive
                ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm"
                : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)]"
            }`}
          >
            <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {showFilters && (
            <div className="absolute top-full left-0 pt-2 z-50">
              <div className="bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/60 rounded-2xl p-4 shadow-2xl flex flex-row flex-wrap items-center gap-3 min-w-[320px] backdrop-blur-xl">
                {!isExecutable && (
                  <Shared.molecules.PillDropdown
                    label="Sort by"
                    value={sortOption === "date" ? "newest" : sortOption}
                    onChange={(val: string) => onSortChange(val as InstanceSortOption)}
                    options={[
                      {
                        label: "Newest to Oldest",
                        value: "newest",
                        icon: <Clock size={16} />,
                      },
                      {
                        label: "Oldest to Newest",
                        value: "oldest",
                        icon: <Clock size={16} />,
                      },
                      {
                        label: "Version",
                        value: "version",
                        icon: <Layers size={16} />,
                      },
                    ]}
                  />
                )}

                <button
                  type="button"
                  onClick={() => onOnlyInstalledChange(!onlyInstalled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-200 border outline-none cursor-pointer select-none text-xs sm:text-sm ${
                    onlyInstalled
                      ? "bg-[var(--wb-primary)]/20 border-[var(--wb-primary)]/50 text-[var(--wb-primary)] shadow-sm"
                      : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface-variant)]"
                  }`}
                >
                  <CheckCircle2
                    size={16}
                    className={onlyInstalled ? "text-[var(--wb-primary)]" : "opacity-70"}
                  />
                  <span>Only Installed</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/** Engine Category Pill */}
        <Shared.molecules.PillDropdown
          label="Engine Category"
          options={engineOptions}
          value={selectedCategory}
          onChange={(val: string) => {
            if (val) onSelectCategory(val);
          }}
          align="left"
        />
      </div>
    </div>
  );
};


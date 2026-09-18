import React from "react";
import Components from "@components";
const Shared = Components;
import { getSupportedEngineCategories } from "../../../core/services/gamebanana/constants";

export type InstanceSortOption = "newest" | "oldest" | "version" | "date";

interface InstancesTopbarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  sortOption?: InstanceSortOption;
  onSortChange?: (sort: InstanceSortOption) => void;
  onlyInstalled?: boolean;
  onOnlyInstalledChange?: (only: boolean) => void;
  isExecutable?: boolean;
}

/**
 * Topbar for the Instances view.
 * Styled with clearance for mobile status bars and displays exclusively the available engine filters.
 */
export const InstancesTopbar: React.FC<InstancesTopbarProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const desktopEngineOptions = React.useMemo(() => {
    return getSupportedEngineCategories(false).map((cat) => ({
      label: cat.id === "vslice" ? "Base Game" : cat.name,
      value: cat.id,
      icon: cat.icon,
    }));
  }, []);

  const mobileEngineCategories = React.useMemo(() => {
    return getSupportedEngineCategories(true);
  }, []);

  return (
    <div className="sticky top-0 z-40 flex items-center w-full md:w-auto min-h-[4rem] sm:min-h-[5rem] pt-10 md:pt-2.5 pb-2.5 rounded-none md:rounded-b-[16px] bg-[var(--wb-surface-container)]/70 backdrop-blur-2xl mx-0 md:mx-2 px-4 sm:px-6 shadow-[0_4px_24px_rgba(0,0,0,0.25)] border-b md:border-b-0 border-white/10">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full">
        {/* Mobile: Direct Engine Filter Pills */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full">
          {mobileEngineCategories.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none border shrink-0 ${
                  isSelected
                    ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] border-[var(--wb-primary)] shadow-sm font-bold"
                    : "bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface-variant)] border-[var(--wb-outline-variant)]/60 hover:bg-[var(--wb-surface-container-highest)]"
                }`}
              >
                <img
                  src={cat.icon}
                  alt={cat.name}
                  className="w-4 h-4 object-contain rounded-sm"
                />
                <span>{cat.id === "vslice" ? "Base Game" : cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop: Engine Category PillDropdown */}
        <div className="hidden md:flex items-center gap-2">
          <Shared.molecules.PillDropdown
            label="Engine Category"
            options={desktopEngineOptions}
            value={selectedCategory}
            onChange={(val: string) => {
              if (val) onSelectCategory(val);
            }}
            align="left"
          />
        </div>
      </div>
    </div>
  );
};


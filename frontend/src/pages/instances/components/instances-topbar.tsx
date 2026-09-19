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

  const containerRef = React.useRef<HTMLDivElement>(null);
  const btnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const centerCategory = React.useCallback((catId: string) => {
    const btn = btnRefs.current[catId];
    const container = containerRef.current;
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

  React.useEffect(() => {
    if (selectedCategory) {
      centerCategory(selectedCategory);
    }
  }, [selectedCategory, centerCategory]);

  return (
    <div className="sticky top-0 z-40 flex items-center w-full md:w-auto min-h-[4rem] sm:min-h-[5rem] pt-10 md:pt-2.5 pb-2.5 rounded-none md:rounded-b-[16px] glass-header mx-0 md:mx-2 px-4 sm:px-6 shadow-[0_4px_24px_rgba(0,0,0,0.25)] border-b md:border-b-0 border-white/10">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full">
        {/* Mobile: Direct Engine Filter Pills */}
        <div
          ref={containerRef}
          className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full scroll-smooth"
        >
          {mobileEngineCategories.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                ref={(el) => {
                  btnRefs.current[cat.id] = el;
                }}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  centerCategory(cat.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none shrink-0 ${
                  isSelected
                    ? "glass-pill-active font-bold"
                    : "glass-pill text-[var(--wb-on-surface-variant)] hover:bg-white/10"
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


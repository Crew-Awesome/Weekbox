import React from "react";
import Shared from "@shared";
import { Eye, Download, User, Clock } from "lucide-react";
import type { ModItem } from "../../types";
import { useAllMods } from "./use-all-mods";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";
import { SearchEasterEgg } from "../search-easter-egg/search-easter-egg";

interface AllModsProps {
  onCardClick: (card: ModItem) => void;
  searchQuery?: string;
  sortFilter?: string;
  categoryFilter?: string[];
}

/**
 * @description Renders an infinite-scrolling grid of GameBanana mods.
 * Automatically handles pagination, layout packing (row dense) for banners,
 * and interpolates Community Picks continuously within the grid.
 * @param {AllModsProps} props - The component props.
 */
export const AllMods: React.FC<AllModsProps> = ({
  onCardClick,
  searchQuery = "",
  sortFilter = "popular",
  categoryFilter = ["all"],
}) => {
  const { mods, loading, loadingMore, hasMore, page, lastElementRef } =
    useAllMods(sortFilter, categoryFilter, searchQuery);

  const sortLabels: Record<string, string> = {
    popular: "Popular",
    new: "Newest",
    ripe: "Most Ripped",
    updated: "Recently Updated",
  };

  const dynamicTitle = React.useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return `Search: "${searchQuery}"`;
    }

    const sLabel = sortLabels[sortFilter] || "Discovery";
    let cLabel = "All Engines";
    
    if (categoryFilter.length === 1 && categoryFilter[0] !== "all") {
      const engineKey = Object.keys(ENGINE_CATEGORIES).find(
        (key) => ENGINE_CATEGORIES[Number(key)].id === categoryFilter[0]
      );
      if (engineKey) {
        cLabel = ENGINE_CATEGORIES[Number(engineKey)].name;
      }
    } else if (categoryFilter.length > 1) {
      cLabel = `${categoryFilter.length} Engines`;
    }
    
    return `${sLabel} - ${cLabel}`;
  }, [sortFilter, categoryFilter, searchQuery]);

  if (loading && page === 1) {
    return (
      <>
        <Shared.atoms.Titles title={dynamicTitle} />
        <div
          className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          style={{ gridAutoFlow: "row dense" }}
        >
          {Array.from({ length: 16 }).map((_, i) => {
            const isBanner = i === 3 || i === 11;
            if (isBanner) {
              return (
                <div key={`skel-${i}`} className="col-span-1 sm:col-span-2 lg:col-span-3 2xl:col-span-4 h-full">
                  <Shared.molecules.Banner
                    isLoading
                    title="Loading"
                    thumbnail="skeleton"
                    icon="skeleton"
                    pillTitle="Loading"
                    author="Loading"
                    viewsCount="0"
                  />
                </div>
              );
            }
            return (
              <div key={`skel-${i}`} className="h-full">
                <Shared.molecules.Card
                  isLoading
                  title="Loading"
                  description="Loading description"
                  thumbnail="skeleton"
                  icon="skeleton"
                />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <Shared.atoms.Titles title={dynamicTitle} />
      <div
        className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        style={{ gridAutoFlow: "row dense" }}
      >
        {mods.map((item, index) => {
          const modItem: ModItem = {
            name: item.title,
            description: item.description,
            htmlBody: item.htmlBody,
            img: item.thumbnail,
            icon: item.engineIcon,
          };

          const isLastElement = index === mods.length - 1;

          return (
            <div
              key={`${item.id}-${index}`}
              ref={isLastElement ? lastElementRef : null}
              className={`relative ${(item as any).__isCommunityPick ? "col-span-full w-[calc(100%+4rem)] -ml-8" : ""}`}
            >
              {(item as any).__isCommunityPick ? (
                <div className="px-0 sm:px-0 w-full">
                  <Shared.molecules.Banner
                    pillTitle={
                      (item as any).__featuredLabel || "Community Pick"
                    }
                    title={item.title}
                    author={`by ${item.author}`}
                    timeText={item.timeAgo}
                    likesCount={Intl.NumberFormat("en-US", {
                      notation: "compact",
                    }).format(item.likes)}
                    viewsCount={Intl.NumberFormat("en-US", {
                      notation: "compact",
                    }).format(item.views)}
                    thumbnail={item.thumbnail}
                    icon={item.engineIcon}
                    isNsfw={item.isNsfw}
                    onClick={() => onCardClick(modItem)}
                    className="mb-8 mt-4 shadow-2xl rounded-none sm:rounded-none"
                  />
                </div>
              ) : (
                <Shared.molecules.Card
                  title={item.title}
                  description={item.description}
                  thumbnail={item.thumbnail}
                  icon={item.engineIcon}
                  isNsfw={item.isNsfw}
                  clickableArea="whole-card"
                  onClick={() => onCardClick(modItem)}
                  extractColor={true}
                  lazyLoad={true}
                >
                  <div className="flex items-center gap-3 mt-2">
                    {/* Avatar (Left Column) */}
                    {item.userPfp ? (
                      <img
                        src={item.userPfp}
                        alt={item.author}
                        className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-white/5"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--wb-surface-variant)] flex items-center justify-center shrink-0 border border-white/5">
                        <User
                          size={20}
                          className="opacity-70 text-[var(--wb-on-surface-variant)]"
                        />
                      </div>
                    )}

                    {/* Info (Right Column, 2 Rows) */}
                    <div className="flex flex-col justify-center overflow-hidden">
                      <span className="text-[var(--wb-on-surface-variant)] text-sm font-semibold truncate leading-tight">
                        {item.author}
                      </span>

                      <div className="flex items-center gap-3 text-[var(--wb-on-surface-variant)] opacity-70 text-[11px] font-medium mt-0.5">
                        <div
                          className="flex items-center gap-1"
                          title={`${item.views} Views`}
                        >
                          <Eye size={12} />
                          <span>
                            {Intl.NumberFormat("en-US", {
                              notation: "compact",
                            }).format(item.views)}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          title={`${item.downloads} Downloads`}
                        >
                          <Download size={12} />
                          <span>
                            {Intl.NumberFormat("en-US", {
                              notation: "compact",
                            }).format(item.downloads)}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1"
                          title={`Uploaded ${item.timeAgo}`}
                        >
                          <Clock size={12} />
                          <span className="truncate">{item.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Shared.molecules.Card>
              )}
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <div className="flex justify-center items-center py-6 w-full mt-4">
          <span className="loader text-lg animate-pulse">Loading more...</span>
        </div>
      )}
      {!hasMore && mods.length > 0 && (
        <div className="flex justify-center items-center py-6 w-full mt-4">
          <p className="text-gray-500 text-sm">
            You've reached the end of the line!
          </p>
        </div>
      )}
      <SearchEasterEgg mods={mods} searchQuery={searchQuery} />
    </>
  );
};

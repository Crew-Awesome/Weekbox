import React from "react";
import Components from "@components";
const Shared = Components;
import { Eye, Download, User, Clock, AlertCircle, RotateCcw, Laptop } from "lucide-react";
import type { ModItem } from "../../types";
import { useAllMods } from "./use-all-mods";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";
import { SearchEasterEgg } from "../search-easter-egg/search-easter-egg";
import { useFavoritesStore } from "../../../../store";
import { isMobilePlatform } from "@core";

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
export const AllMods: React.FC<AllModsProps> = React.memo(({
  onCardClick,
  searchQuery = "",
  sortFilter = "popular",
  categoryFilter = ["all"],
}) => {
  const { mods, loading, loadingMore, hasMore, page, lastElementRef, retry } =
    useAllMods(sortFilter, categoryFilter, searchQuery);
  const favorites = useFavoritesStore((s) => s.favorites);

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
        (key) => ENGINE_CATEGORIES[Number(key)].id === categoryFilter[0],
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
                <div
                  key={`skel-${i}`}
                  className="col-span-1 sm:col-span-2 lg:col-span-3 2xl:col-span-4 h-full"
                >
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

  if (!loading && mods.length === 0) {
    if (isMobilePlatform() && categoryFilter.some((c) => c === "executable" || c === "3827")) {
      return (
        <>
          <Shared.atoms.Titles title={dynamicTitle} />
          <div className="flex flex-col items-center justify-center py-24 px-6 w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <Laptop className="w-8 h-8 text-amber-400" />
            </div>
            <span className="text-[var(--wb-on-surface)] text-xl font-bold tracking-wide">
              Executable Mods (.exe) are not supported on Mobile
            </span>
            <span className="text-[var(--wb-on-surface-variant)] text-sm mt-2 max-w-md opacity-75">
              Windows executables cannot run on Android/iOS. Please choose an engine category (such as V-Slice or Psych Engine) to discover compatible mods.
            </span>
          </div>
        </>
      );
    }

    if (searchQuery.trim().length > 0) {
      return (
        <>
          <Shared.atoms.Titles title={dynamicTitle} />
          <div className="flex flex-col items-center justify-center py-32 w-full text-center">
            <span className="text-[var(--wb-on-surface)] text-3xl font-black opacity-80 uppercase tracking-wide">
              Nothing to see here
            </span>
            <span className="text-[var(--wb-on-surface-variant)] text-base mt-3 opacity-60 uppercase tracking-widest">
              Search for something else
            </span>
          </div>
        </>
      );
    }

    return (
      <>
        <Shared.atoms.Titles title={dynamicTitle} />
        <div className="flex flex-col items-center justify-center py-24 px-4 w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--wb-surface-container)] flex items-center justify-center mb-4 border border-[var(--wb-outline-variant)]/40 shadow-none">
            <AlertCircle className="w-8 h-8 text-amber-400 opacity-90" />
          </div>
          <span className="text-[var(--wb-on-surface)] text-xl font-bold tracking-wide">
            Failed to load mods
          </span>
          <span className="text-[var(--wb-on-surface-variant)] text-sm mt-2 max-w-md opacity-70">
            There was an issue connecting to GameBanana or the request timed out.
          </span>
          <button
            type="button"
            onClick={retry}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/40 text-sm font-semibold text-[var(--wb-on-surface)] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-none"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
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
            id: item.id,
            name: item.title,
            description: item.description,
            htmlBody: item.htmlBody,
            img: item.thumbnail,
            icon: item.engineIcon,
            previewMedia: item.previewMedia,
            author: item.author,
            authors: item.authors,
            credits: (item as any).credits,
            submittedAt: item.submittedAt,
            updatedAt: item.updatedAt,
            engineId: item.engineId,
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
                    iconTooltip={
                      item.engineId
                        ? Object.values(ENGINE_CATEGORIES).find(
                            (c) => c.id === item.engineId,
                          )?.name
                        : undefined
                    }
                    isNsfw={item.isNsfw}
                    onClick={() => onCardClick(modItem)}
                    className="mb-8 mt-4 shadow-none rounded-none sm:rounded-none"
                  />
                </div>
              ) : (
                <Shared.molecules.Card
                  title={item.title}
                  description={item.description}
                  thumbnail={item.thumbnail}
                  icon={item.engineIcon}
                  iconTooltip={
                    item.engineId
                      ? Object.values(ENGINE_CATEGORIES).find(
                          (c) => c.id === item.engineId,
                        )?.name
                      : undefined
                  }
                  isNsfw={item.isNsfw}
                  isFavorite={Boolean(favorites[String(item.id)])}
                  clickableArea="whole-card"
                  onClick={() => onCardClick(modItem)}
                  extractColor={true}
                  lazyLoad={true}
                >
                  <div className="flex items-center gap-3 mt-2">
                    {item.userPfp ? (
                      <img
                        src={item.userPfp}
                        alt={item.author}
                        className="w-10 h-10 rounded-full object-cover shrink-0 shadow-none border border-white/5"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--wb-surface-variant)] flex items-center justify-center shrink-0 border border-white/5">
                        <User
                          size={20}
                          className="opacity-70 text-[var(--wb-on-surface-variant)]"
                        />
                      </div>
                    )}

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
});

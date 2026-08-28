import React, { useState } from "react";
import Shared from "@shared";
import type { GameBananaMod } from "@core";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useFeaturedMods } from "./use-featured-mods";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";

interface FeaturedModsProps {
  onCardClick?: (mod: GameBananaMod) => void;
  searchQuery?: string;
  engineIds?: string[];
}

/**
 * Renders a wide Carousel for Featured Mods (Community Picks, Mods of the Month, etc.).
 * Maps the custom features from the backend JSON into a sleek, auto-playing UI.
 * 
 * @param {FeaturedModsProps} props - Component props.
 */
export const FeaturedMods: React.FC<FeaturedModsProps> = ({
  onCardClick,
  searchQuery = "",
  engineIds = ["all"],
}) => {
  const { featuredMods, categories } = useFeaturedMods(searchQuery, engineIds);
  const [hoveredTooltip, setHoveredTooltip] = useState<number | string | null>(
    null,
  );

  // Prevent UI explosion by limiting items to 4 when transitioning to search results
  const displayMods = searchQuery ? featuredMods.slice(0, 4) : featuredMods;

  if (displayMods.length === 0) {
    if (searchQuery.trim().length > 0) {
      return null;
    }

    return (
      <div className="mb-4 w-full">
        <Shared.atoms.Titles title="Featured Mods" align="center" />
        <div className="w-full aspect-[2/1] sm:aspect-[21/9] lg:aspect-[21/8] xl:aspect-[3/1] bg-[var(--wb-surface-container)] rounded-[32px] flex flex-col items-center justify-center border border-white/5 shadow-inner mt-4 p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-[var(--wb-primary)] mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-white mb-2">
            Could not load Featured Mods
          </h3>
          <p className="text-[var(--wb-on-surface-variant)] text-sm max-w-md">
            The backend request timed out or the connection to the server
            failed. Make sure the Node.js extension is running and try
            restarting the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 w-full">
      <Shared.atoms.Titles
        title={searchQuery ? "Top Search Results" : "Featured Mods"}
        align="center"
      />

      {/* Container with negative margins to make the carousel take full screen width */}
      <div className="-mx-8 mt-4">
        <Shared.molecules.Carousel
          isInfinite
          isAuto
          autoInterval={4500}
          className="aspect-[4/3] sm:aspect-[21/9]"
          onItemClick={(index) => {
            const item = displayMods[index];
            if (item && onCardClick) {
              const modItem = {
                id: item.id,
                name: item.title,
                description: item.description,
                htmlBody: item.htmlBody,
                img: item.thumbnail,
                icon: item.engineIcon,
                previewMedia: item.previewMedia,
                author: item.author,
                submittedAt: item.submittedAt,
                updatedAt: item.updatedAt,
                engineId: item.engineId,
              };
              onCardClick(modItem as any);
            }
          }}
          renderIndicators={(api) => {
            // Determine active category based on the carousel's current index
            const activeMod = displayMods[api.activeIndex];
            const activeLabel = activeMod?.__featuredLabel || categories[0];

            const handlePrevCard = () => {
              api.goToLogicalIndex(
                (api.activeIndex - 1 + displayMods.length) %
                  displayMods.length,
              );
            };

            const handleNextCard = () => {
              api.goToLogicalIndex((api.activeIndex + 1) % displayMods.length);
            };

            return (
              <div className="flex items-center justify-center gap-4 mt-4 px-4 w-full pointer-events-none z-10">
                {!searchQuery && (
                  <button
                    onClick={handlePrevCard}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white shrink-0 pointer-events-auto cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}

                {/* Pills (dots) rendered only for the current section */}
                <div className="flex gap-2 justify-center items-center pointer-events-auto flex-wrap">
                  {displayMods
                    .map((m, idx) => ({ ...m, absoluteIndex: idx }))
                    .filter((m) =>
                      !searchQuery ? m.__featuredLabel === activeLabel : true,
                    )
                    .map((mod) => (
                      <div
                        key={`indicator-${mod.absoluteIndex}`}
                        className={`relative h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                          api.activeIndex === mod.absoluteIndex
                            ? "w-8 bg-white/50"
                            : "w-2 bg-white/20 hover:bg-white/40"
                        }`}
                        onClick={() => api.goToLogicalIndex(mod.absoluteIndex)}
                      >
                        <div
                          className={`absolute top-0 left-0 bottom-0 bg-white w-full transition-opacity duration-300 ${
                            api.activeIndex === mod.absoluteIndex
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                      </div>
                    ))}
                </div>

                {!searchQuery && (
                  <button
                    onClick={handleNextCard}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white shrink-0 pointer-events-auto cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            );
          }}
        >
          {displayMods.map((item) => (
            <div
              key={`featured-${item.id}`}
              className="w-full h-full p-2 sm:p-4"
            >
              <div className="m3-card w-full h-full bg-[var(--wb-surface-container)] rounded-[32px] relative shadow-xl">
                {/* Image Mask to prevent corners spilling */}
                <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none z-0">
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </div>

                {/* Section name on each card */}
                {!searchQuery && item.__featuredLabel && (
                  <div className="m3-card-badge absolute top-6 left-6 sm:top-8 sm:left-8 z-10 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full shadow-md border border-white/10 pointer-events-auto flex items-center gap-2">
                    <span className="text-white text-xs sm:text-sm font-medium tracking-wide drop-shadow-md">
                      {item.__featuredLabel}
                    </span>
                  </div>
                )}

                <div className="m3-card-content absolute inset-0 p-6 sm:p-10 flex flex-col justify-end pointer-events-none z-10">
                  <div className="flex items-center gap-4 sm:gap-6">
                    {item.engineIcon && (
                      <div
                        className="relative pointer-events-auto cursor-pointer shrink-0"
                        onMouseEnter={() => setHoveredTooltip(item.id)}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      >
                        <img
                          src={item.engineIcon.replace(/^\/+/, "")}
                          alt="icon"
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                        />
                        {/* Custom Tooltip */}
                        {item.engineId &&
                          Object.values(ENGINE_CATEGORIES).find(
                            (c) => c.id === item.engineId,
                          )?.name && (
                            <div
                              className={`absolute left-1/2 top-full -translate-x-1/2 -mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoveredTooltip === item.id ? "opacity-100" : "opacity-0"}`}
                            >
                              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-transparent border-b-[var(--wb-surface-container-highest)] -mb-[1px]" />
                              <div className="flex px-4 py-2 bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-bold rounded whitespace-nowrap shadow-xl">
                                {
                                  Object.values(ENGINE_CATEGORIES).find(
                                    (c) => c.id === item.engineId,
                                  )?.name
                                }
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white truncate drop-shadow-xl">
                        {item.title}
                      </h3>
                      <span className="text-base sm:text-xl text-gray-200 drop-shadow-md font-medium mt-1">
                        By {item.author}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Shared.molecules.Carousel>
      </div>
    </div>
  );
};

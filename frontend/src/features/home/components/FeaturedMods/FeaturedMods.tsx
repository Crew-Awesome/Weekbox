import React from "react";
import Shared from "@shared";
import type { GameBananaMod } from "@core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFeaturedMods } from "./useFeaturedMods";

interface FeaturedModsProps {
  onCardClick?: (mod: GameBananaMod) => void;
}

export const FeaturedMods: React.FC<FeaturedModsProps> = ({ onCardClick }) => {
  const { featuredMods, categories } = useFeaturedMods();

  if (featuredMods.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 w-full">
      <Shared.atoms.Titles title="Featured Mods" align="center" />

      {/* Contenedor con márgenes negativos para que el carrusel ocupe TODO el ancho de la pantalla */}
      <div className="-mx-8 mt-4">
        <Shared.molecules.Carousel
          isInfinite
          isAuto
          autoInterval={4500}
          className="aspect-[4/3] sm:aspect-[21/9]"
          onItemClick={(index) => {
            const item = featuredMods[index];
            if (item && onCardClick) {
              onCardClick({
                name: item.title,
                description: item.description,
                htmlBody: item.htmlBody,
                img: item.thumbnail,
                icon: item.engineIcon,
              } as any);
            }
          }}
          renderIndicators={(api) => {
            // Determinar la categoría activa basándonos en el índice actual del carrusel
            const activeMod = featuredMods[api.activeIndex];
            const activeLabel = activeMod?.__featuredLabel || categories[0];

            const goToCategory = (label: string) => {
              const index = featuredMods.findIndex(
                (m) => m.__featuredLabel === label,
              );
              if (index !== -1) {
                api.goToLogicalIndex(index);
              }
            };

            const handlePrevCategory = () => {
              const currentIndex = categories.indexOf(activeLabel);
              if (currentIndex > 0) {
                goToCategory(categories[currentIndex - 1]);
              } else {
                goToCategory(categories[categories.length - 1]);
              }
            };

            const handleNextCategory = () => {
              const currentIndex = categories.indexOf(activeLabel);
              if (currentIndex < categories.length - 1) {
                goToCategory(categories[currentIndex + 1]);
              } else {
                goToCategory(categories[0]);
              }
            };

            return (
              <div className="flex items-center justify-center gap-4 mt-4 px-4 w-full pointer-events-none z-10">
                <button
                  onClick={handlePrevCategory}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white shrink-0 pointer-events-auto cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Píldoras (puntos) solo para la sección actual */}
                <div className="flex gap-2 justify-center items-center pointer-events-auto">
                  {featuredMods
                    .map((m, idx) => ({ ...m, absoluteIndex: idx }))
                    .filter((m) => m.__featuredLabel === activeLabel)
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

                <button
                  onClick={handleNextCategory}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white shrink-0 pointer-events-auto cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            );
          }}
        >
          {featuredMods.map((item) => (
            <div
              key={`featured-${item.id}`}
              className="w-full h-full p-2 sm:p-4"
            >
              <div className="m3-card w-full h-full bg-[var(--wb-surface-container)] rounded-[32px] overflow-hidden relative shadow-xl">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                  />
                )}

                {/* Nombre de la sección en cada card */}
                {item.__featuredLabel && (
                  <div className="m3-card-badge absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-white/10 pointer-events-none">
                    <span className="text-white text-xs sm:text-sm font-bold uppercase tracking-widest drop-shadow-md">
                      {item.__featuredLabel}
                    </span>
                  </div>
                )}

                <div className="m3-card-content absolute inset-0 p-6 sm:p-10 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Ícono del Engine a la izquierda del título */}
                    {item.engineIcon && (
                      <img
                        src={item.engineIcon.replace(/^\/+/, "")}
                        alt="icon"
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                      />
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white truncate drop-shadow-xl">
                        {item.title}
                      </h3>
                      <span className="text-base sm:text-xl text-gray-200 drop-shadow-md font-medium mt-1">
                        Por {item.author}
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

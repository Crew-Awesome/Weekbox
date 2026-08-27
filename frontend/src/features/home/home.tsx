import React, { useState, useEffect } from "react";

import type { ModItem } from "./types";
import { FeaturedMods } from "./components/featured-mods";
import { AllMods } from "./components/all-mods";
import { ModDetailsModal } from "./components/mod-details-modal";
import { HomeSearchbar } from "./components/home-searchbar";
import { useAppStore } from "../../store";
import { useHomeStore } from "../../store/home-store";

export const Home: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);
  const activeModItem = useAppStore((state) => state.activeModItem);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);

  const {
    searchQuery,
    setSearchQuery,
    sortFilter,
    setSortFilter,
    categoryFilter,
    setCategoryFilter,
    scrollPosition,
    setScrollPosition,
  } = useHomeStore();

  useEffect(() => {
    if (activeModItem) {
      setSelectedCard(activeModItem);
    }
  }, [activeModItem]);

  useEffect(() => {
    const mainContainer = document.getElementById("main-scroll-container");
    if (mainContainer && scrollPosition > 0) {
      requestAnimationFrame(() => {
        mainContainer.scrollTop = scrollPosition;
      });
    }

    return () => {
      if (mainContainer) {
        setScrollPosition(mainContainer.scrollTop);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseModal = () => {
    setSelectedCard(null);
    setActiveModItem(null);
  };

  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <HomeSearchbar
          onSearchSubmit={setSearchQuery}
          sortFilter={sortFilter}
          setSortFilter={setSortFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />

        <div className="pt-2 sm:pt-8 px-8">
          <FeaturedMods
            onCardClick={setSelectedCard as any}
            searchQuery={searchQuery}
            engineIds={categoryFilter}
          />
          <AllMods
            onCardClick={setSelectedCard}
            searchQuery={searchQuery}
            sortFilter={sortFilter}
            categoryFilter={categoryFilter}
          />
        </div>
      </div>

      <ModDetailsModal selectedCard={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};

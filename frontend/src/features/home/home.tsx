import React, { useEffect } from "react";

import { FeaturedMods } from "./components/featured-mods";
import { AllMods } from "./components/all-mods";
import { ModDetailsModal } from "./components/mod-details-modal";
import { HomeSearchbar } from "./components/home-searchbar";
import { useHomeStore } from "../../store/home-store";
import { useModalDeeplink } from "./hooks/use-modal-deeplink";

export const Home: React.FC = () => {

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

  const { selectedCard, handleCardClick, handleCloseModal } = useModalDeeplink();

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
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

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
            onCardClick={handleCardClick as any}
            searchQuery={searchQuery}
            engineIds={categoryFilter}
          />
          <AllMods
            onCardClick={handleCardClick}
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

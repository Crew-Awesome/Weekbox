import React, { useEffect } from "react";
import Components from "@components";
const Shared = Components;
import Utils from "@utils";

import { FeaturedMods } from "./components/featured-mods";
import { AllMods } from "./components/all-mods";
import { ModDetailsModal } from "./components/mod-details-modal";
import { HomeSearchbar } from "./components/home-searchbar";
import { useHomeStore } from "../../store/home-store";
import { useModalDeeplink } from "./hooks/use-modal-deeplink";
import { useHomeUrlFilters } from "./hooks/use-home-url-filters";

export const Home: React.FC = () => {
  useHomeUrlFilters();
  const { isOnline } = Utils.hooks.useNetwork();

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
  }, []);

  if (!isOnline) {
    return (
      <div className="items-center -m-8 justify-center text-[var(--wb-text-main)] font-sans">
        <div className="pt-8 sm:pt-14 px-8 relative z-0 flex flex-col items-center">
          <div className="w-full">
            <Shared.atoms.Titles title="You're Offline" />
          </div>
          <Shared.atoms.OfflineContent
            title="You're Offline"
            message="No internet connection detected. Please connect to the internet to explore and download mods."
            size="lg"
            className="py-12 sm:py-24"
          />
        </div>

        <ModDetailsModal selectedCard={selectedCard} onClose={handleCloseModal} />
      </div>
    );
  }

  return (
    <div className="items-center -m-8 justify-center text-[var(--wb-text-main)] font-sans">
      <div className="relative">
        <HomeSearchbar
          onSearchSubmit={setSearchQuery}
          sortFilter={sortFilter}
          setSortFilter={setSortFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />

        <div className="pt-2 sm:pt-8 px-8 relative z-0">
          {!searchQuery.trim() && (
            <FeaturedMods
              onCardClick={handleCardClick as any}
              searchQuery={searchQuery}
              engineIds={categoryFilter}
            />
          )}
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

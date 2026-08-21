import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { ModItem } from "./types";
import { FeaturedMods } from "./components/featured-mods";
import { AllMods } from "./components/all-mods";
import { ModDetailsModal } from "./components/mod-details-modal";
import { HomeSearchbar } from "./components/home-searchbar";
import { useAppStore } from "../../store";

export const Home: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);
  const activeModItem = useAppStore((state) => state.activeModItem);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);

  const [searchParams, setSearchParams] = useSearchParams();

  // Lifted state synchronized with URL
  const searchQuery = searchParams.get("q") || "";
  const sortFilter = searchParams.get("sort") || "popular";
  
  // Categorías pueden venir separadas por comas en la URL: ?engines=vslice,psych
  const engineParam = searchParams.get("engines");
  const categoryFilter = engineParam ? engineParam.split(",") : ["all"];

  useEffect(() => {
    if (activeModItem) {
      setSelectedCard(activeModItem);
    }
  }, [activeModItem]);

  const updateUrlParams = React.useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "popular" || value === "all") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCloseModal = () => {
    setSelectedCard(null);
    setActiveModItem(null);
    updateUrlParams({ modal: null }); // Si tuviéramos modal en URL
  };

  const handleSearch = (query: string) => {
    updateUrlParams({ q: query });
  };

  const handleSetSortFilter = (val: string) => {
    updateUrlParams({ sort: val });
  };

  const handleSetCategoryFilter = (val: string[]) => {
    updateUrlParams({ engines: val.includes("all") ? null : val.join(",") });
  };

  // Rest of the UI syncs perfectly with modal tracking
  useEffect(() => {
    if (selectedCard) {
      updateUrlParams({ modal: (selectedCard as any).id?.toString() || selectedCard.name });
    } else {
      updateUrlParams({ modal: null });
    }
  }, [selectedCard]);

  // Si abrimos la URL con ?modal=id, podríamos restaurarlo (WIP)

  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <HomeSearchbar 
          onSearchSubmit={handleSearch} 
          sortFilter={sortFilter}
          setSortFilter={handleSetSortFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={handleSetCategoryFilter}
        />

        <div className="pt-2 sm:pt-8 px-8">
          <FeaturedMods onCardClick={setSelectedCard as any} searchQuery={searchQuery} engineIds={categoryFilter} />
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

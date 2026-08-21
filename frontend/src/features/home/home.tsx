import React, { useState, useEffect } from "react";
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

  // Lifted state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortFilter, setSortFilter] = useState("popular");
  const [categoryFilter, setCategoryFilter] = useState<string[]>(["all"]);

  // Sincronizar el estado de Zustand con el estado local del modal
  useEffect(() => {
    if (activeModItem) {
      setSelectedCard(activeModItem);
    }
  }, [activeModItem]);

  const handleCloseModal = () => {
    setSelectedCard(null);
    setActiveModItem(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <HomeSearchbar 
          onSearchSubmit={handleSearch} 
          sortFilter={sortFilter}
          setSortFilter={setSortFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
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

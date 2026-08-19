import React, { useState, useEffect } from "react";
import type { ModItem } from "./types";
import { FeaturedMods } from "./components/FeaturedMods";
import { AllMods } from "./components/AllMods";
import { ModDetailsModal } from "./components/ModDetailsModal";
import { HomeSearchbar } from "./components/HomeSearchbar";
import { useAppStore } from "../../store";

export const Home: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);
  const activeModItem = useAppStore((state) => state.activeModItem);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);

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

  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <HomeSearchbar />

        <div className="pt-2 sm:pt-8 px-8">
          <FeaturedMods onCardClick={setSelectedCard as any} />
          <AllMods onCardClick={setSelectedCard} />
        </div>
      </div>

      <ModDetailsModal selectedCard={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};

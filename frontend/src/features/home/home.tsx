import React, { useState } from "react";
import type { ModItem } from "./types";
import { FeaturedMods } from "./components/FeaturedMods";
import { AllMods } from "./components/AllMods";
import { ModDetailsModal } from "./components/ModDetailsModal";
import { HomeSearchbar } from "./components/HomeSearchbar";

export const Home: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);

  const handleCloseModal = () => {
    setSelectedCard(null);
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

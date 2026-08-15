import React, { useState } from 'react';
import Shared from '@shared';
import type { ModItem } from './types';
import { FeaturedMods } from './components/FeaturedMods';
import { AllMods } from './components/AllMods';
import { ModDetailsModal } from './components/ModDetailsModal';

export const Home: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <div className="sticky top-0 z-50 w-full">
          <Shared.molecules.Searchbar 
            placeholders={[
              "Paste your favorite mod's ID...", 
              "Search for mods...", 
              "Search on GameBanana..."
            ]} 
          />
        </div>
        
        <div className="pt-2 sm:pt-8 px-8">
          <FeaturedMods />
          <AllMods onCardClick={setSelectedCard} />
        </div>
      </div>

      <ModDetailsModal 
        selectedCard={selectedCard} 
        onClose={handleCloseModal}
      />
    </div>
  );
};

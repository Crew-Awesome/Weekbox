import React, { useState } from 'react';
import Shared from '@shared';

const MOCK_MODS = [
  {
    name: "Friday Night Funkidsasadsdaasdsadsaaaaaaaaaaaaaasdasdasdasdasdassdasddn': Mod Title",
    description: "Mod asdsdaadsDescription that's very long but very very very long",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/categories/codename.png",
    showIcon: true,
  },
  {
    name: "No Icon Card",
    description: "This card explicitly hides the icon and its mask.",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/categories/vslice.png",
    showIcon: false, // This will disable the mask and the icon entirely
  },
  {
    name: "Different Icon Card",
    description: "This card uses a different customizable icon.",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/app/launcher-icon.png", // Different icon to prove customizability
    showIcon: true,
  },
  {
    name: "Standard Card",
    description: "Another regular card.",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/categories/fpsplus.png",
    showIcon: true,
  }
];

// Generate an array of 16 items repeating the patterns for testing
const EXTENDED_MOCKS = Array.from({ length: 16 }).map((_, i) => MOCK_MODS[i % MOCK_MODS.length]);

export const Home: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<typeof MOCK_MODS[0] | null>(null);

  const handleCardClick = (card: typeof MOCK_MODS[0]) => {
    setSelectedCard(card);
  };

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
          <Shared.atoms.Titles title="All Mods" />
          
          <div
            className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {EXTENDED_MOCKS.map((item, index) => (
              <Shared.molecules.Card 
                key={index}
                title={item.name}
                description={item.description}
                thumbnail={item.img}
                icon={item.icon}
                showIcon={item.showIcon}
                clickableArea="whole-card"
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        </div>
      </div>

      <Shared.atoms.Modal 
        isOpen={!!selectedCard} 
        onClose={handleCloseModal}
        edgeSpacing={{ mobile: '16px', desktop: '10%' }}
      >
        {selectedCard && (
          <div className="flex flex-col gap-4 text-[var(--wb-on-surface)]">
            {selectedCard.img && (
              <img 
                src={selectedCard.img} 
                alt={selectedCard.name} 
                className="w-full h-48 object-cover rounded-xl"
              />
            )}
            <h2 className="text-2xl font-bold mt-2">{selectedCard.name}</h2>
            <p className="text-[var(--wb-on-surface-variant)]">{selectedCard.description}</p>
            {selectedCard.showIcon !== false && selectedCard.icon && (
              <div className="flex items-center gap-2 mt-4 bg-[var(--wb-surface-container)] p-3 rounded-lg w-max">
                <img src={selectedCard.icon} alt="icon" className="w-8 h-8 object-contain" />
                <span className="text-sm">Icon Attached</span>
              </div>
            )}
          </div>
        )}
      </Shared.atoms.Modal>
    </div>
  );
};

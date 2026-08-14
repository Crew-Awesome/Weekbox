import React from 'react';
import Shared from '@shared';

const MOCK_MODS = Array(16).fill({
  name: "Friday Night Funkin': Mod Title that's very long but very very very long",
  description: "Mod Description that's very long but very very very long o sea we, bien largote",
  img: "/assets/images/placeholder-mini.jpg",
  icon: "/assets/icons/categories/vslice.png",
});

export const Home: React.FC = () => {
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
            className="grid gap-12 -mx-8 sm:mx-6 h-auto w-auto"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {MOCK_MODS.map((item, index) => (
              <Shared.molecules.Card 
                key={index}
                title={item.name}
                description={item.description}
                thumbnail={item.img}
                icon={item.icon}
                clickableArea="whole-card"
                onClick={() => console.log('Clicked on card:', item.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

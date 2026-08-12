import React from 'react';
import Shared from '@shared';

export const Home: React.FC = () => {
  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <div className="fixed top-0 left-0 w-full z-40 md:sticky md:top-[-2rem] md:pt-8 md:bg-[var(--wb-bg)]/80 md:backdrop-blur-sm">
          <Shared.molecules.Searchbar 
            placeholders={[
              "Paste your favorite mod's ID...", 
              "Search for mods...", 
              "Search on GameBanana..."
            ]} 
          />
        </div>
        
        <div className="pt-28 md:pt-4 px-8">
          <Shared.atoms.Titles title="All Mods" />
          <Shared.molecules.Card />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import Shared from '@shared';

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
        
        <div className="pt-8 px-8">
          <Shared.atoms.Titles title="All Mods" />
          <Shared.molecules.Card />
        </div>
      </div>
    </div>
  );
};

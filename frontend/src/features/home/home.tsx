import React from 'react';
import Shared from '@shared';

export const Home: React.FC = () => {
  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <Shared.molecules.Searchbar 
          placeholders={[
            "Paste your favorite mod's ID...", 
            "Search for mods...", 
            "Search on GameBanana..."
          ]} 
        />
        <Shared.atoms.Titles title="All Mods" />
        <Shared.molecules.Card />
      </div>
    </div>
  );
};

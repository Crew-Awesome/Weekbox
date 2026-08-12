import React from 'react';
import Shared from '@shared';

export const Home: React.FC = () => {
  return (
    <div className="items-center -m-8 justify-center text-white font-sans">
      <div className="relative">
        <Shared.molecules.Searchbar />
        <Shared.atoms.Titles title="All Mods" />
        <Shared.molecules.Card />
      </div>
    </div>
  );
};

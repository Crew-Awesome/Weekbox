import React from 'react';
import Shared from '@shared';
import { EXTENDED_MOCKS } from '../data/mockMods';
import type { ModItem } from '../types';

interface AllModsProps {
    onCardClick: (card: ModItem) => void;
}

export const AllMods: React.FC<AllModsProps> = ({ onCardClick }) => {
  return (
    <>
      <Shared.atoms.Titles title="All Mods" />
      <div className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {EXTENDED_MOCKS.map((item, index) => (
          <Shared.molecules.Card 
            key={index}
            title={item.name}
            description={item.description}
            thumbnail={item.img}
            icon={item.icon}
            showIcon={item.showIcon}
            clickableArea="whole-card"
            onClick={() => onCardClick(item)}
            extractColor={true}
          />
        ))}
      </div>
    </>
  );
};


import React from 'react';
import Shared from '@shared';
import { MOCK_MODS } from '../data/mockMods';

export const FeaturedMods: React.FC = () => {
  return (
    <div className="mb-8 w-full">
      <Shared.atoms.Titles title="Featured Mods" align="center" />
      <Shared.molecules.Carousel 
        isInfinite 
        isAuto 
        autoInterval={3500} 
        className="mt-4 aspect-[4/3] sm:aspect-[21/9]"
        renderIndicators={(api) => (
          <div className="hidden sm:flex justify-center gap-2 mt-4 pointer-events-none z-10">
            {Array.from({ length: api.totalItems }).map((_, idx) => (
              <div 
                key={`indicator-${idx}`}
                className={`relative h-2 rounded-full overflow-hidden transition-all duration-300 pointer-events-auto cursor-pointer ${
                  api.activeIndex === idx ? 'w-8 bg-white/30' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => api.goToLogicalIndex(idx)}
              >
                <div 
                  ref={api.bindProgressRef(idx)}
                  className={`absolute top-0 left-0 bottom-0 bg-white w-full origin-left transition-opacity duration-300 ${api.activeIndex === idx ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            ))}
          </div>
        )}
      >
        {MOCK_MODS.map((item, index) => (
          <div key={`featured-${index}`} className="w-full h-full p-2">
            <div className="m3-card w-full h-full bg-[var(--wb-surface-container)] rounded-[32px] overflow-hidden relative shadow-lg">
              {item.img && <img src={item.img} alt={item.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
              <div className="m3-card-content absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center gap-3">
                  {item.showIcon !== false && item.icon && (
                    <img src={item.icon} alt="icon" className="w-10 h-10 object-contain drop-shadow-md" />
                  )}
                  <h3 className="text-xl font-bold text-white truncate drop-shadow-md">{item.name}</h3>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Shared.molecules.Carousel>
    </div>
  );
};

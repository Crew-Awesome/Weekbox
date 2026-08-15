import React, { useState, useEffect, useRef } from 'react';
import Shared from '@shared';

export const HomeSearchbar: React.FC = () => {
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      const currentScrollY = mainElement.scrollTop;
      
      if (currentScrollY <= 0) {
        setIsSearchVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsSearchVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsSearchVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={`sticky top-0 z-50 w-full transition-transform duration-300 ease-in-out ${
        isSearchVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <Shared.molecules.Searchbar 
        placeholders={[
          "Paste your favorite mod's ID...", 
          "Search for mods...", 
          "Search on GameBanana..."
        ]} 
      />
    </div>
  );
};

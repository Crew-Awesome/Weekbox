import React, { useEffect, useState, useRef, useCallback } from 'react';
import Shared from '@shared';
import Core from '@core';
import type { GameBananaMod } from '@core';
import type { ModItem } from '../types';
import { Eye, Download, Clock, User } from 'lucide-react';

interface AllModsProps {
    onCardClick: (card: ModItem) => void;
}

export const AllMods: React.FC<AllModsProps> = ({ onCardClick }) => {
  const [mods, setMods] = useState<GameBananaMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMods = async () => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const data = await Core.services.gamebanana.getMods('popular', page, 15);
        
        if (isMounted) {
          if (data.length === 0) {
            setHasMore(false);
          } else {
            setMods(prev => (page === 1 ? data : [...prev, ...data]));
          }
        }
      } catch (error) {
        console.error("Failed to fetch discovery mods:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };
    
    fetchMods();
    
    return () => { isMounted = false; };
  }, [page]);

  if (loading && page === 1) {
    return (
      <>
        <Shared.atoms.Titles title="Discovery (Popular)" />
        <div className="flex justify-center items-center h-64">
          <span className="loader text-xl">Loading...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Shared.atoms.Titles title="Discovery (Popular)" />
      <div className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {mods.map((item, index) => {
          const modItem: ModItem = {
            name: item.title,
            description: item.description,
            img: item.thumbnail,
          };
          
          const isLastElement = index === mods.length - 1;
          
          return (
            <div key={item.id} ref={isLastElement ? lastElementRef : null}>
              <Shared.molecules.Card 
                title={item.title}
                description={item.description}
                thumbnail={item.thumbnail}
                icon={item.engineIcon}
                clickableArea="whole-card"
                onClick={() => onCardClick(modItem)}
                extractColor={true}
                lazyLoad={true}
              >
                <div className="flex flex-col gap-2 mt-1">
                   {/* Author */}
                   <div className="flex items-center gap-1.5 text-[var(--wb-on-surface-variant)] text-xs font-medium">
                      {item.userPfp ? (
                        <img src={item.userPfp} alt={item.author} className="w-4 h-4 rounded-full object-cover shrink-0" />
                      ) : (
                        <User size={14} className="opacity-80 shrink-0" />
                      )}
                      <span className="truncate">{item.author}</span>
                   </div>
                   
                   {/* Metadata Icons */}
                   <div className="flex items-center gap-4 text-[var(--wb-on-surface-variant)] opacity-70 text-[11px] font-medium">
                      <div className="flex items-center gap-1" title={`${item.views} Views`}>
                         <Eye size={12} />
                         <span>{Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.views)}</span>
                      </div>
                      <div className="flex items-center gap-1" title={`${item.downloads} Downloads`}>
                         <Download size={12} />
                         <span>{Intl.NumberFormat('en-US', { notation: 'compact' }).format(item.downloads)}</span>
                      </div>
                      <div className="flex items-center gap-1" title={`Uploaded ${item.timeAgo}`}>
                         <Clock size={12} />
                         <span>{item.timeAgo}</span>
                      </div>
                   </div>
                </div>
              </Shared.molecules.Card>
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <div className="flex justify-center items-center py-6 w-full mt-4">
           <span className="loader text-lg animate-pulse">Loading more...</span>
        </div>
      )}
      {!hasMore && mods.length > 0 && (
        <div className="flex justify-center items-center py-6 w-full mt-4">
           <p className="text-gray-500 text-sm">You've reached the end of the line!</p>
        </div>
      )}
    </>
  );
};

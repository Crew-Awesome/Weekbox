import React, { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import {
  SEARCH_EASTER_EGGS,
  type EasterEggConfig,
} from "../../constants/search-easter-egg";
import type { GameBananaMod } from "@core";

interface SearchEasterEggProps {
  mods: GameBananaMod[];
  searchQuery: string;
}

const SEEN_EGGS_KEY = "weekbox_seen_easter_eggs";

const getSeenEasterEggs = (): string[] => {
  try {
    const data = localStorage.getItem(SEEN_EGGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const markEasterEggSeen = (id: string): void => {
  try {
    const seen = getSeenEasterEggs();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(SEEN_EGGS_KEY, JSON.stringify(seen));
    }
  } catch (err) {
    console.error("Failed to save seen easter egg to localStorage", err);
  }
};

/**
 * Listens to the displayed mods and triggers a GSAP-animated easter egg (confetti and main image) if a match is found.
 * 
 * @param {SearchEasterEggProps} props - Component properties.
 * @returns {React.ReactElement | null} The animated overlay or null.
 */
export const SearchEasterEgg: React.FC<SearchEasterEggProps> = ({
  mods,
  searchQuery,
}) => {
  const [activeEgg, setActiveEgg] = useState<EasterEggConfig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLImageElement>(null);
  const confettiRefs = useRef<(HTMLImageElement | null)[]>([]);

  confettiRefs.current = [];

  const addToRefs = (el: HTMLImageElement | null) => {
    if (el && !confettiRefs.current.includes(el)) {
      confettiRefs.current.push(el);
    }
  };

  useEffect(() => {
    if (
      !searchQuery ||
      searchQuery.trim().length === 0 ||
      !mods ||
      mods.length === 0
    ) {
      setActiveEgg(null);
      return;
    }

    const seenEggs = getSeenEasterEggs();
    const availableEggs = SEARCH_EASTER_EGGS.filter(
      (egg) => !seenEggs.includes(egg.id)
    );

    if (availableEggs.length === 0) {
      setActiveEgg(null);
      return;
    }

    const topMods = mods.slice(0, 10);
    const matchingEggs = availableEggs.filter((egg) => egg.match(topMods));

    if (matchingEggs.length > 0) {
      const randomIndex = Math.floor(Math.random() * matchingEggs.length);
      const chosenEgg = matchingEggs[randomIndex];
      markEasterEggSeen(chosenEgg.id);
      setActiveEgg(chosenEgg);
    } else {
      setActiveEgg(null);
    }
  }, [mods, searchQuery]);

  useEffect(() => {
    if (activeEgg && containerRef.current && mainImageRef.current) {
      const mainTl = gsap.timeline();
      mainTl
        .fromTo(
          mainImageRef.current,
          { y: "120%", opacity: 1, scale: 0.7, rotation: 0, xPercent: -50 },
          {
            y: "-30%",
            scale: 1.05,
            rotation: Math.random() > 0.5 ? 15 : -15,
            xPercent: -50,
            duration: 1.2,
            ease: "power2.out",
          },
        )
        .to(
          mainImageRef.current,
          {
            y: "120%",
            scale: 0.7,
            duration: 1.5,
            ease: "power2.in",
          },
          "-=0.2",
        );

      confettiRefs.current.forEach((el) => {
        if (!el) return;

        const startX = window.innerWidth / 2 + (Math.random() * 400 - 200);
        const startY = window.innerHeight + 100;

        const peakY =
          Math.random() * (window.innerHeight * 0.4) + window.innerHeight * 0.1;

        const endX =
          startX + (Math.random() * window.innerWidth - window.innerWidth / 2);

        const rotation = Math.random() * 1080 - 540;

        const baseScale = Math.random() * 0.8 + 0.8;
        const peakScale = baseScale * 1.5;
        const delay = Math.random() * 0.3;

        gsap.fromTo(
          el,
          { x: startX, rotation: 0, opacity: 1 },
          {
            x: endX,
            rotation: rotation,
            duration: 2.8,
            ease: "linear",
            delay: delay,
          },
        );

        const yTl = gsap.timeline({ delay: delay });
        yTl
          .fromTo(
            el,
            { y: startY, scale: baseScale },
            { y: peakY, scale: peakScale, duration: 1.2, ease: "power2.out" },
          )
          .to(
            el,
            {
              y: window.innerHeight + 200,
              scale: baseScale,
              duration: 1.6,
              ease: "power2.in",
            },
            "-=0.2",
          );
      });

      const timeoutId = setTimeout(() => {
        setActiveEgg(null);
      }, 3500);

      return () => clearTimeout(timeoutId);
    }
  }, [activeEgg]);

  if (!activeEgg) return null;

  const confettiCount = 40;
  const confettiArray = Array.from({ length: confettiCount }).map((_, i) => {
    return activeEgg.confettiImages[i % activeEgg.confettiImages.length];
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[38] overflow-hidden"
    >
      {confettiArray.map((imgSrc, i) => (
        <img
          key={i}
          ref={addToRefs}
          src={imgSrc}
          className="absolute w-24 h-24 object-contain drop-shadow-lg"
          alt="confetti"
        />
      ))}

      <img
        ref={mainImageRef}
        src={activeEgg.mainImage}
        className="absolute bottom-0 left-1/2 h-[65vh] md:h-[75vh] object-contain drop-shadow-2xl"
        alt="Easter Egg Main"
      />
    </div>
  );
};

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

/**
 * @description Listens to the displayed mods and triggers a GSAP-animated easter egg (confetti and main image) if a match is found.
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
    // Solo si se está buscando algo explícitamente y hay resultados
    if (
      !searchQuery ||
      searchQuery.trim().length === 0 ||
      !mods ||
      mods.length === 0
    ) {
      setActiveEgg(null);
      return;
    }

    // Solo revisa los primeros 4 resultados
    const topMods = mods.slice(0, 4);

    // Encuentra todos los Easter Eggs que coincidan con alguno de los primeros 4 mods
    const matchingEggs = SEARCH_EASTER_EGGS.filter((egg) => egg.match(topMods));

    if (matchingEggs.length > 0) {
      // Si hay más de un easter egg que coincide, elige uno aleatorio
      const randomIndex = Math.floor(Math.random() * matchingEggs.length);
      setActiveEgg(matchingEggs[randomIndex]);
    } else {
      setActiveEgg(null);
    }
  }, [mods, searchQuery]);

  useEffect(() => {
    if (activeEgg && containerRef.current && mainImageRef.current) {
      // Imagen Principal (salto fluido sin quedarse congelada)
      const mainTl = gsap.timeline();
      mainTl
        .fromTo(
          mainImageRef.current,
          { y: "120%", opacity: 1, scale: 0.7, rotation: 0, xPercent: -50 },
          {
            y: "-30%", // Sube mucho más sin salir de la pantalla
            scale: 1.05, // Escala sutil para que no crezca exageradamente
            rotation: Math.random() > 0.5 ? 15 : -15, // Efecto de vuelco sutil
            xPercent: -50, // Mantiene el centrado absoluto (sobrescribe translate-x-1/2 de manera segura en GSAP)
            duration: 1.2,
            ease: "power2.out",
          },
        )
        .to(
          mainImageRef.current,
          {
            y: "120%", // Cae de vuelta
            scale: 0.7, // Vuelve a su tamaño original cayendo
            duration: 1.5,
            ease: "power2.in",
          },
          "-=0.2", // Empieza a caer justo antes de perder todo el impulso, haciendo el pico más suave
        );

      // Confeti saliendo de abajo y cayendo sin salir por el techo
      confettiRefs.current.forEach((el, i) => {
        if (!el) return;

        // Start near bottom center
        const startX = window.innerWidth / 2 + (Math.random() * 400 - 200);
        const startY = window.innerHeight + 100;

        // Suben hasta una altura aleatoria, pero SIEMPRE dentro de la pantalla (peakY positivo)
        const peakY =
          Math.random() * (window.innerHeight * 0.4) + window.innerHeight * 0.1;

        // Land randomly across width
        const endX =
          startX + (Math.random() * window.innerWidth - window.innerWidth / 2);

        const rotation = Math.random() * 1080 - 540;

        // Base scale and peak scale for the 3D exponential effect
        const baseScale = Math.random() * 0.8 + 0.8;
        const peakScale = baseScale * 1.5;
        const delay = Math.random() * 0.3;

        // Movimiento en X constante
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

        // Movimiento parabólico fluido en Y y Escala
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
            "-=0.2", // Para que la transición de subir a bajar sea redonda
          );
      });
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
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
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

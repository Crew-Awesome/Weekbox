import React, { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { Users, AlignLeft } from "lucide-react";

interface ModContributorsBtnProps {
  showCredits: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * @description Interactive button that toggles between showing mod description and contributors.
 * Implements the signature card-style GSAP hover effect where the background color animates
 * from a smaller size (chiquito) to full size on hover.
 */
export const ModContributorsBtn: React.FC<ModContributorsBtnProps> = ({
  showCredits,
  onClick,
  className = "",
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverBgRef = useRef<HTMLDivElement>(null);

  const getDefaultHoverColor = useCallback(() => {
    if (typeof window === "undefined") return "rgba(255, 255, 255, 0.1)";
    const style = getComputedStyle(btnRef.current || document.documentElement);
    const val =
      style.getPropertyValue("--wb-card-hover-default").trim() ||
      style.getPropertyValue("--wb-card-hover-bg").trim();
    return val || "rgba(255, 255, 255, 0.1)";
  }, []);

  useEffect(() => {
    if (hoverBgRef.current) {
      /* Inicia "chiquito" (con padding interno de 6px) y transparente */
      gsap.set(hoverBgRef.current, {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
        opacity: 0,
      });
    }
  }, []);

  const handleMouseEnter = () => {
    if (window.matchMedia("(hover: none)").matches) return;
    const finalColor = getDefaultHoverColor();

    if (hoverBgRef.current) {
      /* Se expande a su tamaño completo (inset 0) y gana opacidad */
      gsap.to(hoverBgRef.current, {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 1,
        backgroundColor: finalColor,
        duration: 0.25,
        ease: "power2.inOut",
      });
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia("(hover: none)").matches) return;

    if (hoverBgRef.current) {
      /* Se hace chiquito nuevamente y desaparece */
      gsap.to(hoverBgRef.current, {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
        opacity: 0,
        backgroundColor: "transparent",
        duration: 0.25,
        ease: "power2.inOut",
      });
    }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative isolate overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--wb-outline-variant)]/40 text-xs font-semibold text-[var(--wb-primary)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer select-none w-fit ${className}`}
      title={showCredits ? "Back to description" : "View all contributors"}
    >
      <div
        ref={hoverBgRef}
        className="absolute pointer-events-none z-[-1] rounded-lg"
      />

      {showCredits ? (
        <>
          <AlignLeft className="w-3.5 h-3.5 shrink-0 text-[var(--wb-primary)]" />
          <span>View description</span>
        </>
      ) : (
        <>
          <Users className="w-3.5 h-3.5 shrink-0 text-[var(--wb-primary)]" />
          <span>View all contributors</span>
        </>
      )}
    </button>
  );
};

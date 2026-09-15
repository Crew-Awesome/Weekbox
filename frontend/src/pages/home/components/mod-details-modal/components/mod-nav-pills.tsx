import React, { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { FileText, Users, Info } from "lucide-react";

export type ModModalTab = "description" | "contributors" | "details";

interface ModNavPillsProps {
  activeTab: ModModalTab;
  onChangeTab: (tab: ModModalTab) => void;
  contributorsCount?: number;
  filesCount?: number;
  className?: string;
  extraActions?: React.ReactNode;
}

interface PillButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
}

const PillButton: React.FC<PillButtonProps> = ({
  active,
  onClick,
  icon,
  label,
  badge,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverBgRef = useRef<HTMLDivElement>(null);

  const getDefaultHoverColor = useCallback(() => {
    if (typeof window === "undefined") return "rgba(255, 255, 255, 0.08)";
    const style = getComputedStyle(btnRef.current || document.documentElement);
    const val =
      style.getPropertyValue("--wb-card-hover-default").trim() ||
      style.getPropertyValue("--wb-card-hover-bg").trim();
    return val || "rgba(255, 255, 255, 0.08)";
  }, []);

  useEffect(() => {
    if (hoverBgRef.current) {
      gsap.set(hoverBgRef.current, {
        top: 4,
        left: 4,
        right: 4,
        bottom: 4,
        opacity: 0,
      });
    }
  }, []);

  const handleMouseEnter = () => {
    if (window.matchMedia("(hover: none)").matches) return;
    const finalColor = getDefaultHoverColor();

    if (hoverBgRef.current) {
      gsap.to(hoverBgRef.current, {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 1,
        backgroundColor: finalColor,
        duration: 0.22,
        ease: "power2.inOut",
      });
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia("(hover: none)").matches) return;

    if (hoverBgRef.current) {
      gsap.to(hoverBgRef.current, {
        top: 4,
        left: 4,
        right: 4,
        bottom: 4,
        opacity: 0,
        backgroundColor: "transparent",
        duration: 0.22,
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
      className={`relative isolate overflow-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-colors border ${
        active
          ? "border-transparent bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] hover:border-[var(--wb-primary)]/40 font-bold"
          : "border-transparent bg-[var(--wb-surface-bright)]/60 text-[var(--wb-on-surface-variant)] hover:border-[var(--wb-outline-variant)]/60 hover:text-[var(--wb-on-surface)]"
      }`}
    >
      <div
        ref={hoverBgRef}
        className="absolute pointer-events-none z-[-1] rounded-full"
      />

      {icon}
      <span>{label}</span>

      {badge !== undefined && (
        <span
          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] leading-tight ${
            active
              ? "bg-[var(--wb-primary)]/25 text-[var(--wb-primary)]"
              : "bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface-variant)]"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

/**
 * @description Renders navigation pills for Mod Details:
 * Description, Contributors, and Details.
 * Border color only appears on hover.
 */
export const ModNavPills: React.FC<ModNavPillsProps> = ({
  activeTab,
  onChangeTab,
  contributorsCount,
  filesCount,
  className = "",
  extraActions,
}) => {
  return (
    <div className={`flex items-center gap-2 mt-2.5 mb-2 flex-wrap ${className}`}>
      <PillButton
        active={activeTab === "description"}
        onClick={() => onChangeTab("description")}
        icon={<FileText className="w-3.5 h-3.5 shrink-0" />}
        label="Description"
      />

      <PillButton
        active={activeTab === "contributors"}
        onClick={() => onChangeTab("contributors")}
        icon={<Users className="w-3.5 h-3.5 shrink-0" />}
        label="Contributors"
        badge={contributorsCount}
      />

      <PillButton
        active={activeTab === "details"}
        onClick={() => onChangeTab("details")}
        icon={<Info className="w-3.5 h-3.5 shrink-0" />}
        label="Details"
        badge={filesCount}
      />

      {extraActions}
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { Pill } from "../../atoms/pill/pill";
import { Dropdown } from "../../atoms/dropdown/dropdown";
import { ChevronDown, Check } from "lucide-react";

export interface PillDropdownProps {
  label: string;
  options: { label: string; value: string; icon?: string | React.ReactNode }[];
  value: string | string[];
  onChange: (value: any) => void;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  align?: "left" | "right";
  isMulti?: boolean;
}

export const PillDropdown: React.FC<PillDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  icon,
  iconPosition = "left",
  align = "left",
  isMulti = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderIcon = (iconItem: string | React.ReactNode, className = "") => {
    if (!iconItem) return null;
    if (typeof iconItem === "string") {
      return (
        <img
          src={iconItem}
          alt="icon"
          className={`w-7 h-7 object-contain rounded-md ${className}`}
        />
      );
    }
    return (
      <span
        className={`flex items-center text-current opacity-70 ${className}`}
      >
        {iconItem}
      </span>
    );
  };

  // Determine display label and icon
  let displayLabel = label;
  let displayIcon: React.ReactNode = null;

  if (!isMulti) {
    const selectedOption = options.find((opt) => opt.value === value);
    if (selectedOption) {
      displayLabel = selectedOption.label;
      displayIcon = selectedOption.icon;
    }
  } else {
    const vals = Array.isArray(value) ? value : [];
    if (vals.length === 1 && vals[0] === "all") {
      const allOpt = options.find((o) => o.value === "all");
      displayLabel = allOpt ? allOpt.label : "All Engines";
      displayIcon = allOpt ? allOpt.icon : null;
    } else if (vals.length > 0) {
      displayLabel = `${vals.length} Selected`;
    }
  }

  const handleOptionClick = (optValue: string) => {
    if (isMulti) {
      const vals = Array.isArray(value) ? [...value] : [];
      if (optValue === "all") {
        onChange(["all"]);
      } else {
        const newVals = vals.filter((v) => v !== "all");
        if (newVals.includes(optValue)) {
          const removed = newVals.filter((v) => v !== optValue);
          onChange(removed.length === 0 ? ["all"] : removed);
        } else {
          onChange([...newVals, optValue]);
        }
      }
    } else {
      onChange(optValue);
      setIsOpen(false);
    }
  };

  const isSelected = (optValue: string) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(optValue);
    }
    return value === optValue;
  };

  return (
    <div
      className="relative inline-block text-left w-full sm:w-auto"
      ref={containerRef}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Pill
        onClick={() => setIsOpen(!isOpen)}
        isActive={isOpen}
        className="flex items-center justify-start text-left gap-2 w-full"
      >
        {iconPosition === "left" && displayIcon && renderIcon(displayIcon)}
        {iconPosition === "left" && icon && !displayIcon && (
          <span className="text-gray-400 flex items-center">{icon}</span>
        )}

        <span className="font-semibold">{displayLabel}</span>

        {iconPosition === "right" &&
          displayIcon &&
          renderIcon(displayIcon, "ml-1")}
        {iconPosition === "right" && icon && !displayIcon && (
          <span className="text-gray-400 flex items-center ml-1">{icon}</span>
        )}

        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ml-auto sm:ml-0.5 ${isOpen ? "rotate-180" : ""}`}
        />
      </Pill>

      <Dropdown
        isOpen={isOpen}
        className={`w-64 ${align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"}`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={(e) => {
              e.preventDefault();
              handleOptionClick(opt.value);
            }}
            className={`w-full flex items-center text-left px-5 py-2.5 transition-colors block ${
              iconPosition === "left"
                ? "justify-start gap-3"
                : "justify-between"
            } ${
              isSelected(opt.value)
                ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] font-semibold"
                : "text-[var(--wb-on-surface-variant)] hover:bg-[var(--wb-surface-variant)] hover:text-[var(--wb-on-surface)]"
            }`}
          >
            {iconPosition === "left" && opt.icon && renderIcon(opt.icon)}
            <span>{opt.label}</span>
            {iconPosition === "right" && opt.icon && renderIcon(opt.icon)}
            {isMulti && isSelected(opt.value) && (
              <Check size={16} className="ml-auto text-[var(--wb-primary)]" />
            )}
          </button>
        ))}
      </Dropdown>
    </div>
  );
};

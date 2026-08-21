import React, { useState, useRef, useEffect } from "react";
import { Pill } from "../../atoms/pill/pill";
import { Dropdown } from "../../atoms/dropdown/dropdown";
import { ChevronDown } from "lucide-react";

export interface PillDropdownProps {
  label: string;
  options: { label: string; value: string; icon?: string | React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  align?: "left" | "right";
}

export const PillDropdown: React.FC<PillDropdownProps> = ({ label, options, value, onChange, icon, iconPosition = "left", align = "left" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const renderIcon = (iconItem: string | React.ReactNode, className = "") => {
    if (!iconItem) return null;
    if (typeof iconItem === 'string') {
      return <img src={iconItem} alt="icon" className={`w-7 h-7 object-contain rounded-md ${className}`} />;
    }
    return <span className={`flex items-center text-current opacity-70 ${className}`}>{iconItem}</span>;
  };

  return (
    <div 
      className="relative inline-block text-left" 
      ref={containerRef}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Pill onClick={() => setIsOpen(!isOpen)} isActive={isOpen} className="flex items-center gap-2">
        {iconPosition === "left" && selectedOption?.icon && renderIcon(selectedOption.icon)}
        {iconPosition === "left" && icon && !selectedOption?.icon && <span className="text-gray-400 flex items-center">{icon}</span>}
        
        <span className="font-semibold">{selectedOption?.label || label}</span>
        
        {iconPosition === "right" && selectedOption?.icon && renderIcon(selectedOption.icon, "ml-1")}
        {iconPosition === "right" && icon && !selectedOption?.icon && <span className="text-gray-400 flex items-center ml-1">{icon}</span>}
        
        <ChevronDown size={14} className={`transition-transform duration-200 ml-0.5 ${isOpen ? "rotate-180" : ""}`} />
      </Pill>
      
      <Dropdown isOpen={isOpen} className={`w-64 ${align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"}`}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onChange(opt.value);
              setIsOpen(false);
            }}
            className={`w-full flex items-center text-left px-5 py-2.5 transition-colors block ${
              iconPosition === "left" ? "justify-start gap-3" : "justify-between"
            } ${
              opt.value === value 
                ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] font-semibold" 
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {iconPosition === "left" && opt.icon && renderIcon(opt.icon)}
            <span>{opt.label}</span>
            {iconPosition === "right" && opt.icon && renderIcon(opt.icon)}
          </button>
        ))}
      </Dropdown>
    </div>
  );
};

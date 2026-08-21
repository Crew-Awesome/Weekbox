import React from "react";

export interface DropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ isOpen, children, className = "" }) => {
  if (!isOpen) return null;
  return (
    <div className={`absolute z-50 pt-2 min-w-[12rem] ${className}`}>
      <div className="rounded-xl border border-white/10 bg-[#121212] shadow-2xl py-2 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

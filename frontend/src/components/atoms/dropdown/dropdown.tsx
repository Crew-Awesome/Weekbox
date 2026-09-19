import React from "react";

export interface DropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  children,
  className = "",
}) => {
  if (!isOpen) return null;
  return (
    <div className={`absolute z-50 pt-2 min-w-[12rem] ${className}`}>
      <div className="rounded-2xl border border-[var(--wb-outline-variant)]/60 bg-[var(--wb-surface-container)] text-[var(--wb-on-surface)] shadow-2xl py-2 overflow-y-auto max-h-[min(24rem,calc(100vh-10rem))] backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
};

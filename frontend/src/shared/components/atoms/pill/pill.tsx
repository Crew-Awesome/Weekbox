import React from "react";

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isActive?: boolean;
}

export const Pill: React.FC<PillProps> = ({ children, isActive, className = "", ...props }) => {
  return (
    <button
      className={`px-5 py-2 rounded-full font-medium transition-colors border outline-none ${
        isActive 
          ? "bg-[var(--wb-primary)] text-white border-[var(--wb-primary)]" 
          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 focus:ring-2 focus:ring-white/20"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

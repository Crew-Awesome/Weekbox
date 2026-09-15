import React from "react";

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isActive?: boolean;
}

export const Pill: React.FC<PillProps> = ({
  children,
  isActive,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`px-4 py-2 rounded-full font-medium transition-all duration-200 border outline-none cursor-pointer select-none ${
        isActive
          ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] border-[var(--wb-primary)] shadow-sm font-semibold"
          : "bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface-variant)] border-[var(--wb-outline-variant)]/60 hover:bg-[var(--wb-surface-container-highest)] hover:text-[var(--wb-on-surface)] hover:border-[var(--wb-outline-variant)] focus:ring-2 focus:ring-[var(--wb-primary)]/20"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

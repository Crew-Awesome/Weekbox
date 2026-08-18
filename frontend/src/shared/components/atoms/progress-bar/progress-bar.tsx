import React from "react";

export interface ProgressBarProps {
  progress: number;
  actionText: string;
}

/**
 * @description Atom: Progress Bar.
 * Displays the progress percentage and the current action being executed.
 * @param {ProgressBarProps} props - Component properties.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  actionText,
}) => {
  // Ensure progress is clamped between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full max-w-2xl flex flex-col space-y-2">
      <div className="flex justify-between items-center text-sm font-semibold text-white drop-shadow-md">
        <span>{actionText}</span>
        <span>{Math.round(clampedProgress)}%</span>
      </div>
      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 shadow-inner">
        <div
          className="h-full bg-[var(--wb-primary)] rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_var(--wb-primary)]"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

import React from "react";

export interface ProgressBarProps {
  progress: number;
  actionText: string;
}

/**
 * Atom: Progress Bar.
 * Displays the progress percentage and the current action being executed.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  actionText,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <>
      <div className="fixed right-0 bottom-3 left-0 z-10 w-auto px-[18px] pb-[7px] box-border flex flex-col gap-2">
        <div className="flex justify-between items-baseline w-full gap-4 text-sm text-white drop-shadow-md">
          <p className="m-0 font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0 text-left drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {actionText}
          </p>
          <span className="m-0 font-bold tabular-nums shrink-0 text-right drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      </div>
      <div className="fixed right-0 bottom-0 left-0 z-20 w-auto h-3 border-t border-[rgba(255,255,255,0.15)] bg-black/40">
        <div
          className="h-full bg-[var(--wb-primary)] relative overflow-hidden transition-all duration-200 ease-out shadow-[0_0_10px_color-mix(in_srgb,var(--wb-primary)_55%,transparent)]"
          style={{ width: `${clampedProgress}%` }}
        >
          <div 
            className="absolute top-0 bottom-0 -left-6 z-10 pointer-events-none"
            style={{ 
              width: "calc(100% + 48px)",
              background: "repeating-linear-gradient(45deg, color-mix(in srgb, #ffffff 22%, var(--wb-primary)) 0 8px, var(--wb-primary) 8px 16px)",
              animation: "startup-loading-barber-pole 700ms linear infinite"
            }}
          />
        </div>
      </div>
    </>
  );
};

import React from "react";
import { AppVersion } from "../../atoms/app-version/app-version";
import { ProgressBar } from "../../atoms/progress-bar/progress-bar";

import loadingBg from "/assets/images/loading.webp";
import { useLoadingTasks } from "./hooks/use-loading-tasks";
import type { LoadingScreenProps } from "./types";

export type { LoadingTask, LoadingScreenProps } from "./types";

/**
 * Loading Screen (Feature Presentation Component).
 * Visually displays startup progress, background artwork, and application version.
 * Task execution and lifecycle transitions are delegated to `useLoadingTasks`.
 * Uses `useBlurOnTop` to render an instant full-screen blur overlay that fades out smoothly.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading = true,
  tasks = [],
  onComplete,
}) => {
  const { progress, action, isFadingOut, isMounted } = useLoadingTasks({
    isLoading,
    tasks,
    onComplete,
  });


  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col justify-end items-center bg-[#11191a] transition-opacity duration-[220ms] ease-out select-none overflow-hidden ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div 
        className="absolute -inset-6 z-0 bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${loadingBg})`,
          animation: "startup-loading-background-reveal 4.5s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      />
      
      <div 
        className="absolute inset-0 z-0 bg-black/40"
        style={{
          animation: "startup-loading-overlay-reveal 4s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      />

      <div className="absolute top-5 right-6 text-white text-[0.85rem] font-semibold tracking-wide opacity-85 tabular-nums z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
        <AppVersion />
      </div>

      <ProgressBar progress={progress} actionText={action} />
    </div>
  );
};

export default LoadingScreen;

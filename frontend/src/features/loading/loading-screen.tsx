import React from "react";
import Shared from "@shared";
import loadingBg from "/assets/images/loading.webp";
import { useLoadingTasks } from "./hooks/use-loading-tasks";
import type { LoadingScreenProps } from "./types";

export type { LoadingTask, LoadingScreenProps } from "./types";

/**
 * Loading Screen (Feature Presentation Component).
 * Visually displays startup progress, background artwork, and application version.
 * Task execution and lifecycle transitions are delegated to `useLoadingTasks`.
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
      className={`fixed inset-0 z-50 flex flex-col justify-end items-center pb-24 transition-opacity duration-500 ease-in-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage: `url(${loadingBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1415]/90 via-[#0e1415]/20 to-[#0e1415]/50 z-0" />
      <Shared.atoms.AppVersion />

      <div className="relative z-10 w-full px-8 md:px-32 flex justify-center">
        <Shared.atoms.ProgressBar progress={progress} actionText={action} />
      </div>
    </div>
  );
};

export default LoadingScreen;

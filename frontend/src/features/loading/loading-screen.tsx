import React, { useState, useEffect } from "react";
import Shared from "@shared";
import loadingBg from "/assets/images/loading.webp";
import Utils from "@utils";

export interface LoadingTask {
  name: string;
  action: () => Promise<void> | void;
}

export interface LoadingScreenProps {
  /** Indicates if the loading screen should be shown (for backwards compatibility) */
  isLoading?: boolean;
  /** Actual tasks to execute during loading */
  tasks?: LoadingTask[];
  /** Optional callback upon loading completion */
  onComplete?: () => void;
}

/**
 * Loading Screen (Feature).
 * Executes real asynchronous startup tasks and visually displays their progress.
 * Manages its own unmounting lifecycle, applying a smooth fade-out CSS transition upon reaching 100%.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading = true,
  tasks = [],
  onComplete,
}) => {
  Utils.hooks.useShowWindow();
  const [progress, setProgress] = useState(0);
  const [action, setAction] = useState("Initializing environment...");

  // States to control smooth unmounting
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(isLoading);

  useEffect(() => {
    if (!isLoading) return;

    let isCancelled = false;

    const finishLoading = () => {
      setIsFadingOut(true);

      setTimeout(() => {
        if (isCancelled) return;
        setIsMounted(false);
        onComplete?.();
      }, 500);
    };

    const runTasks = async () => {
      if (tasks.length === 0) {
        setProgress(100);
        setAction("Ready!");
        finishLoading();
        return;
      }

      for (let i = 0; i < tasks.length; i++) {
        if (isCancelled) return;
        const task = tasks[i];

        setAction(task.name);
        const currentProgress = Math.round((i / tasks.length) * 100);
        setProgress(currentProgress);

        try {
          await task.action();
        } catch (error) {
          console.error(`Error executing startup task: ${task.name}`, error);
        }
      }

      if (isCancelled) return;

      setProgress(100);
      setAction("Ready!");
      finishLoading();
    };

    const preloadImage = new Image();
    preloadImage.src = loadingBg;

    const startTasksAfterRender = () => {
      if (isCancelled) return;
      requestAnimationFrame(() => {
        setTimeout(runTasks, 100);
      });
    };

    preloadImage.onload = startTasksAfterRender;
    preloadImage.onerror = startTasksAfterRender;

    return () => {
      isCancelled = true;
    };
  }, [isLoading, tasks, onComplete]);

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

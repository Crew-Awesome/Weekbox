import React, { useState, useEffect } from "react";
import { ProgressBar } from "../../shared/components/atoms/progress-bar/progress-bar";
import { AppVersion } from "../../shared/components/atoms/app-version/app-version";
import loadingBg from "/assets/images/loading.webp";

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
 * @description Pantalla de Carga (Feature).
 * Ejecuta tareas asíncronas reales y muestra su progreso.
 * Maneja independientemente la lógica de ocultarse al llegar al 100% usando un fade-out suave.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading = true,
  tasks = [],
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [action, setAction] = useState("Iniciando entorno...");

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
      }, 500); // 500ms to match CSS transition
    };

    const runTasks = async () => {
      if (tasks.length === 0) {
        // If no tasks, complete loading directly
        setProgress(100);
        setAction("¡Listo!");
        finishLoading();
        return;
      }

      for (let i = 0; i < tasks.length; i++) {
        if (isCancelled) return;
        const task = tasks[i];

        setAction(task.name);

        try {
          await task.action();
        } catch (error) {
          console.error(
            `Error al ejecutar tarea de carga: ${task.name}`,
            error,
          );
          // Optionally handle an error state in the UI,
          // but for now just continue with the next task.
        }

        if (isCancelled) return;

        // Update progress based on completed tasks
        const nextProgress = Math.round(((i + 1) / tasks.length) * 100);
        setProgress(nextProgress);
      }

      if (isCancelled) return;
      setAction("¡Listo!");
      finishLoading();
    };

    runTasks();

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
      {/* Darkening layer (Gradient) to make version text pop */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1415]/90 via-[#0e1415]/20 to-[#0e1415]/50 z-0" />
      <AppVersion />

      {/* Progress bar */}
      <div className="relative z-10 w-full px-8 md:px-32 flex justify-center">
        <ProgressBar progress={progress} actionText={action} />
      </div>
    </div>
  );
};

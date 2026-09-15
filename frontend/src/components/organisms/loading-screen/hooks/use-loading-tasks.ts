import { useState, useEffect } from "react";
import Utils from "@utils";
import loadingBg from "/assets/images/loading.webp";
import type { UseLoadingTasksOptions, UseLoadingTasksResult } from "../types";

/**
 * Hook that orchestrates the execution of startup loading tasks,
 * managing progress, retries with exponential backoff, timeouts, and unmount transitions.
 */
export function useLoadingTasks({
  isLoading = true,
  tasks = [],
  onComplete,
}: UseLoadingTasksOptions): UseLoadingTasksResult {
  Utils.hooks.useShowWindow();

  const [progress, setProgress] = useState(0);
  const [action, setAction] = useState("Initializing environment...");
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

        const currentProgress = Math.round((i / tasks.length) * 100);
        setProgress(currentProgress);

        const maxRetries = task.retries !== undefined ? task.retries : 2;
        const totalAttempts = maxRetries + 1;
        const timeoutMs = task.timeoutMs || 20000;
        let lastError: any = null;
        let succeeded = false;

        for (let attempt = 1; attempt <= totalAttempts; attempt++) {
          if (isCancelled) return;

          if (attempt > 1) {
            const retryCount = attempt - 1;
            const baseRetry = task.retryName
              ? task.retryName.replace(/\.+$/, "")
              : task.name.toLowerCase().includes("gamebanana") || task.name.toLowerCase().includes("mods")
              ? "Retrying to obtain GameBanana mods"
              : `Retrying: ${task.name.replace(/\.+$/, "")}`;

            const retryText = `${baseRetry} (${retryCount}/${maxRetries})...`;
            setAction(retryText);

            const backoffMs = attempt * 1500;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            if (isCancelled) return;
          } else {
            setAction(task.name);
          }

          try {
            await Promise.race([
              task.action(),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Task ${task.name} timed out`)),
                  timeoutMs,
                ),
              ),
            ]);
            succeeded = true;
            if (task.onAttemptComplete) {
              try {
                await task.onAttemptComplete(attempt, true);
              } catch (e) {
                console.warn(`[useLoadingTasks] Error in onAttemptComplete:`, e);
              }
            }
            break;
          } catch (error) {
            lastError = error;
            console.warn(
              `Attempt ${attempt}/${totalAttempts} failed for task: ${task.name}`,
              error,
            );
            if (task.onAttemptComplete) {
              try {
                await task.onAttemptComplete(attempt, false, error);
              } catch (e) {
                console.warn(`[useLoadingTasks] Error in onAttemptComplete:`, e);
              }
            }
          }
        }

        if (!succeeded && !isCancelled) {
          console.error(`Error executing startup task: ${task.name}`, lastError);

          const isTimeout = String(lastError?.message || "").includes("timed out");
          const errorMsg = isTimeout
            ? `Connection timed out while ${task.name.toLowerCase().replace(/\.+$/, "")}. Check your connection.`
            : `Could not complete "${task.name}". Operating in offline mode.`;

          Utils.toast.error(errorMsg, {
            title: "GameBanana Connection Warning",
            duration: 6000,
          });
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

  return {
    progress,
    action,
    isFadingOut,
    isMounted,
  };
}

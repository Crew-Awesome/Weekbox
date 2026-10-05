import { useMemo } from "react";
import { useDownloadStore } from "../../../store";

interface UseLibraryDownloadsOptions {
  showFavoritesOnly: boolean;
  favorites: Record<string, any>;
}

/**
 * Calculates active download file IDs, downloading mod IDs set,
 * and filtered downloading files matching favorite criteria.
 */
export function useLibraryDownloads({
  showFavoritesOnly,
  favorites,
}: UseLibraryDownloadsOptions) {
  const taskFileKeys = useDownloadStore((s) => Object.keys(s.tasks).join(","));
  const activeFileIds = useMemo(
    () => (taskFileKeys ? taskFileKeys.split(",") : []),
    [taskFileKeys]
  );

  const taskModIdsString = useDownloadStore((s) =>
    Object.values(s.tasks)
      .map((t) => String(t.modId))
      .join(",")
  );
  const downloadingModIds = useMemo(
    () => new Set(taskModIdsString ? taskModIdsString.split(",") : []),
    [taskModIdsString]
  );

  const displayedDownloadingFileIds = useMemo(() => {
    if (!showFavoritesOnly) return activeFileIds;
    const allTasks = useDownloadStore.getState().tasks;
    return activeFileIds.filter((fileId) => {
      const task = allTasks[fileId];
      return task && Boolean(favorites[String(task.modId)]);
    });
  }, [activeFileIds, showFavoritesOnly, favorites]);

  return {
    activeFileIds,
    downloadingModIds,
    displayedDownloadingFileIds,
  };
}

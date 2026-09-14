import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchEngineReleases,
  type EngineReleaseItem,
} from "../../../core/services/engines/engine-releases.service";

export interface UseEngineReleasesResult {
  releases: EngineReleaseItem[];
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
  currentRelease: EngineReleaseItem | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to retrieve and manage releases and markdown changelogs for an engine.
 */
export function useEngineReleases(engineId: string): UseEngineReleasesResult {
  const [releases, setReleases] = useState<EngineReleaseItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadReleases = useCallback(async () => {
    if (!engineId || engineId === "executable") {
      setReleases([]);
      setSelectedVersion("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEngineReleases(engineId);
      setReleases(data);
      if (data.length > 0) {
        setSelectedVersion(data[0].version);
      } else {
        setSelectedVersion("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load releases";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [engineId]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const currentRelease = useMemo(() => {
    if (!releases.length) return null;
    return (
      releases.find((r) => r.version === selectedVersion) ||
      releases[0] ||
      null
    );
  }, [releases, selectedVersion]);

  return {
    releases,
    selectedVersion,
    setSelectedVersion,
    currentRelease,
    isLoading,
    error,
    refresh: loadReleases,
  };
}

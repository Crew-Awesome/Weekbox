import { useEffect, useMemo } from "react";
import Core from "@core";
import { useEngineReleases } from "./use-engine-releases";
import { VSLICE_PLAYSTORE_SCREENSHOTS } from "./use-base-game-mobile";
import { useEngineDownloadStore } from "../../../store";

interface UseInstanceReleasesProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  isBaseGameMobile: boolean;
  isBaseGameInstalled: boolean;
  isOnline: boolean;
  isExecutable: boolean;
  installedVersionsForCategory: string[];
  currentEngineMeta: { id: string; name: string; icon: string };
  installedEngineMap: Record<string, boolean>;
  setInstalledEngineMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  installedEnginesRegistry: Record<string, Record<string, any>>;
  installedMods: any[];
  isCapacitor: boolean;
}

export function useInstanceReleases({
  selectedCategory,
  setSelectedCategory,
  isBaseGameMobile,
  isBaseGameInstalled,
  isOnline,
  isExecutable,
  installedVersionsForCategory,
  currentEngineMeta,
  installedEngineMap,
  setInstalledEngineMap,
  installedEnginesRegistry,
  installedMods,
  isCapacitor,
}: UseInstanceReleasesProps) {
  const {
    releases: rawReleases,
    selectedVersion: rawSelectedVersion,
    setSelectedVersion,
    isLoading: isLoadingReleases,
  } = useEngineReleases(selectedCategory);

  const releases = useMemo(() => {
    if (isBaseGameMobile) {
      if (!isOnline && !isBaseGameInstalled) {
        return [];
      }
      const ver = "0.8.8";
      const body = `### About the Game
Hey, hope you’re enjoying Funkin’ on the go! We’ve been hard at work to make the game better for you:

- Story Mode & Freeplay featuring all official Weeks!
- Custom touch controls tailored for mobile screens.
- Secret cheat code input: push both thumbs onto the screen and apply as much pressure as possible!

### What's New in v0.8.8
- Android hotfixes and stability improvements.
- Fixed chart file handling and audio backend crashes.
- Shader rendering optimizations for mobile devices.`;

      return [
        {
          id: "playstore-0.8.8",
          version: ver,
          name: `Friday Night Funkin' v${ver}`,
          body,
          releasedAt: "2026-08-28T00:00:00.000Z",
          downloadUrl: "https://play.google.com/store/search?q=fnf&c=apps&h",
          previewMedia: VSLICE_PLAYSTORE_SCREENSHOTS,
        },
      ];
    }

    if (!isOnline) {
      // Offline: only include installed engine versions
      const installedSet = new Set(
        installedVersionsForCategory.map((v) => v.toLowerCase().replace(/^v/, ""))
      );
      const list = rawReleases.filter((r) =>
        installedSet.has(r.version.toLowerCase().replace(/^v/, ""))
      );

      for (const instVer of installedVersionsForCategory) {
        const cleanInst = instVer.toLowerCase().replace(/^v/, "");
        const alreadyInList = list.some(
          (r) => r.version.toLowerCase().replace(/^v/, "") === cleanInst
        );
        if (!alreadyInList) {
          list.push({
            id: `installed-${instVer}`,
            version: instVer,
            name: `${currentEngineMeta.name} v${instVer}`,
            body: `### ${currentEngineMeta.name} v${instVer}\n\nThis engine version is installed locally on your system.`,
            releasedAt: null,
            downloadUrl: null,
          });
        }
      }
      return list;
    }

    // Online: include rawReleases plus any local installed versions not present in GitHub
    const list = [...rawReleases];
    for (const instVer of installedVersionsForCategory) {
      const cleanInst = instVer.toLowerCase().replace(/^v/, "");
      const alreadyInList = list.some(
        (r) => r.version.toLowerCase().replace(/^v/, "") === cleanInst
      );
      if (!alreadyInList) {
        list.push({
          id: `installed-${instVer}`,
          version: instVer,
          name: `${currentEngineMeta.name} v${instVer}`,
          body: `### ${currentEngineMeta.name} v${instVer}\n\nThis engine version is installed locally on your system.`,
          releasedAt: null,
          downloadUrl: null,
        });
      }
    }
    return list;
  }, [
    isBaseGameMobile,
    isOnline,
    isBaseGameInstalled,
    rawReleases,
    installedVersionsForCategory,
    currentEngineMeta.name,
  ]);

  const selectedVersion = useMemo(() => {
    if (isBaseGameMobile) {
      return releases.length > 0 ? releases[0].version : "";
    }
    if (!isOnline && !isExecutable) {
      if (releases.length === 0) return "";
      const match = releases.find(
        (r) =>
          r.version.toLowerCase().replace(/^v/, "") ===
          rawSelectedVersion.toLowerCase().replace(/^v/, "")
      );
      if (match) return match.version;
      return releases[0].version;
    }
    return rawSelectedVersion;
  }, [isBaseGameMobile, isOnline, isExecutable, releases, rawSelectedVersion]);

  const currentRelease = useMemo(() => {
    if (!releases.length) return null;
    if (isBaseGameMobile) {
      return releases[0] || null;
    }
    const cleanSel = selectedVersion.toLowerCase().replace(/^v/, "");
    return (
      releases.find(
        (r) => r.version.toLowerCase().replace(/^v/, "") === cleanSel
      ) ||
      releases[0] ||
      null
    );
  }, [isBaseGameMobile, releases, selectedVersion]);

  /** Checks if selected version is installed on disk */
  useEffect(() => {
    if (isExecutable || !currentRelease || !Core.platform.isEngineInstalled) return;

    const key = `${selectedCategory}:${currentRelease.version}`;
    let isMounted = true;

    Core.platform
      .isEngineInstalled(selectedCategory, currentRelease.version)
      .then((installed: boolean) => {
        if (isMounted) {
          setInstalledEngineMap((prev) => ({
            ...prev,
            [key]: installed,
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isExecutable, selectedCategory, currentRelease?.version, setInstalledEngineMap]);

  const isCurrentEngineInstalled = useMemo(() => {
    if (isBaseGameMobile) return isBaseGameInstalled;
    if (isExecutable || !currentRelease) return false;
    const cleanCurrentVer = currentRelease.version.toLowerCase().replace(/^v/, "");
    const versionMatch = installedVersionsForCategory.some(
      (v) => v.toLowerCase().replace(/^v/, "") === cleanCurrentVer
    );
    return (
      versionMatch || Boolean(installedEngineMap[`${selectedCategory}:${currentRelease.version}`])
    );
  }, [
    isBaseGameMobile,
    isBaseGameInstalled,
    isExecutable,
    selectedCategory,
    currentRelease?.version,
    installedVersionsForCategory,
    installedEngineMap,
  ]);

  const isNightly = useMemo(() => {
    return Boolean(
      currentRelease?.isNightly || currentRelease?.version?.toLowerCase() === "nightly"
    );
  }, [currentRelease]);

  /** Check if installed Nightly is outdated compared to GitHub release */
  const isNightlyOutdated = useMemo(() => {
    if (!isNightly || !isCurrentEngineInstalled || !currentRelease?.releasedAt) return false;
    const catData = installedEnginesRegistry[selectedCategory.toLowerCase()] || {};
    const installedEntry =
      catData["nightly"] ||
      catData[currentRelease.version.toLowerCase()] ||
      Object.values(catData)[0];

    if (!installedEntry) return false;
    const installedTime = installedEntry.installedAt || installedEntry.releasedAt;
    if (!installedTime) return false;

    return new Date(currentRelease.releasedAt).getTime() > new Date(installedTime).getTime();
  }, [
    isNightly,
    isCurrentEngineInstalled,
    currentRelease?.releasedAt,
    installedEnginesRegistry,
    selectedCategory,
    currentRelease?.version,
  ]);

  const currentEngineTask = useEngineDownloadStore((s) => s.currentTask);

  const isDownloadingCurrent = useMemo(() => {
    if (!currentRelease || !currentEngineTask) return false;
    const catMatch = currentEngineTask.engineId.toLowerCase() === selectedCategory.toLowerCase();
    const verMatch =
      currentEngineTask.version.toLowerCase().replace(/^v/, "") ===
      currentRelease.version.toLowerCase().replace(/^v/, "");
    return catMatch && verMatch;
  }, [currentEngineTask, selectedCategory, currentRelease?.version]);

  /**
   * When offline, if the currently selected category has no installed instances/mods,
   * automatically switch to the first category that has installed instances or executable mods.
   */
  useEffect(() => {
    if (!isOnline) {
      const currentHasInstalled = isExecutable
        ? installedMods.length > 0
        : isBaseGameMobile
        ? isBaseGameInstalled
        : installedVersionsForCategory.length > 0;

      if (!currentHasInstalled) {
        const catWithInstalled = Object.keys(installedEnginesRegistry).find((cat) => {
          const versions = installedEnginesRegistry[cat];
          return versions && Object.keys(versions).length > 0;
        });

        if (catWithInstalled) {
          setSelectedCategory(catWithInstalled);
        } else if (installedMods.length > 0 && !isCapacitor) {
          setSelectedCategory("executable");
        }
      }
    }
  }, [
    isOnline,
    isExecutable,
    isBaseGameMobile,
    isBaseGameInstalled,
    installedVersionsForCategory.length,
    installedMods.length,
    installedEnginesRegistry,
    isCapacitor,
    setSelectedCategory,
  ]);

  return {
    rawSelectedVersion,
    selectedVersion,
    setSelectedVersion,
    releases,
    currentRelease,
    isLoadingReleases,
    isCurrentEngineInstalled,
    isNightly,
    isNightlyOutdated,
    isDownloadingCurrent,
    currentEngineTask,
  };
}

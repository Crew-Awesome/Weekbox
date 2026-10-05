import { useState, useEffect, useMemo } from "react";
import Core from "@core";

export function useExecutableMods(selectedCategory: string) {
  const isExecutable = useMemo(() => {
    return selectedCategory === "executable" || selectedCategory === "3827";
  }, [selectedCategory]);

  const [installedMods, setInstalledMods] = useState<any[]>([]);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [isLoadingMods, setIsLoadingMods] = useState<boolean>(false);

  /** Load executable mods when category is executable */
  useEffect(() => {
    if (!isExecutable) return;

    let isMounted = true;
    setIsLoadingMods(true);

    Core.platform
      .getInstalledMods()
      .then((mods: any[]) => {
        if (!isMounted) return;
        const exes = (mods || []).filter((m: any) => {
          const eid = String(m.engineId || "").toLowerCase();
          const ename = String(m.engineName || "").toLowerCase();
          return eid === "executable" || eid === "3827" || ename.includes("executable");
        });

        setInstalledMods(exes);
        if (exes.length > 0) {
          setSelectedModId((prev) =>
            prev && exes.some((x: any) => String(x.id) === String(prev)) ? prev : String(exes[0].id)
          );
        } else {
          setSelectedModId(null);
        }
      })
      .catch(() => {
        if (isMounted) setInstalledMods([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMods(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isExecutable]);

  const selectedMod = useMemo(() => {
    if (!isExecutable || !installedMods.length) return null;
    return (
      installedMods.find((m) => String(m.id) === String(selectedModId)) ||
      installedMods[0] ||
      null
    );
  }, [isExecutable, installedMods, selectedModId]);

  return {
    isExecutable,
    installedMods,
    setInstalledMods,
    selectedModId,
    setSelectedModId,
    selectedMod,
    isLoadingMods,
  };
}

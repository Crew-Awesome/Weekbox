import { useEffect } from "react";
import Core from "@core";
import { useLibraryStore } from "../../../store";

/**
 * Handles initial loading of installed mods and subscribes to
 * local DOM events and platform IPC events for mod state changes.
 */
export function useLibraryModEvents() {
  const loadInstalledMods = useLibraryStore((s) => s.loadInstalledMods);
  const setInstalledMods = useLibraryStore((s) => s.setInstalledMods);

  useEffect(() => {
    loadInstalledMods(false);
  }, [loadInstalledMods]);

  useEffect(() => {
    const handleModsChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string; modId?: string; mod?: any }>).detail;
      if (!detail) {
        loadInstalledMods(true);
        return;
      }

      if (detail.action === "uninstalled" && detail.modId) {
        setInstalledMods((prev) =>
          prev.filter((m) => String(m.id) !== String(detail.modId))
        );
      } else if (detail.action === "installed" && detail.mod) {
        setInstalledMods((prev) => {
          const filtered = prev.filter(
            (m) => String(m.id) !== String(detail.mod.id)
          );
          return [detail.mod, ...filtered];
        });
      } else if (detail.action === "updated" && detail.mod) {
        setInstalledMods((prev) =>
          prev.map((m) =>
            String(m.id) === String(detail.mod.id) ? { ...m, ...detail.mod } : m
          )
        );
      } else {
        loadInstalledMods(true);
      }
    };

    window.addEventListener("wb:mods-changed", handleModsChanged);
    const unsubPlatform = Core.platform.onEvent("mods:changed", (data: any) => {
      if (data?.action === "uninstalled" && data?.modId) {
        setInstalledMods((prev) =>
          prev.filter((m) => String(m.id) !== String(data.modId))
        );
      } else if (data?.action === "installed" && data?.mod) {
        setInstalledMods((prev) => {
          const filtered = prev.filter(
            (m) => String(m.id) !== String(data.mod.id)
          );
          return [data.mod, ...filtered];
        });
      } else if (data?.action === "updated" && data?.mod) {
        setInstalledMods((prev) =>
          prev.map((m) =>
            String(m.id) === String(data.mod.id) ? { ...m, ...data.mod } : m
          )
        );
      } else {
        loadInstalledMods(true);
      }
    });

    return () => {
      window.removeEventListener("wb:mods-changed", handleModsChanged);
      unsubPlatform();
    };
  }, [loadInstalledMods, setInstalledMods]);
}

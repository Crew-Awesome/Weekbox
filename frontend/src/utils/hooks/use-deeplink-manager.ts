import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Core from "@core";
import { useAppStore } from "../../store";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Hook lógico invisible que atrapa los enlaces profundos (Deeplinks).
 * Escucha la inicialización de la app y los eventos "newInstance" / "deeplinkArgs".
 * Si atrapa un mod, lo valida, trae la ventana principal al frente y abre el modal del mod.
 */
export function useDeeplinkManager() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeModId = useAppStore((state) => state.activeDeepLinkModId);
  const setActiveModId = useAppStore((state) => state.setActiveDeepLinkModId);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);

  const locationRef = useRef(location);
  locationRef.current = location;

  const lastProcessedDeeplinkRef = useRef<{ id: number; timestamp: number }>({
    id: 0,
    timestamp: 0,
  });

  useEffect(() => {
    const extractArgs = (eventData: any): string[] => {
      if (!eventData) return [];
      if (Array.isArray(eventData)) return eventData;
      if (Array.isArray(eventData?.args)) return eventData.args;
      if (Array.isArray(eventData?.detail?.args)) return eventData.detail.args;
      if (Array.isArray(eventData?.detail)) return eventData.detail;
      if (Array.isArray(eventData?.data?.args)) return eventData.data.args;
      if (Array.isArray(eventData?.data)) return eventData.data;
      if (typeof eventData?.detail === "string") return [eventData.detail];
      if (typeof eventData === "string") return [eventData];
      return [];
    };

    const checkDeeplink = async (
      args?: string[],
      isStartup: boolean = false,
    ) => {
      const deeplink = args
        ? Core.os.parseDeeplinkArgs(args)
        : Core.os.parseStartupDeeplink();

      if (deeplink) {
        console.log("[useDeeplinkManager] Deeplink detected:", deeplink);
        const now = Date.now();
        const isDuplicate =
          lastProcessedDeeplinkRef.current.id === deeplink.id &&
          now - lastProcessedDeeplinkRef.current.timestamp < 1500;

        lastProcessedDeeplinkRef.current = {
          id: deeplink.id,
          timestamp: now,
        };

        if (!isDuplicate) {
          setActiveModId(deeplink.id);
          if (locationRef.current.pathname !== "/home" && locationRef.current.pathname !== "/library") {
            navigate("/home");
          }
        }
      }

      try {
        if (isStartup && window.NL_OS === "Windows") {
          await Core.window.setSize(1280, 720).catch(() => {});
          await Core.window.center().catch(() => {});
        }
      } catch {}

      try {
        await Core.window.bringToFront();
      } catch (e) {
        console.warn("[useDeeplinkManager] Window show error:", e);
      }
    };

    // Check startup deeplink on initial mount
    checkDeeplink(undefined, true);

    // Capacitor native startup launch URL
    if (Capacitor.isNativePlatform()) {
      App.getLaunchUrl()
        .then((launchUrl) => {
          if (launchUrl?.url) {
            console.log("[useDeeplinkManager] Capacitor launchUrl:", launchUrl.url);
            checkDeeplink([launchUrl.url], true);
          }
        })
        .catch((err) => {
          console.warn("[useDeeplinkManager] getLaunchUrl error:", err);
        });
    }

    // Capacitor appUrlOpen listener for when app is running / opened from background
    let removeCapacitorListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener("appUrlOpen", (eventData: { url: string }) => {
        if (eventData?.url) {
          console.log("[useDeeplinkManager] Capacitor appUrlOpen event:", eventData.url);
          checkDeeplink([eventData.url], false);
        }
      })
        .then((handle) => {
          removeCapacitorListener = () => handle.remove();
        })
        .catch((err) => {
          console.warn("[useDeeplinkManager] addListener appUrlOpen error:", err);
        });
    }

    const cleanupListenerNative = Core.platform.onEvent(
      "newInstance",
      (eventData: any) => {
        const args = extractArgs(eventData);
        checkDeeplink(args, false);
      },
    );

    const cleanupListenerCustom = Core.platform.onEvent(
      "deeplinkArgs",
      (eventData: any) => {
        const args = extractArgs(eventData);
        checkDeeplink(args, false);
      },
    );

    return () => {
      cleanupListenerNative();
      cleanupListenerCustom();
      if (removeCapacitorListener) {
        removeCapacitorListener();
      }
    };
  }, [navigate, setActiveModId]);

  useEffect(() => {
    if (!activeModId) return;

    Core.services.gamebanana
      .getModById(activeModId)
      .then((mod) => {
        if (!mod) {
          alert(
            "No se pudo encontrar el mod, o no pertenece a Friday Night Funkin'.",
          );
        } else {
          setActiveModItem({
            id: mod.id,
            name: mod.title,
            description: mod.description,
            htmlBody: mod.htmlBody,
            img: mod.thumbnail || "",
            icon: mod.engineIcon,
            showIcon: !!mod.engineIcon,
            previewMedia: mod.previewMedia,
            files: mod.files,
            author: mod.author,
            authors: mod.authors,
            credits: mod.credits,
            submittedAt: mod.submittedAt,
            updatedAt: mod.updatedAt,
            engineId: mod.engineId,
            version: mod.version,
            updatesCount: mod.updatesCount,
            updates: mod.updates,
            externalLinks: mod.externalLinks,
            studio: mod.studio,
            categoryName: mod.categoryName,
            views: mod.views,
            likes: mod.likes,
            downloads: mod.downloads,
          });
        }
      })
      .catch((err) => {
        if (err.message === "UNSUPPORTED_CATEGORY") {
          alert(
            "Este mod pertenece a una categoría o motor gráfico que Weekbox actualmente no soporta. ¡Intenta con otro mod!",
          );
        } else {
          alert("Ocurrió un error al intentar cargar el mod desde GameBanana.");
        }
      })
      .finally(() => {
        setActiveModId(null);
      });
  }, [activeModId, setActiveModId, setActiveModItem]);
}

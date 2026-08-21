import { useEffect } from "react";
import Core from "@core";
import { useAppStore } from "../../store";

/**
 * Hook lógico invisible que atrapa los enlaces profundos (Deeplinks).
 * Escucha la inicialización de la app y los eventos "newInstance".
 * Si atrapa un mod, lo valida y lo inyecta directamente al Modal de Inicio (`activeModItem`).
 */
export function useDeeplinkManager() {
  const activeModId = useAppStore((state) => state.activeDeepLinkModId);
  const setActiveModId = useAppStore((state) => state.setActiveDeepLinkModId);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);

  useEffect(() => {
    const checkDeeplink = async (args?: string[], isStartup: boolean = false) => {
      const deeplink = args ? Core.os.parseDeeplinkArgs(args) : Core.os.parseStartupDeeplink();
      if (deeplink) {
        setActiveModId(deeplink.id);
      }
      
      if (isStartup) {
        await Core.window.setSize(1280, 720);
        await Core.window.center();
      }
      
      await Core.window.show();
      await Core.window.unmaximize();
      await Core.window.focus();
    };

    const bootSingleInstanceLock = async () => {
      try {
        const isPrimary = await Core.platform.call("deeplink.isPrimary" as any);
        if (isPrimary === false) {
          // Somos la SEGUNDA instancia. Enviamos los datos a la principal.
          await fetch('http://127.0.0.1:45555/deeplink', {
            method: 'POST',
            body: JSON.stringify(window.NL_ARGS || []),
          }).catch(() => {});
          
          // Salimos silenciosamente y matamos el Node.js backend.
          Core.platform.call("system.suicide" as any).catch(() => {});
          window.Neutralino?.app?.exit();
          return;
        }
      } catch (e) {
        // Ignoramos errores. Asumimos que somos la principal si algo falla.
      }

      checkDeeplink(undefined, true);
    };

    bootSingleInstanceLock();

    const cleanupListenerNative = Core.platform.onEvent("newInstance", (eventData: any) => {
      const args = eventData?.detail || [];
      checkDeeplink(args, false);
    });
    
    const cleanupListenerCustom = Core.platform.onEvent("deeplinkArgs", (eventData: any) => {
      const args = eventData?.detail || [];
      checkDeeplink(args, false);
    });

    return () => {
      cleanupListenerNative();
      cleanupListenerCustom();
    };
  }, [setActiveModId]);

  useEffect(() => {
    if (!activeModId) return;

    Core.services.gamebanana.getModById(activeModId)
      .then((mod) => {
        if (!mod) {
          alert("No se pudo encontrar el mod, o no pertenece a Friday Night Funkin'.");
        } else {
          // Mapeamos a la interfaz nativa ModItem del Home
          setActiveModItem({
            name: mod.title,
            description: mod.description,
            htmlBody: mod.htmlBody,
            img: mod.thumbnail || "",
            icon: mod.engineIcon,
            showIcon: !!mod.engineIcon,
          });
        }
      })
      .catch((err) => {
        if (err.message === "UNSUPPORTED_CATEGORY") {
          alert("Este mod pertenece a una categoría o motor gráfico que Weekbox actualmente no soporta. ¡Intenta con otro mod!");
        } else {
          alert("Ocurrió un error al intentar cargar el mod desde GameBanana.");
        }
      })
      .finally(() => {
        setActiveModId(null); // Consumido
      });
  }, [activeModId, setActiveModId, setActiveModItem]);
}

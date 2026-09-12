import { useState, useEffect, useRef, useCallback } from "react";
import Core from "@core";
import { useAppStore } from "../../../store";
import type { ModItem } from "../types";

const modDetailsCache = new Map<number, ModItem>();

/**
 * Safely updates or removes the `?modal=id` URL query parameter
 * using history.replaceState to prevent full route re-renders.
 */
const syncUrlParam = (modalId: number | string | null) => {
  try {
    const url = new URL(window.location.href);
    if (modalId) {
      url.searchParams.set("modal", modalId.toString());
    } else {
      url.searchParams.delete("modal");
    }
    window.history.replaceState(window.history.state, "", url.toString());
  } catch (err) {
    console.warn("Could not update URL query param:", err);
  }
};

const mapGameBananaMod = (mod: any, baseCard?: ModItem | null): ModItem => ({
  id: mod.id,
  name: mod.title || baseCard?.name || "Unknown Mod",
  description: mod.description || baseCard?.description || "",
  htmlBody: mod.htmlBody,
  img: mod.thumbnail || baseCard?.img || "",
  icon: mod.engineIcon || baseCard?.icon,
  previewMedia:
    mod.previewMedia && mod.previewMedia.length > 0
      ? mod.previewMedia
      : baseCard?.previewMedia && baseCard.previewMedia.length > 0
        ? baseCard.previewMedia
        : mod.thumbnail
          ? [mod.thumbnail]
          : baseCard?.img
            ? [baseCard.img]
            : [],
  author: mod.author || baseCard?.author || "Unknown",
  submittedAt: mod.submittedAt || baseCard?.submittedAt,
  updatedAt: mod.updatedAt || baseCard?.updatedAt,
  engineId: mod.engineId || baseCard?.engineId,
  files: mod.files !== undefined ? mod.files : baseCard?.files || [],
});

/**
 * Custom hook to handle deep-linking and state sync for the Mod Details Modal.
 * Syncs the `?modal=` URL query parameter with the `selectedCard` state,
 * and fetches the full mod data if not already present.
 */
export const useModalDeeplink = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);
  const activeModItem = useAppStore((state) => state.activeModItem);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);

  const activeModIdRef = useRef<number | null>(null);

  const fetchModDetails = useCallback(
    async (modId: number, baseCard?: ModItem | null) => {
      try {
        const mod = await Core.services.gamebanana.getModById(modId);

        if (mod) {
          const mappedMod = mapGameBananaMod(mod, baseCard);
          modDetailsCache.set(modId, mappedMod);

          if (activeModIdRef.current === modId) {
            setSelectedCard(mappedMod);
            setActiveModItem(mappedMod);
          }
        } else {
          if (activeModIdRef.current === modId) {
            setSelectedCard((prev) => {
              if (!prev || prev.id !== modId) return prev;
              const fallbackMod: ModItem = {
                ...prev,
                previewMedia:
                  prev.previewMedia && prev.previewMedia.length > 0
                    ? prev.previewMedia
                    : prev.img
                      ? [prev.img]
                      : [],
                files: prev.files !== undefined ? prev.files : [],
              };
              modDetailsCache.set(modId, fallbackMod);
              return fallbackMod;
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to load details for mod ${modId}:`, error);
        if (activeModIdRef.current === modId) {
          setSelectedCard((prev) => {
            if (!prev || prev.id !== modId) return prev;
            return {
              ...prev,
              previewMedia:
                prev.previewMedia && prev.previewMedia.length > 0
                  ? prev.previewMedia
                  : prev.img
                    ? [prev.img]
                    : [],
              files: prev.files !== undefined ? prev.files : [],
            };
          });
        }
      }
    },
    [setActiveModItem],
  );

  const handleCardClick = useCallback(
    (card: ModItem) => {
      activeModIdRef.current = card.id;
      syncUrlParam(card.id);

      const cached = modDetailsCache.get(card.id);
      if (cached && cached.files !== undefined) {
        setSelectedCard(cached);
        return;
      }

      setSelectedCard(card);

      fetchModDetails(card.id, card);
    },
    [fetchModDetails],
  );

  const handleCloseModal = useCallback(() => {
    activeModIdRef.current = null;
    setSelectedCard(null);
    setActiveModItem(null);
    syncUrlParam(null);
  }, [setActiveModItem]);

  useEffect(() => {
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const modalParam = params.get("modal");
      if (modalParam) {
        const modId = Number(modalParam);
        if (!isNaN(modId)) {
          activeModIdRef.current = modId;
          const cached = modDetailsCache.get(modId);
          if (cached) {
            setSelectedCard(cached);
          } else {
            fetchModDetails(modId);
          }
        }
      } else if (activeModIdRef.current !== null) {
        activeModIdRef.current = null;
        setSelectedCard(null);
      }
    };

    checkUrl();
    window.addEventListener("popstate", checkUrl);
    return () => window.removeEventListener("popstate", checkUrl);
  }, [fetchModDetails]);

  useEffect(() => {
    if (activeModItem && activeModItem.id) {
      activeModIdRef.current = activeModItem.id;
      modDetailsCache.set(activeModItem.id, activeModItem);
      setSelectedCard(activeModItem);
      syncUrlParam(activeModItem.id);
    }
  }, [activeModItem]);

  return {
    selectedCard,
    handleCardClick,
    handleCloseModal,
  };
};

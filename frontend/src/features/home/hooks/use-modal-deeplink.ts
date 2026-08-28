import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "../../../store";
import type { ModItem } from "../types";

/**
 * Custom hook to handle deep-linking and state sync for the Mod Details Modal.
 * Syncs the `?modal=` URL query parameter with the `selectedCard` state,
 * and fetches the full mod data if not already present.
 */
export const useModalDeeplink = () => {
  const [selectedCard, setSelectedCard] = useState<ModItem | null>(null);
  const activeModItem = useAppStore((state) => state.activeModItem);
  const setActiveModItem = useAppStore((state) => state.setActiveModItem);
  
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (activeModItem) {
      setSelectedCard(activeModItem);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("modal", activeModItem.id.toString());
      setSearchParams(newParams, { replace: true });
    }
  }, [activeModItem]);

  useEffect(() => {
    const modalId = searchParams.get("modal");
    if (!modalId) {
      if (selectedCard) {
        setSelectedCard(null);
        setActiveModItem(null);
      }
    } else if (modalId) {
      const needsFetch =
        !selectedCard ||
        selectedCard.id.toString() !== modalId ||
        !selectedCard.previewMedia;

      if (!needsFetch) {
        return;
      }

      if (
        activeModItem &&
        activeModItem.id.toString() === modalId &&
        activeModItem.previewMedia
      ) {
        if (!selectedCard || selectedCard.id !== activeModItem.id) {
          setSelectedCard(activeModItem);
        }
      } else {
        import("@core").then(({ default: Core }) => {
          Core.services.gamebanana.getModById(Number(modalId)).then((mod) => {
            const currentModalId = searchParams.get("modal");
            if (mod && currentModalId === modalId) {
              const mappedMod: ModItem = {
                id: mod.id,
                name: mod.title,
                description: mod.description,
                htmlBody: mod.htmlBody,
                img: mod.thumbnail,
                icon: mod.engineIcon,
                previewMedia: mod.previewMedia || [],
                author: mod.author,
                submittedAt: mod.submittedAt,
                updatedAt: mod.updatedAt,
                engineId: mod.engineId,
              };
              setSelectedCard(mappedMod);
              setActiveModItem(mappedMod);
            }
          });
        });
      }
    }
  }, [searchParams, activeModItem, selectedCard]);

  const handleCardClick = (card: ModItem) => {
    setSelectedCard(card);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("modal", card.id.toString());
    setSearchParams(newParams);
  };

  const handleCloseModal = () => {
    if (searchParams.has("modal")) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("modal");
        return next;
      });
    } else {
      setSelectedCard(null);
      setActiveModItem(null);
    }
  };

  return {
    selectedCard,
    handleCardClick,
    handleCloseModal,
  };
};

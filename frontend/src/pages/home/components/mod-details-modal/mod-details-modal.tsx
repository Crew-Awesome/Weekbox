import React, { useRef, useState, useEffect, useCallback } from "react";
import Components from "@components";
const Shared = Components;
import Utils from "@utils";
import Core from "@core";
import type { ModItem } from "../../types";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";
import { MobileView } from "./mobile-view";
import { DesktopView } from "./desktop-view";
import { useDownloadStore, useEngineDownloadStore } from "../../../../store";

interface ModDetailsModalProps {
  selectedCard: ModItem | null;
  onClose: () => void;
}

/**
 * Main wrapper for the Mod Details Modal.
 * Manages state and refs, and delegates rendering to Desktop or Mobile views.
 */
export const ModDetailsModal: React.FC<ModDetailsModalProps> = ({
  selectedCard,
  onClose,
}) => {
  const { isCirclePatternActive } = Utils.hooks.useModalPattern();
  const { isModalBackdropActive } = Utils.hooks.useModalBackdrop();
  const setModalOpen = useDownloadStore((s) => s.setModalOpen);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const desktopCarouselRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  const { autoTranslate, targetLanguage } = Utils.hooks.useTranslationSettings();
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showTranslated, setShowTranslated] = useState<boolean>(true);

  React.useEffect(() => {
    const modId = selectedCard && selectedCard.id ? selectedCard.id.toString() : null;
    setModalOpen(modId);
    useEngineDownloadStore.getState().setCurrentView({
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      activeModalModId: modId,
    });
  }, [selectedCard, setModalOpen]);

  const lastNonNullCardRef = useRef<ModItem | null>(selectedCard);
  if (selectedCard) {
    lastNonNullCardRef.current = selectedCard;
  }
  const baseCard = selectedCard || lastNonNullCardRef.current;
  const [customCardData, setCustomCardData] = useState<Partial<ModItem>>({});
  const displayCard = baseCard
    ? {
        ...baseCard,
        defaultEngineId:
          baseCard.defaultEngineId || (baseCard as any).originalEngineId || baseCard.engineId,
        ...customCardData,
      }
    : null;

  const [isInstalled, setIsInstalled] = useState<boolean>(Boolean(selectedCard?.isInstalled));

  useEffect(() => {
    if (!displayCard?.id) return;
    let isMounted = true;
    Core.platform.getInstalledMod(displayCard.id.toString()).then((mod: any) => {
      if (isMounted) {
        setIsInstalled(Boolean(mod));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [displayCard?.id]);

  const handleUpdateMod = useCallback(
    async (updates: Record<string, any>) => {
      if (!displayCard?.id) return;
      setCustomCardData((prev) => ({ ...prev, ...updates }));
      if (Core.platform.updateInstalledMod) {
        await Core.platform.updateInstalledMod(displayCard.id.toString(), updates);
      }
    },
    [displayCard?.id]
  );

  const performTranslation = useCallback(
    async (textToTranslate: string) => {
      if (!textToTranslate || !textToTranslate.trim()) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      setIsTranslating(true);
      try {
        const res = await Core.services.translation.translateModText({
          text: textToTranslate,
          targetLang: targetLanguage,
        });
        if (res && res.translated) {
          setTranslatedHtml(res.translated);
          setShowTranslated(true);
        }
      } catch {
        setTranslatedHtml(null);
      } finally {
        setIsTranslating(false);
      }
    },
    [targetLanguage]
  );

  useEffect(() => {
    setTranslatedHtml(null);
    setShowTranslated(true);

    const sourceContent = displayCard?.htmlBody || displayCard?.description || "";
    if (autoTranslate && sourceContent && selectedCard) {
      performTranslation(sourceContent);
    }
  }, [
    displayCard?.id,
    displayCard?.htmlBody,
    displayCard?.description,
    selectedCard,
    autoTranslate,
    targetLanguage,
    performTranslation,
  ]);

  const handleManualTranslate = useCallback(() => {
    const sourceContent = displayCard?.htmlBody || displayCard?.description || "";
    performTranslation(sourceContent);
  }, [displayCard?.htmlBody, displayCard?.description, performTranslation]);

  const prevModIdRef = useRef<number | null>(null);
  React.useEffect(() => {
    if (selectedCard && selectedCard.id !== prevModIdRef.current) {
      prevModIdRef.current = selectedCard.id;
      setActiveIndex(0);
      setCustomCardData({});
    }
  }, [selectedCard]);

  React.useEffect(() => {
    if (thumbnailsRef.current && displayCard?.previewMedia) {
      const container = thumbnailsRef.current;
      const activeButton = container.children[activeIndex] as HTMLElement;
      if (activeButton) {
        const scrollLeft = activeButton.offsetLeft - container.clientWidth / 2 + activeButton.clientWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [activeIndex, displayCard]);

  React.useEffect(() => {
    if (!selectedCard || isCarouselHovered) return;
    const media = displayCard?.previewMedia;
    if (!media || media.length <= 1) return;
    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % media.length);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [displayCard, selectedCard, isCarouselHovered]);

  if (!displayCard) {
    return null;
  }

  const engineInfo = Object.values(ENGINE_CATEGORIES).find(
    (c) =>
      c.id.toLowerCase() === String(displayCard.engineId || "").toLowerCase() ||
      c.name.toLowerCase() === String(displayCard.engineName || "").toLowerCase() ||
      c.name.toLowerCase() === String(displayCard.categoryName || "").toLowerCase()
  );
  const engineName =
    (displayCard.engineName && displayCard.engineName !== "Unknown Engine"
      ? displayCard.engineName
      : null) ||
    engineInfo?.name ||
    (displayCard.categoryName && !displayCard.categoryName.toLowerCase().includes("mod")
      ? displayCard.categoryName
      : "Base Game");

  const normalizeTimestamp = (timestamp?: number) => {
    if (!timestamp) return null;
    const num = Number(timestamp);
    if (isNaN(num) || num <= 0) return null;
    return num < 10000000000 ? num * 1000 : num;
  };

  const formatDate = (timestamp?: number) => {
    const ms = normalizeTimestamp(timestamp);
    if (!ms) return "Unknown";
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFullDate = (timestamp?: number) => {
    const ms = normalizeTimestamp(timestamp);
    if (!ms) return "Unknown";
    return new Date(ms).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const scrollToIndex = (index: number) => {
    setActiveIndex(index);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const media = displayCard?.previewMedia;
    if (!media || media.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % media.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const media = displayCard?.previewMedia;
    if (!media || media.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleMouseEnterCarousel = () => setIsCarouselHovered(true);
  const handleMouseLeaveCarousel = () => setIsCarouselHovered(false);

  return (
    <Shared.atoms.Modal
      isOpen={!!selectedCard}
      onClose={onClose}
      hideDefaultBackground={true}
      showCirclePattern={isCirclePatternActive}
      backdropImage={
        isModalBackdropActive
          ? displayCard?.img || (displayCard?.previewMedia && displayCard.previewMedia[0])
          : undefined
      }
      contentClassName="flex flex-col flex-1 overflow-y-auto md:overflow-hidden p-0"
      hideCloseButtonMobile={true}
      edgeSpacing={{
        isStaticSize: true,
        mobile: ["95vw", "auto"],
        desktop: ["min(1200px, 90vw, calc(90vh * 16 / 9))", "auto"],
      }}
      modalClassName="flex flex-col md:aspect-[16/9] max-h-[90vh] md:max-h-full rounded-2xl md:rounded-3xl overflow-hidden border border-[var(--wb-outline-variant)]/30 bg-[var(--wb-surface-container)] md:bg-transparent shadow-2xl"
    >
      <MobileView
        onClose={onClose}
        displayCard={displayCard}
        engineName={engineName}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        activeIndex={activeIndex}
        scrollToIndex={scrollToIndex}
        prevImage={prevImage}
        nextImage={nextImage}
        onMouseEnterCarousel={handleMouseEnterCarousel}
        onMouseLeaveCarousel={handleMouseLeaveCarousel}
        carouselRef={mobileCarouselRef}
        translatedHtml={translatedHtml}
        isTranslating={isTranslating}
        showTranslated={showTranslated}
        setShowTranslated={setShowTranslated}
        onManualTranslate={handleManualTranslate}
        targetLanguage={targetLanguage}
        isInstalled={isInstalled}
        onUpdateMod={handleUpdateMod}
      />
      
      <DesktopView
        displayCard={displayCard}
        engineName={engineName}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        activeIndex={activeIndex}
        scrollToIndex={scrollToIndex}
        prevImage={prevImage}
        nextImage={nextImage}
        onMouseEnterCarousel={handleMouseEnterCarousel}
        onMouseLeaveCarousel={handleMouseLeaveCarousel}
        carouselRef={desktopCarouselRef}
        thumbnailsRef={thumbnailsRef}
        translatedHtml={translatedHtml}
        isTranslating={isTranslating}
        showTranslated={showTranslated}
        setShowTranslated={setShowTranslated}
        onManualTranslate={handleManualTranslate}
        targetLanguage={targetLanguage}
        isInstalled={isInstalled}
        onUpdateMod={handleUpdateMod}
      />
    </Shared.atoms.Modal>
  );
};

export default ModDetailsModal;

import React, { useRef, useState } from "react";
import Shared from "@shared";
import type { ModItem } from "../../types";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";
import { MobileView } from "./mobile-view";
import { DesktopView } from "./desktop-view";

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
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const desktopCarouselRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayCard, setDisplayCard] = useState<ModItem | null>(selectedCard);

  React.useEffect(() => {
    if (selectedCard) {
      setDisplayCard(selectedCard);
      setActiveIndex(0);
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

  // Auto-scroll functionality
  React.useEffect(() => {
    const media = displayCard?.previewMedia;
    if (!media || media.length <= 1) return;
    const intervalId = setInterval(() => {
      const nextIndex = (activeIndex + 1) % media.length;
      scrollToIndex(nextIndex);
    }, 3500); // 3.5 seconds auto-scroll

    return () => clearInterval(intervalId);
  }, [activeIndex, displayCard]);

  if (!displayCard) {
    return null;
  }

  const engineInfo = Object.values(ENGINE_CATEGORIES).find(
    (c) => c.id === displayCard.engineId
  );
  const engineName = engineInfo?.name || "Unknown Engine";

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatFullDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    if (width === 0) return;
    const index = Math.round(scrollLeft / width);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    setActiveIndex(index);
    if (mobileCarouselRef.current) {
      const container = mobileCarouselRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        const scrollLeft = child.offsetLeft - container.clientWidth / 2 + child.clientWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
    if (desktopCarouselRef.current) {
      const container = desktopCarouselRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        const scrollLeft = child.offsetLeft - container.clientWidth / 2 + child.clientWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const media = displayCard?.previewMedia;
    if (!media) return;
    const next = (activeIndex + 1) % media.length;
    scrollToIndex(next);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const media = displayCard?.previewMedia;
    if (!media) return;
    const prev = (activeIndex - 1 + media.length) % media.length;
    scrollToIndex(prev);
  };

  return (
    <Shared.atoms.Modal
      isOpen={!!selectedCard}
      onClose={onClose}
      hideDefaultBackground={true}
      contentClassName="flex flex-col flex-1 overflow-y-auto md:overflow-hidden p-0"
      edgeSpacing={{
        isStaticSize: true,
        mobile: ["95vw", "auto"],
        desktop: ["min(1200px, 90vw, calc(90vh * 16 / 9))", "auto"],
      }}
      modalClassName="flex flex-col md:aspect-[16/9] max-h-[90vh] md:max-h-full rounded-2xl md:rounded-none bg-[var(--wb-surface-container)] md:bg-transparent"
    >
      <MobileView
        displayCard={displayCard}
        engineName={engineName}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        activeIndex={activeIndex}
        handleScroll={handleScroll}
        scrollToIndex={scrollToIndex}
        prevImage={prevImage}
        nextImage={nextImage}
        carouselRef={mobileCarouselRef}
      />
      
      <DesktopView
        displayCard={displayCard}
        engineName={engineName}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        activeIndex={activeIndex}
        handleScroll={handleScroll}
        scrollToIndex={scrollToIndex}
        prevImage={prevImage}
        nextImage={nextImage}
        carouselRef={desktopCarouselRef}
        thumbnailsRef={thumbnailsRef}
      />
    </Shared.atoms.Modal>
  );
};

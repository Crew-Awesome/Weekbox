import React from "react";
import type { ModItem } from "../../types";

export interface ModalViewProps {
  displayCard: ModItem;
  engineName: string;
  formatDate: (timestamp?: number) => string;
  formatFullDate: (timestamp?: number) => string;
  activeIndex: number;
  handleScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex: (index: number) => void;
  prevImage: (e?: React.MouseEvent) => void;
  nextImage: (e?: React.MouseEvent) => void;
  onMouseEnterCarousel?: () => void;
  onMouseLeaveCarousel?: () => void;
  translatedHtml?: string | null;
  isTranslating?: boolean;
  showTranslated?: boolean;
  setShowTranslated?: React.Dispatch<React.SetStateAction<boolean>>;
  onManualTranslate?: () => void;
  targetLanguage?: "es" | "en";
  isInstalled?: boolean;
  onUpdateMod?: (updates: Record<string, any>) => Promise<void>;
}

export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return "";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) {
    return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};


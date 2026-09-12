import React from "react";
import type { ModItem } from "../../types";

export interface ModalViewProps {
  displayCard: ModItem;
  engineName: string;
  formatDate: (timestamp?: number) => string;
  formatFullDate: (timestamp?: number) => string;
  activeIndex: number;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex: (index: number) => void;
  prevImage: (e: React.MouseEvent) => void;
  nextImage: (e: React.MouseEvent) => void;
}

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
};


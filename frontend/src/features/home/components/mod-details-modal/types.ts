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

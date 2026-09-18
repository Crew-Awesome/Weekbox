import React from "react";

export type SpacingValue = string | [string, string];

export interface EdgeSpacingConfig {
  isStaticSize?: boolean;
  mobile?: SpacingValue;
  desktop?: SpacingValue;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  overlayClassName?: string;
  modalClassName?: string;
  widthClass?: string;
  heightClass?: string;
  svgBackgrounds?: React.ReactNode;
  hideDefaultBackground?: boolean;
  contentClassName?: string;
  edgeSpacing?: EdgeSpacingConfig;
  showCirclePattern?: boolean;
  backdropImage?: string;
  zIndex?: number;
  hideCloseButton?: boolean;
  hideCloseButtonMobile?: boolean;
  onBack?: () => boolean | void;
}

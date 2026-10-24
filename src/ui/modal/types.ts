import React from 'react'

export type SpacingValue = string | [string, string]

export interface EdgeSpacingConfig {
  isStaticSize?: boolean
  mobile?: SpacingValue
  desktop?: SpacingValue
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  overlayClassName?: string
  modalClassName?: string
  widthClass?: string
  heightClass?: string
  svgBackgrounds?: React.ReactNode
  hideDefaultBackground?: boolean
  contentClassName?: string
  edgeSpacing?: EdgeSpacingConfig
  showCirclePattern?: boolean
  backdropImage?: string
  zIndex?: number
  hideCloseButton?: boolean
  hideCloseButtonMobile?: boolean
  closeButtonClassName?: string
  onBack?: () => boolean | void
}

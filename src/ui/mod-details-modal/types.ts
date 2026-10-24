import React from 'react'
import type { ModCreditAuthor, ModCreditGroup, GameBananaFile } from '@/services/gamebanana'

export type { ModCreditAuthor, ModCreditGroup, GameBananaFile }

export interface ModItem {
  id: string | number
  title?: string
  name?: string
  description?: string
  htmlBody?: string
  author?: string
  authors?: ModCreditAuthor[]
  credits?: ModCreditGroup[]
  badge?: string
  image?: string
  img?: string
  thumbnail?: string
  icon?: string
  userPfp?: string
  engineIcon?: string
  engineName?: string
  engineId?: string
  categoryName?: string
  previewMedia?: string[]
  submittedAt?: number | string
  updatedAt?: number | string
  installedAt?: number | string
  updatesCount?: number
  updates?: unknown[]
  views?: number
  likes?: number
  downloads?: number
  isNsfw?: boolean
  isInstalled?: boolean
  defaultEngineId?: string
  originalEngineId?: string
  downloadedFileId?: string | number
  installedFileId?: string | number
  files?: GameBananaFile[] | Record<string, GameBananaFile>
  downloadUrl?: string
}

export interface ModalViewProps {
  displayCard: ModItem
  engineName: string
  formatDate: (timestamp?: number | string) => string
  formatFullDate: (timestamp?: number | string) => string
  activeIndex: number
  handleScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  scrollToIndex: (index: number) => void
  prevImage: (e?: React.MouseEvent) => void
  nextImage: (e?: React.MouseEvent) => void
  onMouseEnterCarousel?: () => void
  onMouseLeaveCarousel?: () => void
  translatedHtml?: string | null
  isTranslating?: boolean
  showTranslated?: boolean
  setShowTranslated?: React.Dispatch<React.SetStateAction<boolean>>
  onManualTranslate?: () => void
  targetLanguage?: 'es' | 'en'
  isInstalled?: boolean
  onUpdateMod?: (updates: Partial<ModItem>) => Promise<void>
  onClose?: () => void
}

export interface ModDetailsModalProps {
  selectedCard: ModItem | null
  isOpen?: boolean
  onClose: () => void
  onAction?: (action: 'play' | 'install' | 'manage', mod: ModItem) => void
}

export { formatFileSize } from '@/utils/formatters'

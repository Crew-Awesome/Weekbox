import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from '@/ui/modal'
import { formatDate, formatFullDate } from '@/utils/formatters'
import { useViewport } from '@/utils/hooks/use-viewport'
import { setActiveModalModId } from '@/core/mods'
import { ENGINE_CATEGORIES } from './constants'
import { ModDetailsView } from './mod-details-view'
import type { ModItem, ModDetailsModalProps } from './types'

export const ModDetailsModal: React.FC<ModDetailsModalProps> = ({
  selectedCard,
  isOpen = Boolean(selectedCard),
  onClose,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null)
  const thumbnailsRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isCarouselHovered, setIsCarouselHovered] = useState(false)

  const [translatedHtml] = useState<string | null>(null)
  const [isTranslating] = useState<boolean>(false)
  const [showTranslated, setShowTranslated] = useState<boolean>(true)

  const [cachedCard, setCachedCard] = useState<ModItem | null>(selectedCard)
  const [prevSelectedCard, setPrevSelectedCard] = useState(selectedCard)
  const [isInstalled, setIsInstalled] = useState<boolean>(Boolean(selectedCard?.isInstalled))
  const [customCardData, setCustomCardData] = useState<Partial<ModItem>>({})

  if (selectedCard !== prevSelectedCard) {
    setPrevSelectedCard(selectedCard)
    if (selectedCard) {
      setCachedCard(selectedCard)
      setIsInstalled(Boolean(selectedCard.isInstalled))
    }
    if (selectedCard && selectedCard.id !== prevSelectedCard?.id) {
      setActiveIndex(0)
      setCustomCardData({})
    }
  }

  const baseCard = selectedCard || cachedCard

  useEffect(() => {
    if (isOpen && baseCard?.id) {
      setActiveModalModId(baseCard.id)
    } else {
      setActiveModalModId(null)
    }
    return () => {
      setActiveModalModId(null)
    }
  }, [isOpen, baseCard?.id])

  const displayCard = useMemo<ModItem | null>(() => {
    if (!baseCard) return null
    return {
      ...baseCard,
      name: baseCard.name || baseCard.title || 'Unknown Mod',
      img:
        baseCard.img ||
        baseCard.image ||
        baseCard.thumbnail ||
        (baseCard.coverPath
          ? baseCard.coverPath.startsWith('mod-covers/')
            ? `/${baseCard.coverPath}`
            : baseCard.coverPath
          : ''),
      previewMedia:
        baseCard.previewMedia && baseCard.previewMedia.length > 0
          ? baseCard.previewMedia
          : baseCard.img
            ? [baseCard.img]
            : baseCard.image
              ? [baseCard.image]
              : baseCard.coverPath
                ? [
                    baseCard.coverPath.startsWith('mod-covers/')
                      ? `/${baseCard.coverPath}`
                      : baseCard.coverPath,
                  ]
                : [],
      defaultEngineId:
        baseCard.defaultEngineId || baseCard.originalEngineId || baseCard.engineId,
      ...customCardData,
    }
  }, [baseCard, customCardData])

  const handleUpdateMod = useCallback(
    async (updates: Partial<ModItem>) => {
      if (!displayCard?.id) return
      setCustomCardData((prev) => ({ ...prev, ...updates }))
    },
    [displayCard?.id],
  )

  const handleManualTranslate = useCallback(() => {}, [])

  const previewMedia = displayCard?.previewMedia
  const mediaCount = previewMedia?.length || 0

  useEffect(() => {
    if (thumbnailsRef.current && previewMedia) {
      const container = thumbnailsRef.current
      const activeButton = container.children[activeIndex] as HTMLElement | undefined
      if (activeButton) {
        const scrollLeft =
          activeButton.offsetLeft -
          container.clientWidth / 2 +
          activeButton.clientWidth / 2
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
      }
    }
  }, [activeIndex, previewMedia])

  useEffect(() => {
    if (!selectedCard || isCarouselHovered || mediaCount <= 1) return
    const intervalId = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % mediaCount)
    }, 3500)

    return () => clearInterval(intervalId)
  }, [selectedCard, isCarouselHovered, mediaCount])

  const { width: viewportW, height: viewportH, isDesktop } = useViewport()

  const { desktopWidth, desktopHeight } = useMemo(() => {
    if (!isDesktop) {
      return { desktopWidth: 'min(95vw, 100vw)', desktopHeight: 'auto' }
    }
    const maxAllowedWidth = Math.min(1240, viewportW * 0.92)
    const maxAllowedHeight = viewportH * 0.88
    const widthConstrainedByHeight = maxAllowedHeight * (16 / 9)
    const finalW = Math.min(maxAllowedWidth, widthConstrainedByHeight)
    const finalH = finalW * (9 / 16)

    return {
      desktopWidth: `${Math.round(finalW)}px`,
      desktopHeight: `${Math.round(finalH)}px`,
    }
  }, [isDesktop, viewportW, viewportH])

  if (!displayCard) {
    return null
  }

  const engineInfo = Object.values(ENGINE_CATEGORIES).find(
    (c) =>
      c.id.toLowerCase() === String(displayCard.engineId || '').toLowerCase() ||
      c.name.toLowerCase() === String(displayCard.engineName || '').toLowerCase() ||
      c.name.toLowerCase() === String(displayCard.categoryName || '').toLowerCase(),
  )
  const engineName =
    (displayCard.engineName && displayCard.engineName !== 'Unknown Engine'
      ? displayCard.engineName
      : null) ||
    engineInfo?.name ||
    (displayCard.categoryName && !displayCard.categoryName.toLowerCase().includes('mod')
      ? displayCard.categoryName
      : 'Base Game')

  const scrollToIndex = (index: number) => {
    setActiveIndex(index)
  }

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const media = displayCard.previewMedia
    if (!media || media.length === 0) return
    setActiveIndex((prev) => (prev + 1) % media.length)
  }

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const media = displayCard.previewMedia
    if (!media || media.length === 0) return
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideDefaultBackground={true}
      showCirclePattern={true}
      backdropImage={
        displayCard.img ||
        displayCard.image ||
        (displayCard.previewMedia && displayCard.previewMedia[0])
      }
      contentClassName="flex flex-col flex-1 overflow-y-auto md:overflow-hidden p-0"
      hideCloseButtonMobile={true}
      edgeSpacing={{
        isStaticSize: true,
        mobile: ['min(95vw, 100vw)', '92dvh'],
        desktop: [desktopWidth, desktopHeight],
      }}
      modalClassName="flex flex-col md:aspect-[16/9] max-h-[92dvh] md:max-h-full h-[92dvh] md:h-full rounded-2xl md:rounded-3xl overflow-hidden bg-[var(--wb-surface-container)] md:bg-transparent shadow-none"
    >
      <ModDetailsView
        onClose={onClose}
        displayCard={displayCard}
        engineName={engineName}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        activeIndex={activeIndex}
        scrollToIndex={scrollToIndex}
        prevImage={prevImage}
        nextImage={nextImage}
        onMouseEnterCarousel={() => setIsCarouselHovered(true)}
        onMouseLeaveCarousel={() => setIsCarouselHovered(false)}
        carouselRef={carouselRef}
        thumbnailsRef={thumbnailsRef}
        translatedHtml={translatedHtml}
        isTranslating={isTranslating}
        showTranslated={showTranslated}
        setShowTranslated={setShowTranslated}
        onManualTranslate={handleManualTranslate}
        targetLanguage="en"
        isInstalled={isInstalled}
        onUpdateMod={handleUpdateMod}
      />
    </Modal>
  )
}

export default ModDetailsModal

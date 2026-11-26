import React, { useState } from 'react'
import {
  resolvePreferredAvatarUrl,
  resolveAvatarErrorFallback,
} from '@/utils/local-media'

export interface ModAvatarProps {
  remoteUrl?: string
  localRelPath?: string
  localFullPath?: string
  alt?: string
  className?: string
  fallbackClassName?: string
  iconClassName?: string
}

/**
 * Renders a mod submitter or contributor avatar preferring cached local storage
 * (`mod-avatars/...`), with automatic fallback to desktop file reading,
 * remote URL, and finally a clean placeholder icon.
 */
export const ModAvatar: React.FC<ModAvatarProps> = ({
  remoteUrl,
  localRelPath,
  localFullPath,
  alt = 'Avatar',
  className = 'w-5 h-5 rounded-full object-cover shrink-0 border border-[var(--md-sys-color-outline-variant)]/30 shadow-sm',
  fallbackClassName = 'w-5 h-5 rounded-full bg-[var(--md-sys-color-surface-container-highest)] flex items-center justify-center shrink-0 border border-[var(--md-sys-color-outline-variant)]/20',
  iconClassName = 'material-symbols-rounded text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-80',
}) => {
  const primarySrc = resolvePreferredAvatarUrl(
    remoteUrl,
    localRelPath,
    localFullPath,
  )
  const [fallbackState, setFallbackState] = useState<{
    sourceKey: string
    src: string | null
    failed: boolean
  } | null>(null)

  const sourceKey = `${primarySrc || ''}|${localFullPath || ''}|${remoteUrl || ''}`
  const isCurrent = fallbackState?.sourceKey === sourceKey
  const activeSrc = isCurrent ? fallbackState.src : primarySrc
  const isFailed = Boolean(isCurrent && fallbackState.failed) || !activeSrc

  if (isFailed || !activeSrc) {
    return (
      <div className={fallbackClassName}>
        <span className={iconClassName}>person</span>
      </div>
    )
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        void resolveAvatarErrorFallback(
          activeSrc,
          localFullPath,
          remoteUrl,
        ).then((nextSrc) => {
          setFallbackState({
            sourceKey,
            src: nextSrc,
            failed: !nextSrc,
          })
        })
      }}
    />
  )
}

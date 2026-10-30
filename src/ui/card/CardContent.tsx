import React from 'react'

export interface CardContentProps {
  title: string
  description?: string
  isLoading?: boolean
  isNsfw?: boolean
  author?: string
  authorAvatar?: string
  children?: React.ReactNode
}

export const CardContent: React.FC<CardContentProps> = ({
  title,
  description,
  isLoading,
  isNsfw,
  author,
  authorAvatar,
  children,
}) => {
  return (
    <div className="p-4 pb-3 flex flex-col gap-1.5">
      {isLoading ? (
        <>
          <div className="h-5 w-3/4 rounded-md bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
          {description !== undefined && (
            <div className="h-3.5 w-1/2 rounded-md bg-[var(--md-sys-color-surface-container-highest)] animate-pulse mt-0.5" />
          )}
          <div className="h-4 w-1/3 rounded-full bg-[var(--md-sys-color-surface-container-highest)] animate-pulse pt-0.5" />
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-1.5">
            <strong
              className="font-bold leading-snug line-clamp-2 select-text text-[var(--md-sys-color-on-surface)] text-sm sm:text-base"
              title={title}
            >
              <span>{title}</span>
            </strong>
            {isNsfw && (
              <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30">
                NSFW
              </span>
            )}
          </div>
          {description && (
            <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs line-clamp-2 leading-snug opacity-90">
              {description}
            </p>
          )}

          {(author || authorAvatar) && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={author || 'Creator'}
                  className="w-5 h-5 rounded-full object-cover border border-[var(--md-sys-color-outline-variant)]/30 shrink-0 shadow-sm"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--md-sys-color-surface-container-highest)] flex items-center justify-center shrink-0 border border-[var(--md-sys-color-outline-variant)]/20">
                  <span className="material-symbols-rounded text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-90">
                    person
                  </span>
                </div>
              )}
              <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                {author || 'Unknown Creator'}
              </span>
            </div>
          )}

          {children && <div className="pt-0.5">{children}</div>}
        </>
      )}
    </div>
  )
}


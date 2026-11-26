import React from 'react'
import '../instances.css'
import type { GitHubRelease } from '@/core/engines'
import type { InstanceDisplayDefinition } from '../hooks/use-executable-instances'
import {
  DESCRIPTION_GROUP_STYLE,
  DESCRIPTION_BUTTON_STYLE,
  TRANSLATE_BUTTON_STYLE,
} from '../constants'

export interface InstancesDocumentationProps {
  engine: InstanceDisplayDefinition
  selectedVersion: string | null
  selectedRelease?: GitHubRelease
  descriptionTab: 'general' | 'version'
  onTabChange: (tab: 'general' | 'version') => void
  isTranslationActive: boolean
  onToggleTranslation: () => void
  descriptionTitle: string
  descriptionHtml: string
  onMarkdownClick: (event: React.MouseEvent<HTMLDivElement>) => void
  onlyGeneralDescription?: boolean
}

export const InstancesDocumentation: React.FC<InstancesDocumentationProps> = ({
  selectedVersion,
  descriptionTab,
  onTabChange,
  isTranslationActive,
  onToggleTranslation,
  descriptionTitle,
  descriptionHtml,
  onMarkdownClick,
  onlyGeneralDescription = false,
}) => {
  const effectiveTab = onlyGeneralDescription ? 'general' : descriptionTab
  return (
    <article
      className="rounded-2xl sm:rounded-3xl border p-4 sm:p-7 min-w-0"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
        <header className="flex items-center gap-2.5 min-w-0">
          <span
            className="material-symbols-rounded text-[20px] shrink-0"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            {effectiveTab === 'general' ? 'menu_book' : 'notes'}
          </span>
          <h2
            className="text-base sm:text-lg font-bold truncate"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {descriptionTitle}
          </h2>
        </header>

        <div
          className={`flex items-center gap-2 ${
            onlyGeneralDescription ? 'w-auto shrink-0' : 'w-full sm:w-auto'
          }`}
        >
          <m3e-icon-button
            variant="filled"
            size="small"
            toggle
            selected={isTranslationActive ? true : undefined}
            onClick={onToggleTranslation}
            aria-label="Toggle description translation"
            title="Toggle description translation"
            style={TRANSLATE_BUTTON_STYLE}
            className="shrink-0"
          >
            <span className="material-symbols-rounded text-[18px] leading-none">
              translate
            </span>
          </m3e-icon-button>

          {!onlyGeneralDescription && (
            <m3e-button-group
              variant="connected"
              className="flex-1 min-w-0"
              style={DESCRIPTION_GROUP_STYLE}
            >
              <m3e-button
                variant="tonal"
                shape="square"
                toggle
                selected={effectiveTab === 'general' ? true : undefined}
                onClick={() => onTabChange('general')}
                style={DESCRIPTION_BUTTON_STYLE}
              >
                <span
                  slot="icon"
                  className="material-symbols-rounded text-[16px] leading-none"
                >
                  menu_book
                </span>
                <span className="truncate sm:hidden">General</span>
                <span className="truncate hidden sm:inline">General description</span>
              </m3e-button>
              <m3e-button
                variant="tonal"
                shape="square"
                toggle
                selected={effectiveTab === 'version' ? true : undefined}
                onClick={() => onTabChange('version')}
                style={DESCRIPTION_BUTTON_STYLE}
              >
                <span
                  slot="icon"
                  className="material-symbols-rounded text-[16px] leading-none"
                >
                  notes
                </span>
                <span className="truncate sm:hidden">Version</span>
                <span className="truncate hidden sm:inline">Version description</span>
              </m3e-button>
            </m3e-button-group>
          )}
        </div>
      </div>

      {descriptionHtml ? (
        <div
          className="engine-markdown"
          onClick={onMarkdownClick}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : (
        <div
          className="rounded-2xl border border-dashed p-6 text-center"
          style={{
            borderColor:
              'color-mix(in srgb, var(--md-sys-color-outline-variant) 80%, transparent)',
            color: 'var(--md-sys-color-on-surface-variant)',
          }}
        >
          <span className="material-symbols-rounded text-[28px] opacity-60">
            notes
          </span>
          <p
            className="text-sm font-semibold mt-1"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {onlyGeneralDescription
              ? 'No description available'
              : 'No release notes available'}
          </p>
          <p className="text-xs mt-1">
            {onlyGeneralDescription
              ? 'No description is available for this executable mod.'
              : effectiveTab === 'version'
                ? `The selected release (${selectedVersion ?? 'unknown'}) does not include a description.`
                : 'No description is available for this engine.'}
          </p>
        </div>
      )}
    </article>
  )
}

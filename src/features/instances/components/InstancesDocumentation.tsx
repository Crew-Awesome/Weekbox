import React from 'react'
import '../instances.css'
import type { EngineDefinition, GitHubRelease } from '@/core/engines'
import {
  DESCRIPTION_GROUP_STYLE,
  DESCRIPTION_BUTTON_STYLE,
  TRANSLATE_BUTTON_STYLE,
} from '../constants'

export interface InstancesDocumentationProps {
  engine: EngineDefinition
  selectedVersion: string | null
  selectedRelease?: GitHubRelease
  descriptionTab: 'general' | 'version'
  onTabChange: (tab: 'general' | 'version') => void
  isTranslationActive: boolean
  onToggleTranslation: () => void
  descriptionTitle: string
  descriptionHtml: string
  onMarkdownClick: (event: React.MouseEvent<HTMLDivElement>) => void
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
}) => {
  return (
    <article
      className="rounded-3xl border p-5 sm:p-7"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <header className="flex items-center gap-2.5 min-w-0">
          <span
            className="material-symbols-rounded text-[20px] shrink-0"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            {descriptionTab === 'general' ? 'menu_book' : 'notes'}
          </span>
          <h2
            className="text-base sm:text-lg font-bold truncate"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {descriptionTitle}
          </h2>
        </header>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[340px]">
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

          <m3e-button-group
            variant="connected"
            className="flex-1 min-w-0"
            style={DESCRIPTION_GROUP_STYLE}
          >
            <m3e-button
              variant="tonal"
              shape="square"
              toggle
              selected={descriptionTab === 'general' ? true : undefined}
              onClick={() => onTabChange('general')}
              style={DESCRIPTION_BUTTON_STYLE}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-[16px] leading-none"
              >
                menu_book
              </span>
              <span className="truncate">General description</span>
            </m3e-button>
            <m3e-button
              variant="tonal"
              shape="square"
              toggle
              selected={descriptionTab === 'version' ? true : undefined}
              onClick={() => onTabChange('version')}
              style={DESCRIPTION_BUTTON_STYLE}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-[16px] leading-none"
              >
                notes
              </span>
              <span className="truncate">Version description</span>
            </m3e-button>
          </m3e-button-group>
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
            No release notes available
          </p>
          <p className="text-xs mt-1">
            {descriptionTab === 'version'
              ? `The selected release (${selectedVersion ?? 'unknown'}) does not include a description.`
              : 'No description is available for this engine.'}
          </p>
        </div>
      )}
    </article>
  )
}

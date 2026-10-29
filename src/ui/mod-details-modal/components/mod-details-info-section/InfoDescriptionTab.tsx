import React from 'react'
import type { ModItem } from '../../types'

interface InfoDescriptionTabProps {
  displayCard: ModItem
  isDesktop: boolean
  isInstalled: boolean
  isEditingDesc: boolean
  setIsEditingDesc: React.Dispatch<React.SetStateAction<boolean>>
  descInput: string
  setDescInput: React.Dispatch<React.SetStateAction<string>>
  handleSaveDesc: () => void
  isTranslating: boolean
  translatedHtml: string | null
  showTranslated: boolean
  setShowTranslated: React.Dispatch<React.SetStateAction<boolean>>
  targetLanguage: string
  onManualTranslate?: () => void
}

export const InfoDescriptionTab: React.FC<InfoDescriptionTabProps> = ({
  displayCard,
  isDesktop,
  isInstalled,
  isEditingDesc,
  setIsEditingDesc,
  descInput,
  setDescInput,
  handleSaveDesc,
  isTranslating,
  translatedHtml,
  showTranslated,
  setShowTranslated,
  targetLanguage,
  onManualTranslate,
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {isInstalled && !isEditingDesc && (
          <m3e-button
            variant="tonal"
            onClick={() => setIsEditingDesc(true)}
            title="Edit description"
            style={{ cursor: 'pointer' }}
          >
            <span
              slot="icon"
              className="material-symbols-rounded text-base text-[var(--wb-primary)] flex items-center justify-center leading-none"
            >
              edit
            </span>
            <span className="flex items-center justify-center leading-none">
              Edit description
            </span>
          </m3e-button>
        )}

        {isTranslating ? (
          <m3e-icon-button
            disabled
            variant="standard"
            className="border-none !border-0 shrink-0 outline-none"
            title="Translating..."
            aria-label="Translating description"
            style={
              {
                '--m3e-icon-button-outline-thickness': '0px',
                border: 'none',
              } as React.CSSProperties
            }
          >
            <span className="material-symbols-rounded text-base animate-spin">
              progress_activity
            </span>
          </m3e-icon-button>
        ) : (
          <m3e-icon-button
            toggle
            selected={Boolean(translatedHtml && showTranslated)}
            variant={translatedHtml && showTranslated ? 'filled' : 'standard'}
            onClick={() => {
              if (!translatedHtml) {
                if (onManualTranslate) onManualTranslate()
              } else {
                setShowTranslated(!showTranslated)
              }
            }}
            title={
              !translatedHtml
                ? `Translate description to ${targetLanguage === 'es' ? 'Spanish' : 'English'}`
                : showTranslated
                  ? 'Show original description'
                  : 'Show translated description'
            }
            aria-label="Translate description"
            className="border-none !border-0 !border-transparent shrink-0 outline-none"
            style={
              {
                '--m3e-icon-button-outline-thickness': '0px',
                border: 'none',
              } as React.CSSProperties
            }
          >
            <span className="material-symbols-rounded text-base leading-none">
              translate
            </span>
          </m3e-icon-button>
        )}
      </div>

      {isEditingDesc ? (
        <div className={`flex flex-col gap-2 ${isDesktop ? 'pb-4' : 'pb-6'}`}>
          <textarea
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
            onBlur={handleSaveDesc}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDescInput(displayCard.description || '')
                setIsEditingDesc(false)
              }
            }}
            autoFocus
            rows={isDesktop ? 7 : 6}
            className={`w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg p-3 ${
              isDesktop ? 'text-sm md:text-base' : 'text-sm'
            } text-[var(--wb-on-surface)] outline-none custom-scrollbar resize-y shadow-inner font-sans`}
            placeholder="Enter custom mod description..."
          />
          <div className="flex items-center justify-between text-[11px] text-[var(--wb-on-surface-variant)] px-1">
            <span>Click outside or press Escape to finish</span>
            <m3e-button variant="filled" onClick={handleSaveDesc}>
              Done
            </m3e-button>
          </div>
        </div>
      ) : displayCard.htmlBody ? (
        <div
          onClick={() => isInstalled && setIsEditingDesc(true)}
          className={`text-[var(--wb-on-surface-variant)] prose prose-invert ${
            isDesktop ? 'prose-sm md:prose-base pb-4' : 'prose-sm pb-6'
          } max-w-full overflow-x-hidden break-words [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_table]:block [&_table]:overflow-x-auto ${
            isInstalled
              ? 'cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1'
              : ''
          }`}
          title={isInstalled ? 'Click to edit description' : undefined}
          dangerouslySetInnerHTML={{
            __html:
              showTranslated && translatedHtml
                ? translatedHtml
                : displayCard.htmlBody,
          }}
        />
      ) : (
        <p
          onClick={() => isInstalled && setIsEditingDesc(true)}
          className={`text-[var(--wb-on-surface-variant)] ${
            isDesktop ? 'text-sm md:text-base pb-4' : 'text-sm pb-6'
          } break-words ${
            isInstalled
              ? 'cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1'
              : ''
          }`}
          title={isInstalled ? 'Click to edit description' : undefined}
        >
          {showTranslated && translatedHtml
            ? translatedHtml
            : displayCard.description}
        </p>
      )}
    </div>
  )
}


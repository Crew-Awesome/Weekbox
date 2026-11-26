import React from 'react'
import type { SupportedLanguage } from '@/core/i18n'

interface LanguageFlagIconProps {
  code: SupportedLanguage
  className?: string
}

function renderFlagShapes(code: SupportedLanguage): React.ReactNode {
  switch (code) {
    case 'en':
      return (
        <>
          <rect width="36" height="24" fill="#FFFFFF" />
          <rect y="0" width="36" height="3.4" fill="#B22234" />
          <rect y="6.8" width="36" height="3.4" fill="#B22234" />
          <rect y="13.6" width="36" height="3.4" fill="#B22234" />
          <rect y="20.4" width="36" height="3.6" fill="#B22234" />
          <rect width="16" height="13.6" fill="#3C3B6E" />
          <circle cx="4" cy="3.5" r="0.9" fill="#FFFFFF" />
          <circle cx="8" cy="3.5" r="0.9" fill="#FFFFFF" />
          <circle cx="12" cy="3.5" r="0.9" fill="#FFFFFF" />
          <circle cx="6" cy="6.8" r="0.9" fill="#FFFFFF" />
          <circle cx="10" cy="6.8" r="0.9" fill="#FFFFFF" />
          <circle cx="4" cy="10.1" r="0.9" fill="#FFFFFF" />
          <circle cx="8" cy="10.1" r="0.9" fill="#FFFFFF" />
          <circle cx="12" cy="10.1" r="0.9" fill="#FFFFFF" />
        </>
      )
    case 'zh':
      return (
        <>
          <rect width="36" height="24" fill="#DE2910" />
          <polygon
            points="7.5,3.5 8.5,6.4 11.5,6.4 9.1,8.1 10,11 7.5,9.2 5,11 5.9,8.1 3.5,6.4 6.5,6.4"
            fill="#FFDE00"
          />
          <circle cx="13.8" cy="3.8" r="1" fill="#FFDE00" />
          <circle cx="15.6" cy="6.2" r="1" fill="#FFDE00" />
          <circle cx="15.6" cy="9.2" r="1" fill="#FFDE00" />
          <circle cx="13.8" cy="11.6" r="1" fill="#FFDE00" />
        </>
      )
    case 'zh-TW':
      return (
        <>
          <rect width="36" height="24" fill="#FE0000" />
          <rect width="18" height="12" fill="#000095" />
          <polygon
            points="9,2.2 9.9,4.2 12,3.4 11,5.3 13,6 11,6.7 12,8.6 9.9,7.8 9,9.8 8.1,7.8 6,8.6 7,6.7 5,6 7,5.3 6,3.4 8.1,4.2"
            fill="#FFFFFF"
          />
          <circle cx="9" cy="6" r="2.2" fill="#000095" />
          <circle cx="9" cy="6" r="1.7" fill="#FFFFFF" />
        </>
      )
    case 'ru':
      return (
        <>
          <rect width="36" height="8" y="0" fill="#FFFFFF" />
          <rect width="36" height="8" y="8" fill="#0039A6" />
          <rect width="36" height="8" y="16" fill="#D52B1E" />
        </>
      )
    case 'tr':
      return (
        <>
          <rect width="36" height="24" fill="#E30A17" />
          <circle cx="13.5" cy="12" r="5.5" fill="#FFFFFF" />
          <circle cx="14.9" cy="12" r="4.4" fill="#E30A17" />
          <polygon
            points="21.2,9.2 21.9,11.2 24,11.2 22.3,12.4 22.9,14.4 21.2,13.2 19.5,14.4 20.1,12.4 18.4,11.2 20.5,11.2"
            fill="#FFFFFF"
          />
        </>
      )
    case 'pl':
      return (
        <>
          <rect width="36" height="12" y="0" fill="#FFFFFF" />
          <rect width="36" height="12" y="12" fill="#DC143C" />
        </>
      )
    case 'id':
      return (
        <>
          <rect width="36" height="12" y="0" fill="#CE1126" />
          <rect width="36" height="12" y="12" fill="#FFFFFF" />
        </>
      )
    case 'es':
      return (
        <>
          <rect width="12" height="24" x="0" fill="#006847" />
          <rect width="12" height="24" x="12" fill="#FFFFFF" />
          <rect width="12" height="24" x="24" fill="#CE1126" />
          <circle cx="18" cy="12" r="2.6" fill="#8C5828" />
          <path d="M15.4 13.6 Q18 15.8 20.6 13.6" fill="none" stroke="#006847" strokeWidth="1.2" />
        </>
      )
    case 'it':
      return (
        <>
          <rect width="12" height="24" x="0" fill="#009246" />
          <rect width="12" height="24" x="12" fill="#FFFFFF" />
          <rect width="12" height="24" x="24" fill="#CE2B37" />
        </>
      )
    case 'fr':
      return (
        <>
          <rect width="12" height="24" x="0" fill="#0055A4" />
          <rect width="12" height="24" x="12" fill="#FFFFFF" />
          <rect width="12" height="24" x="24" fill="#EF4135" />
        </>
      )
    case 'pt-BR':
      return (
        <>
          <rect width="36" height="24" fill="#009C3B" />
          <polygon points="18,3 32,12 18,21 4,12" fill="#FFDF00" />
          <circle cx="18" cy="12" r="4.8" fill="#002776" />
          <path d="M13.5 11.2 Q18 10.2 22.5 12.6" fill="none" stroke="#FFFFFF" strokeWidth="1.1" />
        </>
      )
    case 'de':
      return (
        <>
          <rect width="36" height="8" y="0" fill="#000000" />
          <rect width="36" height="8" y="8" fill="#DD0000" />
          <rect width="36" height="8" y="16" fill="#FFCE00" />
        </>
      )
  }
}

/**
 * Crisp solid-color SVG country flag icons for setup & settings language cards.
 */
export const LanguageFlagIcon: React.FC<LanguageFlagIconProps> = ({
  code,
  className = 'w-10 h-7',
}) => {
  return (
    <svg
      viewBox="0 0 36 24"
      className={`${className} rounded-md shrink-0 border border-[var(--md-sys-color-outline-variant)]/50`}
      aria-hidden="true"
    >
      {renderFlagShapes(code)}
    </svg>
  )
}

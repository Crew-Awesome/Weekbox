import React, { useState } from 'react'

interface NewsPostTextProps {
  text: string
  maxCollapsedLength?: number
  onOpenExternal?: (url: string) => void
}

export const NewsPostText: React.FC<NewsPostTextProps> = ({
  text,
  maxCollapsedLength = 280,
  onOpenExternal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLong = text.length > maxCollapsedLength

  const displayText = isLong && !isExpanded ? `${text.slice(0, maxCollapsedLength)}...` : text

  const renderFormattedText = (raw: string) => {
    const pattern =
      /((?:https?:\/\/|www\.)[^\s]+|(?:[\w-]+\.)+(?:com|org|net|io|video)\/[^\s]+|(?<![\w])@\/?[A-Za-z0-9_]{1,15}|(?<![\w])#[A-Za-z0-9_]+)/gi

    const elements: React.ReactNode[] = []
    let lastIndex = 0

    const matches = Array.from(raw.matchAll(pattern))

    matches.forEach((match, index) => {
      const matchIndex = match.index ?? 0
      const matchedString = match[0]
      const trailing = matchedString.match(/[.,!?;:)\]]+$/)?.[0] || ''
      const cleanMatch = trailing ? matchedString.slice(0, -trailing.length) : matchedString

      if (matchIndex > lastIndex) {
        elements.push(raw.slice(lastIndex, matchIndex))
      }

      let href = ''
      if (cleanMatch.startsWith('@')) {
        const handle = cleanMatch.replace(/^@\/?/, '')
        href = `https://x.com/${handle}`
      } else if (cleanMatch.startsWith('#')) {
        const tag = cleanMatch.replace(/^#/, '')
        href = `https://x.com/hashtag/${tag}`
      } else {
        href = cleanMatch.startsWith('http') ? cleanMatch : `https://${cleanMatch}`
      }

      elements.push(
        <a
          key={`text-link-${index}-${cleanMatch}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation()
            if (onOpenExternal) {
              e.preventDefault()
              onOpenExternal(href)
            }
          }}
          className="text-[var(--md-sys-color-primary)] hover:underline font-medium break-all"
        >
          {cleanMatch}
        </a>,
      )

      if (trailing) {
        elements.push(trailing)
      }

      lastIndex = matchIndex + matchedString.length
    })

    if (lastIndex < raw.length) {
      elements.push(raw.slice(lastIndex))
    }

    return elements
  }

  return (
    <div className="w-full text-sm leading-relaxed text-[var(--md-sys-color-on-surface)] break-words select-text">
      <p className="whitespace-pre-line">{renderFormattedText(displayText)}</p>
      {isLong && (
        <div className="mt-1">
          <m3e-button
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded((prev) => !prev)
            }}
            style={
              {
                '--m3e-button-container-height': '28px',
                '--m3e-button-label-text-font-size': '12px',
                cursor: 'pointer',
              } as React.CSSProperties
            }
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </m3e-button>
        </div>
      )}
    </div>
  )
}


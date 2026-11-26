import React from 'react'
import { useUiStyle } from '@/utils/ui-style'

export interface TitleProps {
  title: string
  align?: 'left' | 'center' | 'right'
  children?: React.ReactNode
}

/**
 * Section title component: renders expressive M3 diagonal rules in WeekBox Style
 * or a clean, flat heading rule in WeekBox Home mode.
 */
export const Title: React.FC<TitleProps> = ({
  title,
  align = 'left',
  children,
}) => {
  const isHomeStyle = useUiStyle() === 'home'

  if (isHomeStyle) {
    const justifyClass =
      align === 'center'
        ? 'justify-center'
        : align === 'right'
          ? 'justify-end'
          : 'justify-between'

    return (
      <div
        className={`flex items-center ${justifyClass} gap-3 border-b px-1 pb-2.5 my-4 select-none`}
        style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
      >
        <h2
          className="font-bold text-xl md:text-2xl whitespace-nowrap leading-tight tracking-tight"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {title}
        </h2>
        {children && <div className="shrink-0 flex items-center">{children}</div>}
      </div>
    )
  }

  const textNode = (
    <div
      className="flex items-center border-b-[3px] px-3 shrink-0"
      style={{
        borderColor: 'var(--md-sys-color-primary)',
      }}
    >
      <h2
        className="font-bold text-2xl md:text-3xl whitespace-nowrap leading-none pb-1 tracking-tight"
        style={{
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {title}
      </h2>
    </div>
  )

  const diagonalUp = (
    <div className="w-6 shrink-0 relative overflow-visible">
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="100"
          x2="100"
          y2="0"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )

  const diagonalDown = (
    <div className="w-6 shrink-0 relative overflow-visible">
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          stroke="var(--md-sys-color-primary)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )

  const lineTop = (
    <div
      className="flex-1 border-t-[3px] min-w-[20px] pt-3 pr-2 flex justify-end"
      style={{
        borderColor: 'var(--md-sys-color-primary)',
      }}
    >
      {children}
    </div>
  )

  return (
    <div className="flex items-stretch -mx-4 px-0 sm:mx-0 sm:px-2 my-4 select-none">
      {align === 'left' && (
        <>
          {textNode}
          {diagonalUp}
          {lineTop}
        </>
      )}

      {align === 'right' && (
        <>
          {lineTop}
          {diagonalDown}
          {textNode}
        </>
      )}

      {align === 'center' && (
        <>
          {lineTop}
          {diagonalDown}
          {textNode}
          {diagonalUp}
          {lineTop}
        </>
      )}
    </div>
  )
}

export default Title

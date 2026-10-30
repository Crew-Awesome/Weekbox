import React from 'react'
import './sidebar-icon.css'

export type SidebarIconName =
  | 'home'
  | 'library'
  | 'instances'
  | 'news'
  | 'settings'
  | 'info'
  | string

export interface SidebarIconProps {
  name: SidebarIconName
  isActive?: boolean
  size?: number
  className?: string
  slot?: string
}

/**
 * Animated SVG icon component for sidebar navigation and action triggers.
 */
export const SidebarIcon: React.FC<SidebarIconProps> = ({
  name,
  isActive = false,
  size = 24,
  className = '',
  slot,
}) => {
  const rawId = React.useId()
  const maskId = `cuki-news-mask-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const iconKey = name === 'local_library' ? 'library' : name === 'layers' ? 'instances' : name

  const renderIconContent = () => {
    switch (iconKey) {
      case 'home':
        return (
          <g className={isActive ? 'cuki-anim-home' : 'cuki-hover-target'}>
            <path
              d={
                isActive
                  ? 'M160-200v-360q0-19 8.5-36t23.5-28l240-180q21-16 48-16t48 16l240 180q15 11 23.5 28t8.5 36v360q0 33-23.5 56.5T720-120H600q-17 0-28.5-11.5T560-160v-200q0-17-11.5-28.5T520-400h-80q-17 0-28.5 11.5T400-360v200q0 17-11.5 28.5T360-120H240q-33 0-56.5-23.5T160-200Z'
                  : 'M240-200h120v-200q0-17 11.5-28.5T400-440h160q17 0 28.5 11.5T600-400v200h120v-360L480-740 240-560v360Zm-80 0v-360q0-19 8.5-36t23.5-28l240-180q21-16 48-16t48 16l240 180q15 11 23.5 28t8.5 36v360q0 33-23.5 56.5T720-120H560q-17 0-28.5-11.5T520-160v-200h-80v200q0 17-11.5 28.5T400-120H240q-33 0-56.5-23.5T160-200Zm320-270Z'
              }
              fill="currentColor"
            />
            {isActive && (
              <circle
                className="cuki-home-puff"
                cx="480"
                cy="-770"
                r="30"
                fill="currentColor"
              />
            )}
          </g>
        )

      case 'library':
        return (
          <g className={isActive ? 'cuki-anim-library' : 'cuki-hover-target'}>
            <g className={isActive ? 'cuki-anim-lib-head' : ''}>
              <path
                d={
                  isActive
                    ? 'M480-600q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Z'
                    : 'M480-600q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-760q0-33-23.5-56.5T480-840q-33 0-56.5 23.5T400-760q0 33 23.5 56.5T480-680Zm0-80Z'
                }
                fill="currentColor"
              />
            </g>
            <g className={isActive ? 'cuki-anim-lib-book' : ''}>
              <path
                d="M120-274v-286q0-32 23.5-54t55.5-20q79 12 150.5 46.5T480-498q59-55 130.5-89.5T761-634q32-2 55.5 20t23.5 54v286q0 32-21 54.5T766-195q-64 10-124 33t-112 61q-11 9-23.5 13.5T480-83q-14 0-26.5-4.5T430-101q-52-38-112-61t-124-33q-32-2-53-24.5T120-274Zm360 110q63-47 134-75t146-37v-276q-73 13-143.5 52.5T480-394q-66-66-136.5-105.5T200-552v276q75 9 146 37t134 75Z"
                fill="currentColor"
              />
            </g>
          </g>
        )

      case 'instances':
        return (
          <g className={isActive ? 'cuki-anim-instances' : 'cuki-hover-target'}>
            <g className={isActive ? 'cuki-anim-layer-bottom' : ''}>
              <path
                d="M161-366q-16-12-15.5-31.5T162-429q11-8 24-8t24 8l270 209 270-209q11-8 24-8t24 8q16 12 16.5 31.5T799-366L529-156q-22 17-49 17t-49-17L161-366Z"
                fill="currentColor"
              />
            </g>
            <g className={isActive ? 'cuki-anim-layer-top' : ''}>
              <path
                d={
                  isActive
                    ? 'M431-358L201-537q-31-24-31-63t31-63l230-179q22-17 49-17t49 17l230 179q31 24 31 63t-31 63L529-358q-22 17-49 17t-49-17Z'
                    : 'M431-358L201-537q-31-24-31-63t31-63l230-179q22-17 49-17t49 17l230 179q31 24 31 63t-31 63L529-358q-22 17-49 17t-49-17Zm49-64 230-178-230-178-230 178 230 178Zm0-178Z'
                }
                fill="currentColor"
              />
            </g>
          </g>
        )

      case 'news':
        return (
          <g className={isActive ? 'cuki-anim-news-squash' : 'cuki-hover-target'}>
            <defs>
              <mask id={maskId}>
                <rect x="-200" y="-1200" width="1400" height="1400" fill="white" />
                <rect
                  className={isActive ? 'cuki-rect-header' : 'cuki-hover-rect-header'}
                  x="160"
                  y="-640"
                  width="640"
                  height="120"
                  rx="20"
                  fill="black"
                />
                <rect
                  className={isActive ? 'cuki-rect-box' : 'cuki-hover-rect-box'}
                  x="160"
                  y="-440"
                  width="280"
                  height="240"
                  rx="20"
                  fill="black"
                />
                <rect
                  className={isActive ? 'cuki-rect-line1' : 'cuki-hover-rect-line1'}
                  x="520"
                  y="-440"
                  width="280"
                  height="80"
                  rx="16"
                  fill="black"
                />
                <rect
                  className={isActive ? 'cuki-rect-line2' : 'cuki-hover-rect-line2'}
                  x="520"
                  y="-280"
                  width="280"
                  height="80"
                  rx="16"
                  fill="black"
                />
              </mask>
            </defs>

            <path
              mask={`url(#${maskId})`}
              d="M160-120q-33 0-56.5-23.5T80-200v-616q0-7 6-9.5t11 2.5l50 50 52-53q6-6 14-6t14 6l53 53 53-53q6-6 14-6t14 6l52 53 53-53q6-6 14-6t14 6l53 53 52-53q6-6 14-6t14 6l53 53 53-53q6-6 14-6t14 6l52 53 50-50q5-5 11-2.5t6 9.5v616q0 33-23.5 56.5T800-120H160Z"
              fill="currentColor"
            />
          </g>
        )

      case 'settings':
        return (
          <g className={isActive ? 'cuki-anim-settings' : 'cuki-hover-settings'}>
            <path
              d={
                isActive
                  ? 'M433-80q-27 0-46.5-18T363-142l-9-66q-13-5-24.5-12T307-235l-62 26q-25 11-50 2t-39-32l-47-82q-14-23-8-49t27-43l53-40q-1-7-1-13.5v-27q0-6.5 1-13.5l-53-40q-21-17-27-43t8-49l47-82q14-23 39-32t50 2l62 26q11-8 23-15t24-12l9-66q4-26 23.5-44t46.5-18h94q27 0 46.5 18t23.5 44l9 66q13 5 24.5 12t22.5 15l62-26q25-11 50-2t39 32l47 82q14 23 8 49t-27 43l-53 40q1 7 1 13.5v27q0 6.5-2 13.5l53 40q21 17 27 43t-8 49l-48 82q-14 23-39 32t-50-2l-60-26q-11 8-23 15t-24 12l-9 66q-4 26-23.5 44T527-80h-94Zm49-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z'
                  : 'M433-80q-27 0-46.5-18T363-142l-9-66q-13-5-24.5-12T307-235l-62 26q-25 11-50 2t-39-32l-47-82q-14-23-8-49t27-43l53-40q-1-7-1-13.5v-27q0-6.5 1-13.5l-53-40q-21-17-27-43t8-49l47-82q14-23 39-32t50 2l62 26q11-8 23-15t24-12l9-66q4-26 23.5-44t46.5-18h94q27 0 46.5 18t23.5 44l9 66q13 5 24.5 12t22.5 15l62-26q25-11 50-2t39 32l47 82q14 23 8 49t-27 43l-53 40q1 7 1 13.5v27q0 6.5-2 13.5l53 40q21 17 27 43t-8 49l-48 82q-14 23-39 32t-50-2l-60-26q-11 8-23 15t-24 12l-9 66q-4 26-23.5 44T527-80h-94Zm7-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z'
              }
              fill="currentColor"
            />
          </g>
        )

      case 'info':
        return (
          <g className={isActive ? 'cuki-anim-info' : 'cuki-hover-target'}>
            <g className={isActive ? 'cuki-anim-info-dot' : ''}>
              <path
                d="M480-600q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Z"
                fill="currentColor"
              />
            </g>
            <g className={isActive ? 'cuki-anim-info-circle' : ''}>
              <path
                d={
                  isActive
                    ? 'M480-280q17 0 28.5-11.5T520-320v-160q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480v160q0 17 11.5 28.5T480-280Zm0 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z'
                    : 'M480-280q17 0 28.5-11.5T520-320v-160q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480v160q0 17 11.5 28.5T480-280Zm0 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'
                }
                fill="currentColor"
              />
            </g>
          </g>
        )

      case 'filter':
        return (
          <g className={isActive ? 'cuki-anim-filter' : 'cuki-hover-target'}>
            <path
              d={
                isActive
                  ? 'M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Z'
                  : 'M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z'
              }
              fill="currentColor"
            />
            <rect
              className={isActive ? 'cuki-filter-bar1' : 'cuki-hover-filter-bar1'}
              x="260"
              y="-700"
              width="440"
              height="44"
              rx="22"
              fill={isActive ? 'var(--md-sys-color-surface, #ffffff)' : 'currentColor'}
              opacity={isActive ? 0.95 : 0.6}
            />
            <rect
              className={isActive ? 'cuki-filter-bar2' : 'cuki-hover-filter-bar2'}
              x="330"
              y="-585"
              width="300"
              height="44"
              rx="22"
              fill={isActive ? 'var(--md-sys-color-surface, #ffffff)' : 'currentColor'}
              opacity={isActive ? 0.95 : 0.6}
            />
            <rect
              className={isActive ? 'cuki-filter-bar3' : 'cuki-hover-filter-bar3'}
              x="400"
              y="-470"
              width="160"
              height="44"
              rx="22"
              fill={isActive ? 'var(--md-sys-color-surface, #ffffff)' : 'currentColor'}
              opacity={isActive ? 0.95 : 0.6}
            />
            {isActive && (
              <>
                <circle
                  className="cuki-filter-droplet"
                  cx="480"
                  cy="-160"
                  r="42"
                  fill="currentColor"
                />
                <path
                  className="cuki-filter-spark"
                  d="M740-740l18 36 36 18-36 18-18 36-18-36-36-18 36-18z"
                  fill="currentColor"
                />
              </>
            )}
          </g>
        )

      default:
        return null
    }
  }

  return (
    <span
      slot={slot}
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        viewBox="0 -960 960 960"
        width={size}
        height={size}
        className="cuki-svg overflow-visible pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          fill: 'currentColor',
        }}
      >
        {renderIconContent()}
      </svg>
    </span>
  )
}

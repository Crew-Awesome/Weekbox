export const SCROLLBAR_SHADOW_STYLES = `
  :host {
    display: block;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    z-index: 20;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  @media (max-width: 767px) {
    :host {
      display: none !important;
    }
  }
  :host([hidden]) {
    display: none !important;
  }
  :host([direction="vertical"]), :host(:not([direction="horizontal"])) {
    width: var(--m3e-overflow-thumb-thickness, var(--m3e-overflow-thickness, 8px));
    height: 100%;
  }
  :host([direction="horizontal"]) {
    height: var(--m3e-overflow-thumb-thickness, var(--m3e-overflow-thickness, 8px));
    width: 100%;
  }
  .track-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    cursor: pointer;
  }
  .track-line {
    stroke: var(--m3e-overflow-track-color, var(--md-sys-color-outline-variant, #C7C5D0));
    stroke-width: var(--m3e-overflow-thumb-thickness, var(--m3e-overflow-track-thickness, var(--m3e-overflow-thickness, 8px)));
    stroke-linecap: round;
    transition: stroke 0.2s ease;
  }
  .thumb {
    position: absolute;
    cursor: grab;
    border-radius: var(--m3e-overflow-thumb-shape, 9999px);
    background-color: var(--m3e-overflow-thumb-color, var(--md-sys-color-primary, #363CFF));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: background-color 0.2s ease, filter 0.15s ease;
  }
  .thumb:hover {
    filter: brightness(1.1);
  }
  .thumb.dragging, .thumb:active {
    cursor: grabbing;
    filter: brightness(0.95);
  }
`

export function updateScrollbarGeometry(params: {
  host: HTMLElement
  target: HTMLElement
  isHorizontal: boolean
  lineStart: SVGLineElement
  lineEnd: SVGLineElement
  thumb: HTMLDivElement
  thickness: number
  gap: number
  minLength: number
  inset: number
}): void {
  const {
    host,
    target,
    isHorizontal,
    lineStart,
    lineEnd,
    thumb,
    thickness,
    gap,
    minLength,
    inset,
  } = params

  const rect = host.getBoundingClientRect()
  const targetStyle = getComputedStyle(target)

  if (isHorizontal) {
    if (
      targetStyle.overflowX === 'hidden' ||
      targetStyle.overflowX === 'clip'
    ) {
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      return
    }

    const containerW = (host.parentElement as HTMLElement)?.clientWidth || target.clientWidth
    const W = rect.width > 0 ? rect.width : Math.max(0, containerW - inset * 2)
    const H = rect.height > 0 ? rect.height : thickness
    const maxScroll = target.scrollWidth - target.clientWidth

    if (maxScroll <= 1 || W <= 0) {
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      return
    }
    host.style.opacity = '1'
    host.style.pointerEvents = 'auto'

    const scrollRatio = Math.max(0, Math.min(1, target.scrollLeft / maxScroll))
    const visibleRatio = Math.min(1, target.clientWidth / target.scrollWidth)
    const thumbWidth = Math.max(minLength, Math.min(W, visibleRatio * W))
    const availableTravel = W - thumbWidth
    const thumbLeft = scrollRatio * availableTravel
    const thumbRight = thumbLeft + thumbWidth

    const line1End = Math.max(0, thumbLeft - gap)
    const line2Start = Math.min(W, thumbRight + gap)
    const cy = H / 2

    if (line1End > thickness) {
      lineStart.setAttribute('x1', '0')
      lineStart.setAttribute('y1', String(cy))
      lineStart.setAttribute('x2', String(line1End))
      lineStart.setAttribute('y2', String(cy))
      lineStart.style.display = 'block'
    } else {
      lineStart.style.display = 'none'
    }

    if (W - line2Start > thickness) {
      lineEnd.setAttribute('x1', String(line2Start))
      lineEnd.setAttribute('y1', String(cy))
      lineEnd.setAttribute('x2', String(W))
      lineEnd.setAttribute('y2', String(cy))
      lineEnd.style.display = 'block'
    } else {
      lineEnd.style.display = 'none'
    }

    thumb.style.left = `${thumbLeft.toFixed(1)}px`
    thumb.style.top = `${((H - thickness) / 2).toFixed(1)}px`
    thumb.style.width = `${thumbWidth.toFixed(1)}px`
    thumb.style.height = `${thickness}px`
  } else {
    if (
      targetStyle.overflowY === 'hidden' ||
      targetStyle.overflowY === 'clip'
    ) {
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      return
    }

    const containerH = (host.parentElement as HTMLElement)?.clientHeight || target.clientHeight
    const H = rect.height > 0 ? rect.height : Math.max(0, containerH - inset * 2)
    const W = rect.width > 0 ? rect.width : thickness
    const maxScroll = target.scrollHeight - target.clientHeight

    if (maxScroll <= 1 || H <= 0) {
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      return
    }
    host.style.opacity = '1'
    host.style.pointerEvents = 'auto'

    const scrollRatio = Math.max(0, Math.min(1, target.scrollTop / maxScroll))
    const visibleRatio = Math.min(1, target.clientHeight / target.scrollHeight)
    const thumbHeight = Math.max(minLength, Math.min(H, visibleRatio * H))
    const availableTravel = H - thumbHeight
    const thumbTop = scrollRatio * availableTravel
    const thumbBottom = thumbTop + thumbHeight

    const line1End = Math.max(0, thumbTop - gap)
    const line2Start = Math.min(H, thumbBottom + gap)
    const cx = W / 2

    if (line1End > thickness) {
      lineStart.setAttribute('x1', String(cx))
      lineStart.setAttribute('y1', '0')
      lineStart.setAttribute('x2', String(cx))
      lineStart.setAttribute('y2', String(line1End))
      lineStart.style.display = 'block'
    } else {
      lineStart.style.display = 'none'
    }

    if (H - line2Start > thickness) {
      lineEnd.setAttribute('x1', String(cx))
      lineEnd.setAttribute('y1', String(line2Start))
      lineEnd.setAttribute('x2', String(cx))
      lineEnd.setAttribute('y2', String(H))
      lineEnd.style.display = 'block'
    } else {
      lineEnd.style.display = 'none'
    }

    thumb.style.top = `${thumbTop.toFixed(1)}px`
    thumb.style.left = `${((W - thickness) / 2).toFixed(1)}px`
    thumb.style.width = `${thickness}px`
    thumb.style.height = `${thumbHeight.toFixed(1)}px`
  }
}

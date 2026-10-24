import { M3eScrollbarElement } from './M3eScrollbar'
import type { OverflowDirection } from './types'

/**
 * Custom element (`m3e-overflow`) that wraps content and renders Material 3 Expressive cutout scrollbars.
 */
export class M3eOverflowElement extends HTMLElement {
  static get observedAttributes() {
    return ['direction', 'track-thickness', 'thumb-thickness', 'thumb-gap', 'thumb-color', 'track-color']
  }

  private _viewport: HTMLDivElement
  private _scrollbarY: M3eScrollbarElement
  private _scrollbarX: M3eScrollbarElement
  private _direction: OverflowDirection = 'auto'
  private _contentObserver: ResizeObserver | null = null

  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: block;
        position: relative;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        min-height: 0;
      }
      .viewport {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        overflow: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .viewport::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      .bar-y {
        position: absolute;
        top: var(--m3e-overflow-inset, 4px);
        bottom: var(--m3e-overflow-inset, 4px);
        right: var(--m3e-overflow-inset, 4px);
        pointer-events: auto;
        z-index: 40;
      }
      .bar-x {
        position: absolute;
        left: var(--m3e-overflow-inset, 4px);
        right: var(--m3e-overflow-inset, 4px);
        bottom: var(--m3e-overflow-inset, 4px);
        pointer-events: auto;
        z-index: 40;
      }
    `

    this._viewport = document.createElement('div')
    this._viewport.className = 'viewport'
    this._viewport.setAttribute('part', 'viewport')

    this._contentObserver = new ResizeObserver(() => {
      this._scrollbarY.update()
      this._scrollbarX.update()
    })

    const slot = document.createElement('slot')
    slot.addEventListener('slotchange', () => {
      this._contentObserver?.disconnect()
      for (const el of slot.assignedElements()) {
        this._contentObserver?.observe(el)
      }
      this._scrollbarY.update()
      this._scrollbarX.update()
    })
    this._viewport.appendChild(slot)

    this._scrollbarY = new M3eScrollbarElement()
    this._scrollbarY.direction = 'vertical'
    this._scrollbarY.className = 'bar-y'
    this._scrollbarY.setAttribute('part', 'scrollbar-y')

    this._scrollbarX = new M3eScrollbarElement()
    this._scrollbarX.direction = 'horizontal'
    this._scrollbarX.className = 'bar-x'
    this._scrollbarX.setAttribute('part', 'scrollbar-x')

    shadow.appendChild(style)
    shadow.appendChild(this._viewport)
    shadow.appendChild(this._scrollbarY)
    shadow.appendChild(this._scrollbarX)
  }

  get viewport(): HTMLDivElement {
    return this._viewport
  }

  get direction(): OverflowDirection {
    return this._direction
  }

  set direction(val: OverflowDirection) {
    this._direction = val
    this.setAttribute('direction', val)
    this._updateDirections()
  }

  connectedCallback() {
    this._scrollbarY.target = this._viewport
    this._scrollbarX.target = this._viewport
    const attrs = ['track-thickness', 'thumb-thickness', 'thumb-gap', 'thumb-color', 'track-color']
    for (const attr of attrs) {
      if (this.hasAttribute(attr)) {
        const val = this.getAttribute(attr)!
        this._scrollbarY.setAttribute(attr, val)
        this._scrollbarX.setAttribute(attr, val)
      }
    }
    this._updateDirections()

    const slot = this.shadowRoot?.querySelector('slot')
    if (slot) {
      for (const el of slot.assignedElements()) {
        this._contentObserver?.observe(el)
      }
    }
  }

  disconnectedCallback() {
    this._contentObserver?.disconnect()
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === 'direction') {
      this._direction = (newVal as OverflowDirection) || 'auto'
      this._updateDirections()
    } else {
      this._scrollbarY.setAttribute(name, newVal)
      this._scrollbarX.setAttribute(name, newVal)
    }
  }

  private _updateDirections() {
    const dir = this._direction
    if (dir === 'vertical') {
      this._viewport.style.overflowY = 'auto'
      this._viewport.style.overflowX = 'hidden'
      this._scrollbarY.style.display = ''
      this._scrollbarX.style.display = 'none'
    } else if (dir === 'horizontal') {
      this._viewport.style.overflowX = 'auto'
      this._viewport.style.overflowY = 'hidden'
      this._scrollbarX.style.display = ''
      this._scrollbarY.style.display = 'none'
    } else {
      this._viewport.style.overflowX =
        this.getAttribute('overflow-x') === 'hidden' || this.style.overflowX === 'hidden'
          ? 'hidden'
          : 'auto'
      this._viewport.style.overflowY =
        this.getAttribute('overflow-y') === 'hidden' || this.style.overflowY === 'hidden'
          ? 'hidden'
          : 'auto'
      this._scrollbarY.style.display = ''
      this._scrollbarX.style.display = ''
    }
    this._scrollbarY.update()
    this._scrollbarX.update()
  }

  get scrollTop(): number {
    return this._viewport.scrollTop
  }

  set scrollTop(val: number) {
    this._viewport.scrollTop = val
  }

  get scrollLeft(): number {
    return this._viewport.scrollLeft
  }

  set scrollLeft(val: number) {
    this._viewport.scrollLeft = val
  }

  public scrollTo(options?: ScrollToOptions | number, y?: number) {
    if (typeof options === 'number') {
      this._viewport.scrollTo(options, y as number)
    } else {
      this._viewport.scrollTo(options)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('m3e-overflow')) {
  customElements.define('m3e-overflow', M3eOverflowElement)
}

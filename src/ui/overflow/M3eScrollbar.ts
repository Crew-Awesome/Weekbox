import {
  SCROLLBAR_SHADOW_STYLES,
  updateScrollbarGeometry,
} from './scrollbar-geometry'

export class M3eScrollbarElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'direction',
      'for',
      'track-thickness',
      'thumb-thickness',
      'thumb-gap',
      'thumb-color',
      'track-color',
    ]
  }

  private _direction: 'vertical' | 'horizontal' = 'vertical'
  private _target: HTMLElement | null = null
  private _resizeObserver: ResizeObserver | null = null
  private _svg: SVGSVGElement
  private _lineStart: SVGLineElement
  private _lineEnd: SVGLineElement
  private _thumb: HTMLDivElement
  private _isDragging = false
  private _dragStartPointer = 0
  private _dragStartScroll = 0

  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = SCROLLBAR_SHADOW_STYLES

    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this._svg.setAttribute('class', 'track-svg')

    this._lineStart = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    this._lineStart.setAttribute('class', 'track-line line-start')

    this._lineEnd = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    this._lineEnd.setAttribute('class', 'track-line line-end')

    this._svg.appendChild(this._lineStart)
    this._svg.appendChild(this._lineEnd)

    this._thumb = document.createElement('div')
    this._thumb.className = 'thumb'

    shadow.appendChild(style)
    shadow.appendChild(this._svg)
    shadow.appendChild(this._thumb)

    this._onScroll = this._onScroll.bind(this)
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp = this._onPointerUp.bind(this)
    this._onTrackClick = this._onTrackClick.bind(this)
  }

  get direction(): 'vertical' | 'horizontal' {
    return this._direction
  }

  set direction(val: 'vertical' | 'horizontal') {
    this._direction = val === 'horizontal' ? 'horizontal' : 'vertical'
    this.setAttribute('direction', this._direction)
    this.update()
  }

  get target(): HTMLElement | null {
    return this._target
  }

  set target(el: HTMLElement | null) {
    if (this._target) {
      this._target.removeEventListener('scroll', this._onScroll)
      this._resizeObserver?.unobserve(this._target)
    }
    this._target = el
    if (this._target) {
      this._target.addEventListener('scroll', this._onScroll, { passive: true })
      this._resizeObserver?.observe(this._target)
      this.update()
    }
  }

  connectedCallback() {
    this._thumb.addEventListener('pointerdown', this._onPointerDown)
    this._svg.addEventListener('click', this._onTrackClick)

    this._resizeObserver = new ResizeObserver(() => {
      this.update()
    })
    this._resizeObserver.observe(this)

    if (!this._target && this.getAttribute('for')) {
      const id = this.getAttribute('for')!
      const found = (this.getRootNode() as Document | ShadowRoot).getElementById(id)
      if (found) {
        this.target = found
      }
    }
    this.update()
  }

  disconnectedCallback() {
    this._thumb.removeEventListener('pointerdown', this._onPointerDown)
    this._svg.removeEventListener('click', this._onTrackClick)
    if (this._target) {
      this._target.removeEventListener('scroll', this._onScroll)
    }
    this._resizeObserver?.disconnect()
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === 'direction') {
      this._direction = newVal === 'horizontal' ? 'horizontal' : 'vertical'
      this.update()
    } else if (name === 'for' && this.isConnected) {
      const found = (this.getRootNode() as Document | ShadowRoot).getElementById(newVal)
      if (found) {
        this.target = found
      }
    } else if (name === 'track-thickness') {
      const v = /^\d+(\.\d+)?$/.test(newVal?.trim()) ? `${newVal.trim()}px` : newVal
      this.style.setProperty('--m3e-overflow-track-thickness', v)
      this.update()
    } else if (name === 'thumb-thickness') {
      const v = /^\d+(\.\d+)?$/.test(newVal?.trim()) ? `${newVal.trim()}px` : newVal
      this.style.setProperty('--m3e-overflow-thumb-thickness', v)
      this.update()
    } else if (name === 'thumb-gap') {
      const v = /^\d+(\.\d+)?$/.test(newVal?.trim()) ? `${newVal.trim()}px` : newVal
      this.style.setProperty('--m3e-overflow-thumb-gap', v)
      this.update()
    } else if (name === 'thumb-color') {
      this.style.setProperty('--m3e-overflow-thumb-color', newVal)
    } else if (name === 'track-color') {
      this.style.setProperty('--m3e-overflow-track-color', newVal)
    }
  }

  private _getComputedNumber(propName: string, fallback: number): number {
    const val = getComputedStyle(this).getPropertyValue(propName).trim()
    if (!val) return fallback
    const parsed = parseFloat(val)
    return isNaN(parsed) ? fallback : parsed
  }

  public update() {
    const target = this._target
    if (!target) return

    if (window.innerWidth < 768) {
      this.style.opacity = '0'
      this.style.pointerEvents = 'none'
      return
    }

    const thickness =
      this._getComputedNumber('--m3e-overflow-thickness', 0) ||
      this._getComputedNumber('--m3e-overflow-thumb-thickness', 0) ||
      this._getComputedNumber('--m3e-overflow-track-thickness', 8)
    const gap = this._getComputedNumber('--m3e-overflow-thumb-gap', 16)
    const minLength = this._getComputedNumber('--m3e-overflow-thumb-min-length', 36)
    const inset = this._getComputedNumber('--m3e-overflow-inset', 4)

    updateScrollbarGeometry({
      host: this,
      target,
      isHorizontal: this._direction === 'horizontal',
      lineStart: this._lineStart,
      lineEnd: this._lineEnd,
      thumb: this._thumb,
      thickness,
      gap,
      minLength,
      inset,
    })
  }

  private _onScroll() {
    if (!this._isDragging) {
      this.update()
    }
  }

  private _onPointerDown(e: PointerEvent) {
    if (!this._target) return
    e.preventDefault()
    e.stopPropagation()

    this._isDragging = true
    this._thumb.classList.add('dragging')
    this._thumb.setPointerCapture(e.pointerId)

    this._dragStartPointer = this._direction === 'horizontal' ? e.clientX : e.clientY
    this._dragStartScroll =
      this._direction === 'horizontal' ? this._target.scrollLeft : this._target.scrollTop

    window.addEventListener('pointermove', this._onPointerMove)
    window.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('pointercancel', this._onPointerUp)
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this._isDragging || !this._target) return

    const isH = this._direction === 'horizontal'
    const rect = this.getBoundingClientRect()
    const minLength = this._getComputedNumber('--m3e-overflow-thumb-min-length', 36)
    const inset = this._getComputedNumber('--m3e-overflow-inset', 4)

    if (isH) {
      const maxScroll = this._target.scrollWidth - this._target.clientWidth
      if (maxScroll <= 0) return
      const containerW = (this.parentElement as HTMLElement)?.clientWidth || this._target.clientWidth
      const W = rect.width > 0 ? rect.width : Math.max(0, containerW - inset * 2)
      const visibleRatio = Math.min(1, this._target.clientWidth / this._target.scrollWidth)
      const thumbWidth = Math.max(minLength, Math.min(W, visibleRatio * W))
      const availableTravel = W - thumbWidth
      if (availableTravel <= 0) return

      const delta = e.clientX - this._dragStartPointer
      this._target.scrollLeft = this._dragStartScroll + (delta / availableTravel) * maxScroll
    } else {
      const maxScroll = this._target.scrollHeight - this._target.clientHeight
      if (maxScroll <= 0) return
      const containerH = (this.parentElement as HTMLElement)?.clientHeight || this._target.clientHeight
      const H = rect.height > 0 ? rect.height : Math.max(0, containerH - inset * 2)
      const visibleRatio = Math.min(1, this._target.clientHeight / this._target.scrollHeight)
      const thumbHeight = Math.max(minLength, Math.min(H, visibleRatio * H))
      const availableTravel = H - thumbHeight
      if (availableTravel <= 0) return

      const delta = e.clientY - this._dragStartPointer
      this._target.scrollTop = this._dragStartScroll + (delta / availableTravel) * maxScroll
    }
    this.update()
  }

  private _onPointerUp(e: PointerEvent) {
    if (!this._isDragging) return
    this._isDragging = false
    this._thumb.classList.remove('dragging')
    try {
      this._thumb.releasePointerCapture(e.pointerId)
    } catch {
    }
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('pointercancel', this._onPointerUp)
  }

  private _onTrackClick(e: MouseEvent) {
    if (!this._target || e.target === this._thumb) return
    const isH = this._direction === 'horizontal'
    const rect = this.getBoundingClientRect()
    const minLength = this._getComputedNumber('--m3e-overflow-thumb-min-length', 36)
    const inset = this._getComputedNumber('--m3e-overflow-inset', 4)

    if (isH) {
      const clickX = e.clientX - rect.left
      const maxScroll = this._target.scrollWidth - this._target.clientWidth
      const containerW = (this.parentElement as HTMLElement)?.clientWidth || this._target.clientWidth
      const W = rect.width > 0 ? rect.width : Math.max(0, containerW - inset * 2)
      const visibleRatio = Math.min(1, this._target.clientWidth / this._target.scrollWidth)
      const thumbWidth = Math.max(minLength, Math.min(W, visibleRatio * W))
      const availableTravel = W - thumbWidth
      if (availableTravel <= 0) return

      const targetRatio = Math.max(0, Math.min(1, (clickX - thumbWidth / 2) / availableTravel))
      this._target.scrollLeft = targetRatio * maxScroll
    } else {
      const clickY = e.clientY - rect.top
      const maxScroll = this._target.scrollHeight - this._target.clientHeight
      const containerH = (this.parentElement as HTMLElement)?.clientHeight || this._target.clientHeight
      const H = rect.height > 0 ? rect.height : Math.max(0, containerH - inset * 2)
      const visibleRatio = Math.min(1, this._target.clientHeight / this._target.scrollHeight)
      const thumbHeight = Math.max(minLength, Math.min(H, visibleRatio * H))
      const availableTravel = H - thumbHeight
      if (availableTravel <= 0) return

      const targetRatio = Math.max(0, Math.min(1, (clickY - thumbHeight / 2) / availableTravel))
      this._target.scrollTop = targetRatio * maxScroll
    }
    this.update()
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('m3e-scrollbar')) {
  customElements.define('m3e-scrollbar', M3eScrollbarElement)
}

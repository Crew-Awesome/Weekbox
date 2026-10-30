import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@m3e/web/button'
import '@m3e/web/button-group'
import '@m3e/web/icon-button'
import '@m3e/web/progress-indicator'
import '@m3e/web/nav-bar'
import '@m3e/web/shape'
import '@m3e/web/switch'
import '@m3e/web/tooltip'
import '@m3e/web/search'
import '@m3e/web/list'
import '@m3e/web/callout'
import '@m3e/web/snackbar'
import '@m3e/web/menu'
import '@m3e/web/chips'
import '@m3e/web/card'
import '@m3e/web/slider'
import '@/ui/overflow'
import { registerCalloutDevTools } from '@/ui/callout'
import { ensureNeutralinoInit } from '@/core/host'
import { initSavedTheme } from '@/utils/theme'
import './index.css'
import App from './App.tsx'

interface M3eController {
  constructor: { name: string }
  lock?: () => void
  unlock?: () => void
}

interface M3eSearchViewElementInternal extends HTMLElement {
  currentMode?: string
  open?: boolean
  _handleFocusChange?: (focused: boolean) => void
  addController?: (controller: M3eController) => void
}

if (typeof customElements !== 'undefined') {
  const SearchView = customElements.get('m3e-search-view')
  if (SearchView?.prototype) {
    const proto = SearchView.prototype as M3eSearchViewElementInternal & {
      addController: (controller: M3eController) => void
    }

    const origAddController = proto.addController
    proto.addController = function (this: M3eSearchViewElementInternal, controller: M3eController) {
      if (
        controller &&
        (controller.constructor?.name === 'ScrollLockController' ||
          controller.constructor?.name === 'InertController')
      ) {
        controller.lock = () => {}
        controller.unlock = () => {}
      }
      return origAddController.call(this, controller)
    }

    proto._handleFocusChange = function (this: M3eSearchViewElementInternal, focused: boolean) {
      if (!focused && this.currentMode === 'docked') {
        this.open = false
      }
    }
  }
}

if (typeof localStorage !== 'undefined') {
  try {
    const savedEngine =
      localStorage.getItem('weekbox:instances:selected_engine') || 'psych'
    const savedVer =
      localStorage.getItem(
        `weekbox:instances:selected_version:${savedEngine}`,
      ) ||
      localStorage.getItem('weekbox:instances:selected_version') ||
      ''
    document.documentElement.setAttribute('data-engine', savedEngine)
    document.documentElement.setAttribute('data-version', savedVer)
    document.documentElement.dataset.engine = savedEngine
    document.documentElement.dataset.version = savedVer
  } catch {}
}

initSavedTheme()
registerCalloutDevTools()
ensureNeutralinoInit()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/**
 * Initializes and registers helpful console output for M3E Callout / Toast commands in DevTools.
 */
export function registerCalloutDevTools(): void {
  if (typeof window === 'undefined') return

  const isDark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const badgeStyle = `background: ${isDark ? '#6750A4' : '#6750A4'}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;`
  const codeStyle = 'font-weight: bold; color: #2196F3;'
  const descStyle = 'color: #888888;'

  console.groupCollapsed(
    '%c[M3E Callout / Toast]%c DevTools commands available in console',
    badgeStyle,
    'color: inherit; font-weight: bold;',
  )
  console.log(
    '%cwindow.callout.downloadDemo()%c - Simulates a live download with morphing M3 shapes & progress bar',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.demo()%c - Displays a sequential demo of all 5 M3E variants',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.secondary(message, title?, options?)%c - Secondary (default)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.primary(message, title?, options?)%c - Primary (strong emphasis)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.tertiary(message, title?, options?)%c - Tertiary (alternative emphasis)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.error(message, title?, options?)%c - Error (critical/urgent)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.surface(message, title?, options?)%c - Surface (neutral/blended)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.minimizeAll()%c - Minimizes all active callouts into compact bars',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.restoreAll()%c - Restores all active callouts to full size',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwindow.callout.dismissAll()%c - Clears all active callouts (with exit animation)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cTip:%c Drag cards right to cancel. Click arrow to minimize. Also %cwindow.toast%c works as an exact alias.',
    'font-style: italic;',
    '',
    codeStyle,
    '',
  )
  console.groupEnd()
}

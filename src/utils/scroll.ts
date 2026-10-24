/**
 * Finds the nearest scrollable ancestor or `m3e-overflow` custom element viewport for a DOM node.
 */
export function findScrollableParent(
  node: HTMLElement | null,
): HTMLElement | null {
  let current = node?.parentElement
  while (current) {
    const overflowHost = current as HTMLElement & { viewport?: HTMLElement }
    if (overflowHost.viewport) {
      return overflowHost.viewport
    }
    const computed = window.getComputedStyle(current)
    if (/(auto|scroll)/.test(computed.overflow + computed.overflowY)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

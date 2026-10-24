/**
 * Computes item width, horizontal offset, and visibility across continuous scroll progress.
 */
export function calculateVisuals(
  totalItems: number,
  p_continuous: number,
  isFinite: boolean = false,
  isMobile: boolean = false,
) {
  const layouts = new Array(totalItems)
  for (let i = 0; i < totalItems; i++) {
    layouts[i] = { w: 0, x: 100, display: 'none' }
  }

  if (totalItems === 0) return layouts

  if (totalItems === 1) {
    layouts[0] = { w: 100, x: 0, display: 'block' }
    return layouts
  }

  const mod = (n: number, m: number) => ((n % m) + m) % m

  let p = p_continuous
  if (isFinite) {
    p = Math.max(0, Math.min(totalItems - 1, p))
  }

  const p_lower = Math.floor(p)
  const fraction = p - p_lower

  // Mobile layout: 0% - 90% - 10% (Center active card 90%, right preview card 10%)
  if (isMobile) {
    let idxA: number, idxB: number, idxC: number, idxD: number
    if (isFinite) {
      idxA = p_lower - 1
      idxB = p_lower
      idxC = p_lower + 1
      idxD = p_lower + 2
    } else {
      idxA = mod(p_lower - 1, totalItems)
      idxB = mod(p_lower, totalItems)
      idxC = mod(p_lower + 1, totalItems)
      idxD = mod(p_lower + 2, totalItems)
    }

    // 1. Left item: off-screen
    if ((idxA >= 0 && idxA < totalItems) || !isFinite) {
      layouts[idxA] = { w: 0, x: 0, display: 'none' }
    }

    // 2. Active center card: shrinks from 90% down to 0% at left: 0%
    if ((idxB >= 0 && idxB < totalItems) || !isFinite) {
      const w = Math.max(0, 90 - 90 * fraction)
      const x = 0
      layouts[idxB] = { w, x, display: w > 0.1 ? 'block' : 'none' }
    }

    // 3. Right preview card: expands from 10% up to 90%, moves from left: 90% to left: 0%
    if ((idxC >= 0 && idxC < totalItems) || !isFinite) {
      const w = Math.min(90, 10 + 80 * fraction)
      const x = 90 - 90 * fraction
      layouts[idxC] = { w, x, display: w > 0.1 ? 'block' : 'none' }
    }

    // 4. Entering right card: expands from 0% up to 10%, moves from left: 100% to left: 90%
    if ((idxD >= 0 && idxD < totalItems) || !isFinite) {
      const w = Math.min(10, 10 * fraction)
      const x = 100 - 10 * fraction
      layouts[idxD] = { w, x, display: w > 0.1 ? 'block' : 'none' }
    }

    return layouts
  }

  // PC layout: 10% - 80% - 10% (3 cards visible, dynamically resizing)
  let idxA: number, idxB: number, idxC: number, idxD: number

  if (isFinite) {
    idxA = p_lower - 1
    idxB = p_lower
    idxC = p_lower + 1
    idxD = p_lower + 2
  } else {
    idxA = mod(p_lower - 1, totalItems)
    idxB = mod(p_lower, totalItems)
    idxC = mod(p_lower + 1, totalItems)
    idxD = mod(p_lower + 2, totalItems)
  }

  // 1. Left pill: shrinks from 10% down to 0% at left: 0%
  if ((idxA >= 0 && idxA < totalItems) || !isFinite) {
    const w = Math.max(0, 10 - 10 * fraction)
    const x = 0
    layouts[idxA] = { w, x, display: w > 0.1 ? 'block' : 'none' }
  }

  // 2. Active center card: shrinks from 80% down to 10%, moves from left: 10% to left: 0%
  if ((idxB >= 0 && idxB < totalItems) || !isFinite) {
    const w = Math.max(0, 80 - 70 * fraction)
    const x = 10 - 10 * fraction
    layouts[idxB] = { w, x, display: w > 0.1 ? 'block' : 'none' }
  }

  // 3. Right pill: expands from 10% up to 80%, moves from left: 90% to left: 10%
  if ((idxC >= 0 && idxC < totalItems) || !isFinite) {
    const w = Math.min(80, 10 + 70 * fraction)
    const x = 90 - 80 * fraction
    layouts[idxC] = { w, x, display: w > 0.1 ? 'block' : 'none' }
  }

  // 4. Entering right pill: expands from 0% up to 10%, moves from left: 100% to left: 90%
  if ((idxD >= 0 && idxD < totalItems) || !isFinite) {
    const w = Math.min(10, 10 * fraction)
    const x = 100 - 10 * fraction
    layouts[idxD] = { w, x, display: w > 0.1 ? 'block' : 'none' }
  }

  return layouts
}

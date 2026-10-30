export function getThumbnailNotchPath(
  w: number,
  h: number,
  nw = 72,
  nh = 72,
  r = 10,
  f = 10,
  cr = 16,
): string {
  if (w <= 0 || h <= 0) return ''
  const actualNw = Math.min(nw, w * 0.45)
  const actualNh = Math.min(nh, h * 0.48)
  const actualCr = Math.min(cr, w * 0.1, h * 0.1)

  return (
    `M ${actualNw + f} 0 ` +
    `L ${w - actualCr} 0 ` +
    `A ${actualCr} ${actualCr} 0 0 1 ${w} ${actualCr} ` +
    `L ${w} ${h} ` +
    `L 0 ${h} ` +
    `L 0 ${actualNh + f} ` +
    `A ${f} ${f} 0 0 1 ${f} ${actualNh} ` +
    `L ${actualNw - r} ${actualNh} ` +
    `A ${r} ${r} 0 0 0 ${actualNw} ${actualNh - r} ` +
    `L ${actualNw} ${f} ` +
    `A ${f} ${f} 0 0 1 ${actualNw + f} 0 Z`
  )
}

export function getCardNotchPath(
  w: number,
  h: number,
  nw = 72,
  nh = 72,
  r = 10,
  f = 10,
  cr = 16,
): string {
  if (w <= 0 || h <= 0) return ''
  const actualNw = Math.min(nw, w * 0.45)
  const actualNh = Math.min(nh, h * 0.48)
  const actualCr = Math.min(cr, w * 0.1, h * 0.1)

  return (
    `M ${actualNw + f} 0 ` +
    `L ${w - actualCr} 0 ` +
    `A ${actualCr} ${actualCr} 0 0 1 ${w} ${actualCr} ` +
    `L ${w} ${h - actualCr} ` +
    `A ${actualCr} ${actualCr} 0 0 1 ${w - actualCr} ${h} ` +
    `L ${actualCr} ${h} ` +
    `A ${actualCr} ${actualCr} 0 0 1 0 ${h - actualCr} ` +
    `L 0 ${actualNh + f} ` +
    `A ${f} ${f} 0 0 1 ${f} ${actualNh} ` +
    `L ${actualNw - r} ${actualNh} ` +
    `A ${r} ${r} 0 0 0 ${actualNw} ${actualNh - r} ` +
    `L ${actualNw} ${f} ` +
    `A ${f} ${f} 0 0 1 ${actualNw + f} 0 Z`
  )
}


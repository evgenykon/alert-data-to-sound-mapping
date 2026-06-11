export interface Point2D { x: number; y: number }

function sinc(x: number): number {
  if (Math.abs(x) < 1e-10) return 1
  return Math.sin(x) / x
}

export function aitoff(raDeg: number, decDeg: number): Point2D {
  const r = raDeg >= 180 ? raDeg - 360 : raDeg
  const a = (r * Math.PI) / 180
  const d = (decDeg * Math.PI) / 180
  const al = Math.acos(Math.cos(d) * Math.cos(a / 2))
  const s = sinc(al)
  return { x: (2 * Math.cos(d) * Math.sin(a / 2)) / s, y: Math.sin(d) / s }
}

export function raDecToScreen(raDeg: number, decDeg: number, w: number, h: number, margin = 40): Point2D {
  const p = aitoff(raDeg, decDeg)
  const aw = w - 2 * margin
  const ah = h - 2 * margin
  const scale = Math.min(aw / (2 * Math.PI), ah / Math.PI)
  return { x: w / 2 + p.x * scale, y: h / 2 - p.y * scale }
}

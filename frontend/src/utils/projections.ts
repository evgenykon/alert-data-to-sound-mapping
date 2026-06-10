export interface Point2D {
  x: number
  y: number
}

function sinc(x: number): number {
  if (Math.abs(x) < 1e-10) return 1
  return Math.sin(x) / x
}

export function aitoffProjection(raDeg: number, decDeg: number): Point2D {
  const ra = raDeg > 180 ? raDeg - 360 : raDeg
  const raRad = (ra * Math.PI) / 180
  const decRad = (decDeg * Math.PI) / 180

  const alpha = Math.acos(Math.cos(decRad) * Math.cos(raRad / 2))
  const s = sinc(alpha)

  const x = 2 * Math.cos(decRad) * Math.sin(raRad / 2) / s
  const y = Math.sin(decRad) / s

  return { x, y }
}

export function raDecToScreen(
  raDeg: number,
  decDeg: number,
  width: number,
  height: number,
  margin = 40,
): Point2D {
  const p = aitoffProjection(raDeg, decDeg)

  const aw = width - 2 * margin
  const ah = height - 2 * margin
  const scale = Math.min(aw / (2 * Math.PI), ah / Math.PI)

  const sx = width / 2 + p.x * scale
  const sy = height / 2 - p.y * scale

  return { x: sx, y: sy }
}

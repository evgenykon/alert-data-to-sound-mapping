export interface Point2D {
  x: number
  y: number
}

export function aitoffProjection(raDeg: number, decDeg: number): Point2D {
  const raRad = (raDeg * Math.PI) / 180
  const decRad = (decDeg * Math.PI) / 180

  const alpha = Math.acos(Math.cos(decRad) * Math.cos(raRad / 2))
  const denom = Math.sin(alpha)

  if (denom < 1e-10) {
    return { x: 0, y: 0 }
  }

  const x = (2 * Math.cos(decRad) * Math.sin(raRad / 2)) / denom * alpha
  const y = Math.sin(decRad) / denom * alpha

  return { x: x * 90, y: y * 90 }
}

export function raDecToScreen(
  raDeg: number,
  decDeg: number,
  width: number,
  height: number,
): Point2D {
  const p = aitoffProjection(raDeg, decDeg)

  const xScale = 0.45
  const yScale = 0.45

  const sx = width / 2 + p.x * (width / 2 / 180) / xScale
  const sy = height / 2 - p.y * (height / 2 / 90) / yScale

  return { x: sx, y: sy }
}

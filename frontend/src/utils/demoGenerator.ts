import type { Alert, AlertType } from '~/types/alert'

const TYPES: { type: AlertType; weight: number }[] = [
  { type: 'RR Lyrae', weight: 300 }, { type: 'AGN', weight: 200 }, { type: 'QSO', weight: 50 },
  { type: 'Mira', weight: 150 }, { type: 'LPV', weight: 50 }, { type: 'SN Ia', weight: 60 },
  { type: 'Cepheid', weight: 50 }, { type: 'SN II', weight: 45 }, { type: 'SN Ib', weight: 8 },
  { type: 'SN Ic', weight: 12 }, { type: 'TDE', weight: 1 }, { type: 'Kilonova', weight: 0.5 },
  { type: 'Unknown', weight: 73.5 },
]
const totalWt = TYPES.reduce((s, t) => s + t.weight, 0)

function randomType(): AlertType {
  let r = Math.random() * totalWt, a = 0
  for (const t of TYPES) { a += t.weight; if (r <= a) return t.type }
  return 'Unknown'
}

function randomDec(): number { return Math.asin(2 * Math.random() - 1) * (180 / Math.PI) }
function gauss(m: number, s: number): number { return m + s * (Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random())) }
function beta(a: number, b: number): number { const ga = -Math.log(1 - Math.pow(Math.random(), 1 / a)); return ga / (ga + -Math.log(1 - Math.pow(Math.random(), 1 / b))) }
let _c = 0

export function genAlert(): Alert {
  _c++
  return {
    alertId: `demo-${Date.now()}-${_c}`, ra: Math.random() * 360, dec: randomDec(),
    magnitude: Math.max(12, Math.min(22, gauss(16, 2))), type: randomType(),
    redshift: Math.random(), riseTime: Math.max(0.01, gauss(0.5, 0.3)),
    score: beta(2, 5), timestamp: Date.now() / 1000,
  }
}

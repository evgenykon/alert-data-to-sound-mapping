import type { Alert, AlertType } from '~/types/alert'

const TYPES: { type: AlertType; weight: number }[] = [
  { type: 'RR Lyrae', weight: 300 },
  { type: 'AGN', weight: 200 },
  { type: 'QSO', weight: 50 },
  { type: 'Mira', weight: 150 },
  { type: 'LPV', weight: 50 },
  { type: 'SN Ia', weight: 60 },
  { type: 'Cepheid', weight: 50 },
  { type: 'SN II', weight: 45 },
  { type: 'SN Ib', weight: 8 },
  { type: 'SN Ic', weight: 12 },
  { type: 'TDE', weight: 1 },
  { type: 'Kilonova', weight: 0.5 },
  { type: 'Unknown', weight: 73.5 },
]

const totalWeight = TYPES.reduce((s, t) => s + t.weight, 0)

function randomType(): AlertType {
  const r = Math.random() * totalWeight
  let acc = 0
  for (const t of TYPES) {
    acc += t.weight
    if (r <= acc) return t.type
  }
  return 'Unknown'
}

function randomDec(): number {
  return Math.asin(2 * Math.random() - 1) * (180 / Math.PI)
}

function randomMagnitude(): number {
  const u = Math.random()
  const sigma = 2
  const mu = 16
  const mag = mu + sigma * (Math.sqrt(-2 * Math.log(Math.max(u, 0.001))) * Math.cos(2 * Math.PI * Math.random()))
  return Math.max(12, Math.min(22, mag))
}

let counter = 0

export function generateDemoAlert(): Alert {
  counter++
  const mag = randomMagnitude()
  const z = Math.random()
  const score = sampleBeta(2, 5)

  return {
    alertId: `demo-${Date.now()}-${counter}`,
    ra: Math.random() * 360,
    dec: randomDec(),
    magnitude: mag,
    type: randomType(),
    redshift: z,
    riseTime: Math.max(0.01, gaussianRandom(0.5, 0.3)),
    score,
    timestamp: Date.now() / 1000,
  }
}

function sampleBeta(alpha: number, beta: number): number {
  const x = Math.random()
  const y = Math.random()
  const gammaA = -Math.log(1 - Math.pow(x, 1 / alpha))
  const gammaB = -Math.log(1 - Math.pow(y, 1 / beta))
  return gammaA / (gammaA + gammaB)
}

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

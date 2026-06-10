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
  return Math.max(12, Math.min(22, 16 + 2 * (Math.sqrt(-2 * Math.log(Math.max(u, 0.001))) * Math.cos(2 * Math.PI * Math.random()))))
}

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function sampleBeta(alpha: number, beta: number): number {
  const x = Math.random()
  return -Math.log(1 - Math.pow(x, 1 / alpha)) / (-Math.log(1 - Math.pow(x, 1 / alpha)) + -Math.log(1 - Math.pow(Math.random(), 1 / beta)))
}

let counter = 0

export function generateDemoAlert(): Alert {
  counter++
  return {
    alertId: `demo-${Date.now()}-${counter}`,
    ra: Math.random() * 360,
    dec: randomDec(),
    magnitude: randomMagnitude(),
    type: randomType(),
    redshift: Math.random(),
    riseTime: Math.max(0.01, gaussianRandom(0.5, 0.3)),
    score: sampleBeta(2, 5),
    timestamp: Date.now() / 1000,
  }
}

function getInterval(rate: number): number {
  if (rate <= 0) return -1
  const targetInterval = 1000 / rate
  const jitter = 0.3
  return targetInterval * (1 - jitter + Math.random() * jitter * 2)
}

let currentRate = 0.5

export function setDemoRate(rate: number) {
  currentRate = rate
}

export function getDemoRate(): number {
  return currentRate
}

export function generateDemoAlertWithRate(rate: number): { alert: Alert; intervalMs: number } | null {
  const interval = getInterval(rate)
  if (interval < 0) return null
  return { alert: generateDemoAlert(), intervalMs: interval }
}

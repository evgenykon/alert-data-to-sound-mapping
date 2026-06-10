import type { Alert, AlertType, AlertSource } from '../types.js'

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

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function sampleBeta(alpha: number, beta: number): number {
  const x = Math.random()
  const y = Math.random()
  const gammaA = -Math.log(1 - Math.pow(x, 1 / alpha))
  const gammaB = -Math.log(1 - Math.pow(y, 1 / beta))
  return gammaA / (gammaA + gammaB)
}

let counter = 0

function generateAlert(): Alert {
  counter++
  return {
    alertId: `demo-${Date.now()}-${counter}`,
    ra: Math.random() * 360,
    dec: randomDec(),
    magnitude: Math.max(12, Math.min(22, gaussianRandom(16, 2))),
    type: randomType(),
    redshift: Math.random(),
    riseTime: Math.max(0.01, gaussianRandom(0.5, 0.3)),
    score: sampleBeta(2, 5),
    timestamp: Date.now() / 1000,
  }
}

export function createDemoSource(): AlertSource {
  let timer: ReturnType<typeof setTimeout> | null = null
  let onAlert: ((a: Alert) => void) | null = null

  function emit() {
    if (onAlert) onAlert(generateAlert())
  }

  function schedule() {
    const isBurst = Math.random() < 0.05
    if (isBurst) {
      const count = 5 + Math.floor(Math.random() * 10)
      for (let i = 0; i < count; i++) {
        setTimeout(() => emit(), i * 100)
      }
    }
    const delay = -Math.log(Math.random()) * 2000
    timer = setTimeout(schedule, delay)
  }

  return {
    type: 'demo',
    start(cb) {
      onAlert = cb
      console.log('[DemoSource] started')
      schedule()
    },
    stop() {
      if (timer) clearTimeout(timer)
      timer = null
      onAlert = null
      console.log('[DemoSource] stopped')
    },
  }
}

import { Kafka } from 'kafkajs'
import type { Alert, AlertType } from './types.js'

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092'
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'lsst.alert'

const kafka = new Kafka({
  clientId: 'alert-sound-mapping-producer',
  brokers: [KAFKA_BROKER],
})

const producer = kafka.producer()

const TYPES: { type: AlertType; weight: number }[] = [
  { type: 'RR Lyrae', weight: 30 },
  { type: 'Cepheid', weight: 20 },
  { type: 'Mira', weight: 15 },
  { type: 'LPV', weight: 5 },
  { type: 'AGN', weight: 10 },
  { type: 'QSO', weight: 3 },
  { type: 'SN Ia', weight: 5 },
  { type: 'SN Ib', weight: 2 },
  { type: 'SN Ic', weight: 2 },
  { type: 'SN II', weight: 5 },
  { type: 'Kilonova', weight: 1 },
  { type: 'TDE', weight: 1 },
  { type: 'Unknown', weight: 1 },
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

let counter = 0

function generateAlert(): Alert {
  counter++
  return {
    alertId: `sim-${Date.now()}-${counter}`,
    ra: Math.random() * 360,
    dec: randomDec(),
    magnitude: Math.max(12, Math.min(22, gaussianRandom(16, 2))),
    type: randomType(),
    redshift: Math.random(),
    riseTime: Math.max(0.01, gaussianRandom(0.5, 0.3)),
    score: Math.random(),
    timestamp: Date.now() / 1000,
  }
}

async function main() {
  await producer.connect()
  console.log(`Producer connected to ${KAFKA_BROKER}`)

  function send() {
    const alert = generateAlert()
    producer.send({
      topic: KAFKA_TOPIC,
      messages: [{ key: alert.alertId, value: JSON.stringify(alert) }],
    }).catch(console.error)
  }

  function schedule() {
    send()
    const isBurst = Math.random() < 0.05
    if (isBurst) {
      const count = 5 + Math.floor(Math.random() * 10)
      for (let i = 0; i < count; i++) {
        setTimeout(() => send(), i * 100)
      }
    }
    const delay = -Math.log(Math.random()) * 2000
    setTimeout(schedule, delay)
  }

  schedule()
}

main().catch(console.error)

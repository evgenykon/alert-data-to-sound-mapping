import { Kafka } from 'kafkajs'
import type { Alert, AlertSource } from '../types.js'

function parseMjd(v: unknown): number {
  const n = Number(v)
  if (isNaN(n)) return Date.now()
  return n * 86400000
}

function mapLasairToAlert(raw: Record<string, unknown>): Alert | null {
  try {
    const alertId = String(
      raw.diaObjectId || raw.objectId || raw.alertId || ''
    )
    if (!alertId) return null

    const alert: Alert = {
      alertId,
      ra: Number(raw.ra ?? raw.RA ?? 0),
      dec: Number(raw.dec ?? raw.Dec ?? raw.DEC ?? 0),
      magnitude: Number(raw.gmag ?? raw.rmag ?? raw.psfFlux ?? raw.magpsf ?? raw.magnitude ?? raw.magnr ?? 99),
      type: String(raw['predicted classification'] ?? raw.classification ?? raw.type ?? 'Unknown'),
      redshift: Number(raw.redshift ?? raw.distnr ?? 0),
      riseTime: 0,
      score: Number(raw.score ?? raw.classtar ?? 0),
      timestamp: parseMjd(raw['latest detection'] ?? raw.midpointMjdTai ?? raw.jd ?? raw.timestamp),
    }
    return alert
  } catch {
    return null
  }
}

export function createLasairSource(config: {
  broker: string
  topic: string
  apiKey: string
}): AlertSource {
  let consumer: ReturnType<Kafka['consumer']> | null = null
  let running = false
  let onAlert: ((a: Alert) => void) | null = null

  const kafka = new Kafka({
    clientId: 'alert-sound-mapping-lasair',
    brokers: [config.broker],
  })

  return {
    type: 'lasair',
    async start(cb) {
      onAlert = cb
      running = true
      consumer = kafka.consumer({ groupId: 'alert-sound-mapping-lasair-group' })
      await consumer.connect()
      await consumer.subscribe({ topic: config.topic, fromBeginning: true })
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!running || !onAlert || !message.value) return
          try {
            const raw = JSON.parse(message.value.toString())
            const alerts = Array.isArray(raw) ? raw : [raw]
            for (const item of alerts) {
              const alert = mapLasairToAlert(item)
              if (alert) onAlert(alert)
            }
          } catch { /* skip malformed */ }
        },
      })
      console.log(`[LasairSource] connected to ${config.broker}, topic: ${config.topic}`)
    },
    async stop() {
      running = false
      if (consumer) {
        try { await consumer.disconnect() } catch { /* ignore */ }
        consumer = null
      }
      console.log('[LasairSource] stopped')
    },
  }
}

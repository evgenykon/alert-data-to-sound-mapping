import { Kafka } from 'kafkajs'
import type { Alert, AlertSource, AlertType } from '../types.js'

function parseAstroTime(v: unknown): number {
  const n = Number(v)
  if (isNaN(n)) return Date.now() / 1000
  // JD (~2460000) → Unix seconds
  if (n > 2400000) return (n - 2440587.5) * 86400
  // MJD (~60000) → Unix seconds
  return (n - 40587) * 86400
}

function mapLasairToAlert(raw: Record<string, unknown>): Alert | null {
  try {
    const alertId = String(
      raw.diaObjectId || raw.objectId || raw.alertId || ''
    )
    if (!alertId) return null

    // ZTF alert packets store data under "candidate"
    const cand = (raw.candidate as Record<string, unknown>) || raw

    const alert: Alert = {
      alertId,
      ra: Number(cand.ra ?? raw.ra ?? 0),
      dec: Number(cand.dec ?? raw.dec ?? 0),
      magnitude: Number(cand.magpsf ?? cand.magnr ?? raw.magnitude ?? 99),
      type: (raw['predicted classification'] ?? raw.classification ?? raw.type ?? 'Unknown') as AlertType,
      redshift: Number(raw.redshift ?? cand.distnr ?? 0),
      riseTime: 0,
      score: Number(cand.drb ?? cand.rb ?? cand.classtar ?? raw.score ?? 0),
      timestamp: parseAstroTime(cand.jd ?? cand.midpointMjdTai ?? raw['latest detection'] ?? raw.midpointMjdTai ?? raw.jd ?? raw.timestamp),
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
      const groupId = 'alert-sound-mapping-lasair-' + new Date().toISOString().slice(0, 10)
      consumer = kafka.consumer({ groupId })
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

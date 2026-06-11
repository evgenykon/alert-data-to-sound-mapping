import { Kafka, type SASLOptions } from 'kafkajs'
import type { Alert, AlertSource } from '../types.js'

function mapLasairToAlert(raw: Record<string, unknown>): Alert | null {
  try {
    const alert: Alert = {
      alertId: String(raw.objectId || raw.alertId || ''),
      ra: Number(raw.ra ?? 0),
      dec: Number(raw.dec ?? 0),
      magnitude: Number(raw.magpsf ?? raw.magnitude ?? raw.magnr ?? 99),
      type: 'Unknown',
      redshift: Number(raw.redshift ?? raw.distnr ?? 0),
      riseTime: 0,
      score: Number(raw.classtar ?? raw.score ?? 0),
      timestamp: Number(raw.jd ?? raw.timestamp ?? Date.now()),
    }
    if (!alert.alertId) return null
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

  const sasl: SASLOptions = {
    mechanism: 'plain',
    username: 'lasair',
    password: config.apiKey,
  }

  const kafka = new Kafka({
    clientId: 'alert-sound-mapping-lasair',
    brokers: [config.broker],
    sasl,
  })

  return {
    type: 'lasair',
    async start(cb) {
      onAlert = cb
      running = true
      try {
        consumer = kafka.consumer({ groupId: 'alert-sound-mapping-lasair-group' })
        await consumer.connect()
        await consumer.subscribe({ topic: config.topic, fromBeginning: false })
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
      } catch (err) {
        console.error('[LasairSource] connection failed:', err)
        running = false
      }
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

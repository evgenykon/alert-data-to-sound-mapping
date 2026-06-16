import { Kafka, type SASLOptions } from 'kafkajs'
import type { Alert, AlertSource, AlertType } from '../types.js'

const KNOWN_TYPES = new Set<string>([
  'RR Lyrae', 'Cepheid', 'Mira', 'LPV', 'AGN', 'QSO',
  'SN Ia', 'SN Ib', 'SN Ic', 'SN II', 'Kilonova', 'TDE',
  'VS', 'ORPHAN', 'CV', 'EB', 'YSO', 'Unknown',
])

function normalize(alert: Alert, raw: Record<string, unknown>): void {
  if (!KNOWN_TYPES.has(alert.type)) alert.type = 'Unknown' as AlertType
  if (alert.redshift === 0) alert.redshift = Number(raw.distnr ?? 0)
  if (alert.riseTime === 0) alert.riseTime = 0.5
  if (alert.score === 0) alert.score = Number(raw.classification_rel ?? 0)
  if (alert.ra !== 0 || alert.dec !== 0) return
  const cand = (raw.candidate as Record<string, unknown>) ?? raw
  alert.ra = Number(cand.ra ?? raw.ramean ?? 0)
  alert.dec = Number(cand.dec ?? raw.decmean ?? 0)
  if (alert.magnitude >= 90) alert.magnitude = Number(cand.magpsf ?? cand.magnr ?? raw.rmag ?? raw.gmag ?? alert.magnitude)
}

export function createKafkaSource(config: {
  broker: string
  topic: string
  user?: string
  pass?: string
}): AlertSource {
  let consumer: ReturnType<Kafka['consumer']> | null = null
  let running = false
  let onAlert: ((a: Alert) => void) | null = null

  const sasl: SASLOptions | undefined = config.user && config.pass
    ? { mechanism: 'scram-sha-512', username: config.user, password: config.pass }
    : undefined

  const kafka = new Kafka({
    clientId: 'alert-sound-mapping',
    brokers: [config.broker],
    sasl,
  })

  return {
    type: 'kafka',
    async start(cb) {
      onAlert = cb
      running = true
      try {
        consumer = kafka.consumer({ groupId: 'alert-sound-mapping-group' })
        await consumer.connect()
        await consumer.subscribe({ topic: config.topic, fromBeginning: false })

        await consumer.run({
          eachMessage: async ({ message }) => {
            if (!running || !onAlert || !message.value) return
            try {
              const raw = message.value.toString()
              const parsed = JSON.parse(raw) as Record<string, unknown>
              const alertId = String(parsed.alertId || parsed.diaObjectId || parsed.objectId || '')
              if (!alertId) return
              const ts = parsed.timestamp ?? (parsed._serverTs ? (parsed._serverTs as number) / 1000 : Date.now() / 1000)
              const alert: Alert = {
                alertId,
                ra: Number(parsed.ra ?? parsed.ramean ?? 0),
                dec: Number(parsed.dec ?? parsed.decmean ?? 0),
                magnitude: Number(parsed.rmag ?? parsed.gmag ?? parsed.magnitude ?? 99),
                type: (parsed.type ?? 'Unknown') as AlertType,
                redshift: Number(parsed.redshift ?? parsed.distnr ?? 0),
                riseTime: Number(parsed.riseTime ?? 0.5),
                score: Number(parsed.score ?? parsed.classification_rel ?? 0),
                timestamp: Number(ts),
              }
              normalize(alert, parsed)
              onAlert(alert)
            } catch { /* skip malformed */ }
          },
        })
        console.log(`[KafkaSource] connected to ${config.broker}, topic: ${config.topic}`)
      } catch (err) {
        console.error('[KafkaSource] connection failed:', err)
        running = false
      }
    },
    async stop() {
      running = false
      if (consumer) {
        try { await consumer.disconnect() } catch { /* ignore */ }
        consumer = null
      }
      console.log('[KafkaSource] stopped')
    },
  }
}

import { Kafka, type SASLOptions } from 'kafkajs'
import type { Alert, AlertSource } from '../types.js'

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
              const alert: Alert = JSON.parse(raw)
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

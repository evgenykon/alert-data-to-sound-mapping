import { Kafka } from 'kafkajs'
import { broadcast } from './server.js'

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092'
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'lsst.alert'
const KAFKA_USER = process.env.KAFKA_USER || ''
const KAFKA_PASS = process.env.KAFKA_PASS || ''

const kafka = new Kafka({
  clientId: 'alert-sound-mapping',
  brokers: [KAFKA_BROKER],
  ...(KAFKA_USER
    ? {
        sasl: {
          mechanism: 'scram-sha-256',
          username: KAFKA_USER,
          password: KAFKA_PASS,
        },
        ssl: true,
      }
    : {}),
})

const consumer = kafka.consumer({ groupId: 'alert-sound-mapping-group' })

export async function startConsumer() {
  try {
    await consumer.connect()
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false })

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return

        try {
          // TODO: Avro deserialization with avsc
          // For now, assume JSON payload or parse from Avro
          const raw = message.value.toString()
          const alert = JSON.parse(raw)
          broadcast(alert)
        } catch {
          // skip malformed
        }
      },
    })

    console.log(`Kafka consumer connected to ${KAFKA_BROKER}, topic: ${KAFKA_TOPIC}`)
    return true
  } catch (err) {
    console.error('Failed to connect Kafka consumer:', err)
    return false
  }
}

export async function stopConsumer() {
  try {
    await consumer.disconnect()
  } catch {
    // ignore
  }
}

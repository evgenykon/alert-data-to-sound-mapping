import { Kafka } from 'kafkajs'
import { createDemoSource } from './sources/demo.js'

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092'
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'lsst.alert'

const kafka = new Kafka({
  clientId: 'alert-sound-mapping-producer',
  brokers: [KAFKA_BROKER],
})

const producer = kafka.producer()

async function main() {
  await producer.connect()
  console.log(`Producer connected to ${KAFKA_BROKER}`)

  const source = createDemoSource()
  source.start(async (alert) => {
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [{ key: alert.alertId, value: JSON.stringify(alert) }],
    })
  })
}

main().catch(console.error)

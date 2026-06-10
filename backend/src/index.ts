import { startServer } from './server.js'
import { startConsumer, stopConsumer } from './consumer.js'
import { startGenerator } from './generator.js'

const PORT = parseInt(process.env.PORT || '3000', 10)

async function main() {
  startServer(PORT)

  if (process.env.KAFKA_BROKER) {
    const kafkaOk = await startConsumer()
    if (!kafkaOk) {
      console.log('Kafka unavailable, starting demo generator')
      startGenerator()
    }
  } else {
    console.log('No KAFKA_BROKER set, starting demo generator')
    startGenerator()
  }
}

process.on('SIGINT', async () => {
  await stopConsumer()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await stopConsumer()
  process.exit(0)
})

main()

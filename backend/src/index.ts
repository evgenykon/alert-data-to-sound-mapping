import { startServer } from './server.js'
import { startSource, stopSource } from './sourceManager.js'
import type { AlertSourceType } from './types.js'

const PORT = parseInt(process.env.PORT || '3000', 10)

async function main() {
  startServer(PORT)

  const sourceType = (process.env.ALERT_SOURCE as AlertSourceType) || 'demo'

  if (sourceType === 'kafka' && !process.env.KAFKA_BROKER) {
    console.log('KAFKA_BROKER not set, falling back to demo source')
    await startSource('demo')
    return
  }

  if (sourceType === 'lasair' && !process.env.LASAIR_API_KEY) {
    console.log('LASAIR_API_KEY not set, falling back to demo source')
    await startSource('demo')
    return
  }

  await startSource(sourceType)
}

process.on('SIGINT', async () => {
  stopSource()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  stopSource()
  process.exit(0)
})

main()

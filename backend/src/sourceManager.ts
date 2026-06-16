import type { Alert, AlertSource, AlertSourceType } from './types.js'
import { broadcast } from './server.js'

let currentSource: AlertSource | null = null

export async function startSource(type: AlertSourceType, customConfig?: Record<string, unknown>) {
  stopSource()

  async function emit(alert: Alert) {
    broadcast(alert)
  }

  if (type === 'demo') {
    const { createDemoSource } = await import('./sources/demo.js')
    currentSource = createDemoSource()
    currentSource.start(emit)
  } else if (type === 'kafka') {
    const { createKafkaSource } = await import('./sources/kafka.js')
    const cfg = (customConfig || {}) as Record<string, string | undefined>
    currentSource = createKafkaSource({
      broker: cfg.broker as string || process.env.KAFKA_BROKER || 'localhost:9092',
      topic: cfg.topic as string || process.env.KAFKA_TOPIC || 'lsst.alert',
      user: cfg.user as string || process.env.KAFKA_USER,
      pass: cfg.pass as string || process.env.KAFKA_PASS,
    })
    currentSource.start(emit)
  } else if (type === 'fink') {
    const { createFinkSource } = await import('./sources/fink.js')
    const cfg = (customConfig || {}) as Record<string, number | undefined>
    currentSource = createFinkSource({
      pollIntervalMs: cfg.pollIntervalMs as number || 30000,
      maxResults: cfg.maxResults as number || 10,
    })
    currentSource.start(emit)
  } else if (type === 'lasair') {
    const { createLasairSource } = await import('./sources/lasair.js')
    const cfg = (customConfig || {}) as Record<string, string | undefined>
    currentSource = createLasairSource({
      broker: cfg.broker as string || process.env.LASAIR_BROKER || 'lasair-ztf-kafka.lsst.ac.uk:9092',
      topic: cfg.topic as string || process.env.LASAIR_TOPIC || 'lasair_ztf',
      apiKey: cfg.apiKey as string || process.env.LASAIR_API_KEY || '',
      onCrash: () => {
        console.log('[sourceManager] lasair source crashed, falling back to demo')
        currentSource = null
        startSource('demo')
      },
    })
    try {
      await currentSource.start(emit)
      console.log(`[sourceManager] lasair source started`)
    } catch (err) {
      console.error(`[sourceManager] lasair source failed to start:`, err)
      console.log(`[sourceManager] falling back to demo source`)
      await startSource('demo')
    }
  } else {
    console.error('Unknown source type:', type)
  }
}

export function stopSource() {
  if (currentSource) {
    currentSource.stop()
    currentSource = null
  }
}

export function getSourceType(): AlertSourceType | null {
  return currentSource?.type ?? null
}

import { reactive } from 'vue'
import { playSound } from './useAudioEngine'
import { alertToAudioParams, isRareType } from '~/utils/mapping'
import { useAlertStore } from './useAlertStore'
import { useBenchmark } from './useBenchmark'
import type { Alert, AlertType, SonificationStrategy, SoundPaletteId } from '~/types/alert'

interface SonificationConfig {
  strategy: SonificationStrategy
  scoreThreshold: number
  samplingRate: number
  rateLimit: number
  grainsMode: boolean
  palette: SoundPaletteId
  enabledTypes: Set<AlertType>
}

const config = reactive<SonificationConfig>({
  strategy: 'aggregate',
  scoreThreshold: 0.3,
  samplingRate: 5,
  rateLimit: 50,
  grainsMode: false,
  palette: 'scientific',
  enabledTypes: new Set<AlertType>([
    'RR Lyrae', 'Cepheid', 'Mira', 'LPV', 'AGN', 'QSO',
    'SN Ia', 'SN Ib', 'SN Ic', 'SN II', 'Kilonova', 'TDE', 'Unknown',
  ]),
})

let sampleCounter = 0
const recentTimes: number[] = []
const SOUND_DURATION = 0.3
const GRAIN_DURATION = 0.03
const AGGREGATE_WINDOW = 0.5
const AGGREGATE_ANGLE = 5

let aggregateBuffer: Alert[] = []
let aggregateTimer: ReturnType<typeof setTimeout> | null = null

function shouldPlay(alert: Alert): boolean {
  if (!config.enabledTypes.has(alert.type)) return false

  switch (config.strategy) {
    case 'score-filter':
      return alert.score >= config.scoreThreshold
    case 'sampling':
      sampleCounter++
      return sampleCounter % config.samplingRate === 0
    case 'rate-limit': {
      const now = Date.now()
      const windowMs = 1000
      while (recentTimes.length && recentTimes[0] < now - windowMs) {
        recentTimes.shift()
      }
      if (recentTimes.length >= config.rateLimit) {
        if (!isRareType(alert.type)) return false
      }
      recentTimes.push(now)
      return true
    }
    case 'grains':
      return true
    case 'aggregate':
      return true
    default:
      return true
  }
}

function playSingle(alert: Alert) {
  const bm = useBenchmark()
  const params = alertToAudioParams(alert, config.palette)
  bm.markB(alert.alertId)
  const duration = config.grainsMode || config.strategy === 'grains' ? GRAIN_DURATION : SOUND_DURATION
  playSound({ ...params, duration })
  bm.markC(alert.alertId)
}

function flushAggregate() {
  if (!aggregateBuffer.length) return
  const meanAlert: Alert = {
    alertId: `agg-${Date.now()}`,
    ra: aggregateBuffer.reduce((s, a) => s + a.ra, 0) / aggregateBuffer.length,
    dec: aggregateBuffer.reduce((s, a) => s + a.dec, 0) / aggregateBuffer.length,
    magnitude: Math.max(...aggregateBuffer.map(a => a.magnitude)),
    type: aggregateBuffer.sort((a, b) => b.score - a.score)[0].type,
    redshift: aggregateBuffer.reduce((s, a) => s + a.redshift, 0) / aggregateBuffer.length,
    riseTime: Math.min(...aggregateBuffer.map(a => a.riseTime)),
    score: Math.max(...aggregateBuffer.map(a => a.score)),
    timestamp: Date.now() / 1000,
  }
  playSingle(meanAlert)
  aggregateBuffer = []
}

function processAlert(alert: Alert) {
  if (!shouldPlay(alert)) return

  const bm = useBenchmark()
  const sampleId = bm.markA(alert.alertId, alert.type)
  const store = useAlertStore()
  store.addAlert(alert)
  const decayTimer = setTimeout(() => store.markDecaying(alert.alertId), SOUND_DURATION * 1000)

  if (config.strategy === 'aggregate') {
    aggregateBuffer.push(alert)
    if (aggregateTimer) clearTimeout(aggregateTimer)
    aggregateTimer = setTimeout(flushAggregate, AGGREGATE_WINDOW * 1000)

    const last = aggregateBuffer[aggregateBuffer.length - 1]
    const dist = angularDistance(
      aggregateBuffer[0].ra, aggregateBuffer[0].dec,
      last.ra, last.dec,
    )
    if (dist > AGGREGATE_ANGLE) {
      flushAggregate()
    }
    return
  }

  playSingle(alert)
}

function angularDistance(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const dRa = ((ra1 - ra2) * Math.PI) / 180
  const dDec = ((dec1 - dec2) * Math.PI) / 180
  const a = Math.sin(dDec / 2) ** 2 +
    Math.cos((dec1 * Math.PI) / 180) * Math.cos((dec2 * Math.PI) / 180) * Math.sin(dRa / 2) ** 2
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * (180 / Math.PI)
}

function setStrategy(s: SonificationStrategy) {
  config.strategy = s
}

function setScoreThreshold(t: number) {
  config.scoreThreshold = t
}

function setSamplingRate(n: number) {
  config.samplingRate = n
}

function setRateLimit(n: number) {
  config.rateLimit = n
}

function setGrainsMode(v: boolean) {
  config.grainsMode = v
}

function toggleType(t: AlertType) {
  if (config.enabledTypes.has(t)) {
    config.enabledTypes.delete(t)
  } else {
    config.enabledTypes.add(t)
  }
}

function setPalette(id: SoundPaletteId) {
  config.palette = id
}

export function useSonification() {
  return {
    config,
    processAlert,
    setStrategy,
    setScoreThreshold,
    setSamplingRate,
    setRateLimit,
    setGrainsMode,
    toggleType,
    setPalette,
  }
}

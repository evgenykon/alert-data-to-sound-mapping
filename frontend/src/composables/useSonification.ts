import { reactive } from 'vue'
import { playSound } from './useAudioEngine'
import { alertToAudioParams } from '~/utils/mapping'
import { useAlertStore } from './useAlertStore'
import { useBenchmark } from './useBenchmark'
import type { Alert, AlertType, SonificationStrategy, SoundPaletteId } from '~/types/alert'

interface Config {
  strategy: SonificationStrategy; scoreThreshold: number; samplingRate: number
  rateLimit: number; grainsMode: boolean; palette: SoundPaletteId
  enabledTypes: Set<AlertType>
}

const config = reactive<Config>({
  strategy: 'aggregate', scoreThreshold: 0.3, samplingRate: 5, rateLimit: 50, grainsMode: false,
  palette: 'scientific',
  enabledTypes: new Set<AlertType>([
    'RR Lyrae', 'Cepheid', 'Mira', 'LPV', 'AGN', 'QSO', 'SN Ia', 'SN Ib', 'SN Ic', 'SN II', 'Kilonova', 'TDE', 'Unknown',
  ]),
})

let sampleCounter = 0
const rateTimes: number[] = []
const SOUND_DURATION = 0.3

function shouldPlay(alert: Alert): boolean {
  if (!config.enabledTypes.has(alert.type)) return false
  if (config.strategy === 'score-filter') return alert.score >= config.scoreThreshold
  if (config.strategy === 'sampling') { sampleCounter++; return sampleCounter % config.samplingRate === 0 }
  if (config.strategy === 'rate-limit') {
    const now = Date.now()
    while (rateTimes.length && rateTimes[0] < now - 1000) rateTimes.shift()
    if (rateTimes.length >= config.rateLimit) return false
    rateTimes.push(now)
    return true
  }
  return true
}

export function processAlert(alert: Alert) {
  if (!shouldPlay(alert)) return
  const bm = useBenchmark()
  const store = useAlertStore()
  const alertWithTs = alert as Alert & { _serverTs?: number }
  bm.markA(alert.alertId, alert.type, alertWithTs._serverTs)
  store.addAlert(alert)
  setTimeout(() => store.markDecaying(alert.alertId), SOUND_DURATION * 1000)
  const params = alertToAudioParams(alert, config.palette)
  bm.markB(alert.alertId)
  const duration = config.grainsMode || config.strategy === 'grains' ? 0.03 : SOUND_DURATION
  try {
    playSound({ ...params, duration })
  } finally {
    bm.markC(alert.alertId)
  }
}

export function useSonification() {
  return {
    config,
    processAlert,
    setStrategy: (s: SonificationStrategy) => { config.strategy = s },
    setScoreThreshold: (t: number) => { config.scoreThreshold = t },
    setSamplingRate: (n: number) => { config.samplingRate = n },
    setRateLimit: (n: number) => { config.rateLimit = n },
    setGrainsMode: (v: boolean) => { config.grainsMode = v },
    toggleType: (t: AlertType) => { if (config.enabledTypes.has(t)) config.enabledTypes.delete(t); else config.enabledTypes.add(t) },
    setPalette: (id: SoundPaletteId) => { config.palette = id },
  }
}

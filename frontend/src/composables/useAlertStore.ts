import { reactive } from 'vue'
import type { Alert, AlertState } from '~/types/alert'

const FADE_DURATION = 60_000
const CLEANUP_INTERVAL = 100
const LOG_KEEP = 600_000

const store = reactive({
  alerts: new Map<string, AlertState>(),
  recent: [] as AlertState[],
  hoveredId: null as string | null,
})

function addAlert(alert: Alert) {
  const state: AlertState = {
    ...alert,
    status: 'sounding',
    opacity: 1,
  }
  store.alerts.set(alert.alertId, state)
  store.recent.unshift(state)
}

function markDecaying(alertId: string) {
  const a = store.alerts.get(alertId)
  if (a) {
    a.status = 'decaying'
  }
}

function cleanup() {
  const cutoff = Date.now() - FADE_DURATION
  for (const [id, a] of store.alerts) {
    const ts = a.timestamp * 1000
    if (ts < cutoff) {
      store.alerts.delete(id)
    } else if (a.status === 'decaying') {
      a.opacity = Math.max(0, 1 - (Date.now() - ts) / FADE_DURATION)
    }
  }
  const logCutoff = Date.now() - LOG_KEEP
  for (let i = store.recent.length - 1; i >= 0; i--) {
    if (store.recent[i].timestamp * 1000 < logCutoff) {
      store.recent.splice(i, 1)
    }
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null
function startCleanup() {
  cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL)
}
function stopCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

function reset() {
  store.alerts.clear()
  store.recent = []
}

export function useAlertStore() {
  return {
    alerts: store.alerts,
    recentAlerts: store.recent,
    get hoveredId() { return store.hoveredId },
    addAlert,
    markDecaying,
    setHovered: (id: string | null) => { store.hoveredId = id },
    startCleanup,
    stopCleanup,
    reset,
  }
}

import type { Alert, AlertState } from '~/types/alert'

const FADE_DURATION = 60_000
const CLEANUP_INTERVAL = 5_000

const alerts = reactive(new Map<string, AlertState>())
const recentAlerts = ref<AlertState[]>([])

function addAlert(alert: Alert) {
  const state: AlertState = {
    ...alert,
    status: 'sounding',
    opacity: 1,
  }
  alerts.set(alert.alertId, state)
  recentAlerts.value.unshift(state)
  if (recentAlerts.value.length > 100) {
    recentAlerts.value.pop()
  }
}

function markDecaying(alertId: string) {
  const a = alerts.get(alertId)
  if (a) {
    a.status = 'decaying'
  }
}

function removeAlert(alertId: string) {
  alerts.delete(alertId)
}

function cleanup() {
  const now = Date.now()
  for (const [id, a] of alerts) {
    if (a.status === 'sounding') continue
    const elapsed = now - a.timestamp * 1000
    if (elapsed > FADE_DURATION) {
      alerts.delete(id)
    } else {
      a.opacity = Math.max(0, 1 - elapsed / FADE_DURATION)
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
  alerts.clear()
  recentAlerts.value = []
}

export function useAlertStore() {
  return {
    alerts: readonly(alerts),
    recentAlerts: readonly(recentAlerts),
    addAlert,
    markDecaying,
    removeAlert,
    startCleanup,
    stopCleanup,
    reset,
  }
}

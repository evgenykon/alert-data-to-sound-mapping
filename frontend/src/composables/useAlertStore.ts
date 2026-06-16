import { reactive, ref } from 'vue'
import type { Alert, AlertState } from '~/types/alert'

const CLEANUP_INTERVAL = 100
const flushIntervalMs = ref(250)
const logKeep = ref(600_000)
const clearKey = ref(0)

const store = reactive({
  alerts: new Map<string, AlertState>(),
  recent: [] as AlertState[],
  hoveredId: null as string | null,
  selectedId: null as string | null,
  alertVersion: 0,
})

function addAlert(alert: Alert) {
  const state: AlertState = { ...alert, status: 'sounding', opacity: 1 }
  store.alerts.set(alert.alertId, state)
  store.alertVersion++
  store.recent.unshift(state)
  if (store.recent.length > 500) store.recent.length = 500
}

function markDecaying(alertId: string) {
  const a = store.alerts.get(alertId)
  if (a) a.status = 'decaying'
}

function cleanup() {
  const r = _globalRate.value || 0.5
  const displayMs = r < 10 ? 60000 : r < 50 ? 10000 : 3000
  const cutoff = Date.now() - Math.max(displayMs, 5000)
  for (const [id, a] of store.alerts) {
    const ts = a.timestamp * 1000
    if (ts < cutoff) { store.alerts.delete(id); store.alertVersion++ }
    else if (a.status === 'decaying') { a.opacity = Math.max(0, 1 - (Date.now() - ts) / displayMs) }
  }
  const maxPoints = Math.max(50, Math.min(300, Math.round(r * 3)))
  if (store.alerts.size > maxPoints) {
    const sorted = Array.from(store.alerts.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)
    for (const [id] of sorted.slice(0, sorted.length - maxPoints)) { store.alerts.delete(id); store.alertVersion++ }
  }
  const logCutoff = Date.now() - logKeep.value
  for (let i = store.recent.length - 1; i >= 0; i--) {
    if (store.recent[i].timestamp * 1000 < logCutoff) store.recent.splice(i, 1)
  }
}

const _globalRate = ref(0.5)
export function setGlobalRate(r: number) { _globalRate.value = r }
export function getGlobalRate(): number { return _globalRate.value }

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function onVisibility() {
  if (document.hidden) {
    if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null }
  } else {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL)
  }
}

function startCleanup() {
  stopCleanup()
  cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL)
  document.addEventListener('visibilitychange', onVisibility)
}

function stopCleanup() {
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null }
  document.removeEventListener('visibilitychange', onVisibility)
}

function reset() { store.alerts.clear(); store.recent = []; store.alertVersion++; clearKey.value++ }

export function useAlertStore() {
  return {
    alerts: store.alerts, get recentAlerts() { return store.recent }, get hoveredId() { return store.hoveredId }, get selectedId() { return store.selectedId },
    clearKey, get alertVersion() { return store.alertVersion }, logKeep, flushIntervalMs, targetRate: _globalRate,
    setLogKeep: (s: number) => { logKeep.value = s * 1000 },
    setFlushInterval: (ms: number) => { flushIntervalMs.value = ms },
    addAlert, markDecaying,
    setHovered: (id: string | null) => { store.hoveredId = id },
    selectAlert: (id: string | null) => { store.selectedId = id },
    clearSelection: () => { store.selectedId = null },
    startCleanup, stopCleanup, reset,
  }
}

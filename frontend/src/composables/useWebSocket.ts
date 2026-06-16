import { reactive, ref } from 'vue'
import { useSonification } from './useSonification'
import { useBenchmark } from './useBenchmark'
import { setGlobalRate, getGlobalRate } from './useAlertStore'
import { genAlert } from '~/utils/demoGenerator'
import type { Alert, ConnectionStatus } from '~/types/alert'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const RECONNECT_INTERVAL = 1000
const MAX_RETRIES = 3
const TIMEOUT_MS = 5000

const DEFAULT_REMOTE = 'wss://evgenykon-alert-data-to-sound-mapping.hf.space'

const wsUrl = ref(WS_URL)
const state = reactive({ status: 'disconnected' as ConnectionStatus })
let ws: WebSocket | null = null
let retries = 0
let genAccum = 0, genLastTime = 0, genRafId = 0, demoActive = false

function processOne() {
  const alert = genAlert()
  const sonification = useSonification()
  sonification.processAlert(alert)
}

function genLoop(now: number) {
  if (!demoActive) return
  if (!genLastTime) genLastTime = now
  const elapsed = now - genLastTime
  genLastTime = now
  genAccum += elapsed * getGlobalRate() / 1000
  const maxPerFrame = Math.max(1, Math.min(10, Math.ceil(getGlobalRate() / 60)))
  let fired = 0
  while (genAccum >= 1 && fired < maxPerFrame) { genAccum -= 1; fired++; processOne() }
  if (genAccum > 10) genAccum = 10
  genRafId = requestAnimationFrame(genLoop)
}

function startDemo() {
  if (demoActive) return
  demoActive = true; genAccum = 0; genLastTime = 0
  state.status = 'demo'
  const bm = useBenchmark()
  bm.start()
  genRafId = requestAnimationFrame(genLoop)
}

function stopDemo() {
  demoActive = false
  if (genRafId) { cancelAnimationFrame(genRafId); genRafId = 0 }
  const bm = useBenchmark()
  bm.stop()
}

function setWsUrl(url: string) { wsUrl.value = url }

function connect() {
  if (ws) return
  state.status = 'connecting'; retries = 0
  doConnect()
}

function doConnect() {
  ws = new WebSocket(wsUrl.value)
  const timeout = setTimeout(() => { if (ws) { ws.close(); ws = null } handleDisconnect() }, TIMEOUT_MS)
  ws.onopen = () => { clearTimeout(timeout); retries = 0; state.status = 'connected'; stopDemo() }
  ws.onmessage = (event) => {
    try { const alert: Alert = JSON.parse(event.data); useSonification().processAlert(alert) } catch { /* skip */ }
  }
  ws.onclose = () => { clearTimeout(timeout); ws = null; handleDisconnect() }
  ws.onerror = () => ws?.close()
}

function handleDisconnect() {
  if (state.status === 'connected') state.status = 'disconnected'
  if (retries < MAX_RETRIES) { retries++; setTimeout(doConnect, RECONNECT_INTERVAL * retries) }
  else { startDemo() }
}

function disconnect() { if (ws) { ws.close(); ws = null } stopDemo(); state.status = 'disconnected'; retries = 0 }

export function useWebSocket() {
  return {
    status: state.status, connect, disconnect, startDemo, stopDemo,
    setRate: setGlobalRate, getRate: getGlobalRate,
    get wsUrl() { return wsUrl.value }, setWsUrl,
    remoteUrl: DEFAULT_REMOTE,
  }
}

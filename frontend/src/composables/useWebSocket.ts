import { ref, reactive } from 'vue'
import { useSonification } from './useSonification'
import { useBenchmark } from './useBenchmark'
import { generateDemoAlertWithRate, getDemoRate, setDemoRate } from '~/utils/demoGenerator'
import type { Alert, ConnectionStatus } from '~/types/alert'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const RECONNECT_INTERVAL = 1000
const MAX_RETRIES = 3
const TIMEOUT_MS = 5000

const state = reactive({
  status: 'disconnected' as ConnectionStatus,
})

let ws: WebSocket | null = null
let retries = 0
let demoInterval: ReturnType<typeof setTimeout> | null = null

function startDemo() {
  state.status = 'demo'
  const sonification = useSonification()
  const bm = useBenchmark()
  bm.startBenchmark()

  function emitOne() {
    const result = generateDemoAlertWithRate(getDemoRate())
    if (!result) return
    sonification.processAlert(result.alert)
    scheduleNext()
  }

  function scheduleNext() {
    const result = generateDemoAlertWithRate(getDemoRate())
    if (!result) return
    const isBurst = Math.random() < 0.03
    if (isBurst) {
      const count = 3 + Math.floor(Math.random() * 5)
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const r = generateDemoAlertWithRate(getDemoRate())
          if (r) sonification.processAlert(r.alert)
        }, i * Math.max(10, result.intervalMs / count))
      }
    }
    demoInterval = setTimeout(emitOne, result.intervalMs)
  }

  scheduleNext()
}

function stopDemo() {
  const bm = useBenchmark()
  bm.stopBenchmark()
  if (demoInterval) {
    clearInterval(demoInterval)
    demoInterval = null
  }
}

function connect() {
  if (ws) return
  state.status = 'connecting'
  retries = 0
  doConnect()
}

function doConnect() {
  ws = new WebSocket(WS_URL)
  const timeout = setTimeout(() => {
    if (ws) { ws.close(); ws = null }
    handleDisconnect()
  }, TIMEOUT_MS)

  ws.onopen = () => {
    clearTimeout(timeout)
    retries = 0
    state.status = 'connected'
    stopDemo()
  }

  ws.onmessage = (event) => {
    try {
      const alert: Alert = JSON.parse(event.data)
      const sonification = useSonification()
      sonification.processAlert(alert)
    } catch { /* ignore */ }
  }

  ws.onclose = () => {
    clearTimeout(timeout)
    ws = null
    handleDisconnect()
  }

  ws.onerror = () => ws?.close()
}

function handleDisconnect() {
  if (state.status === 'connected') state.status = 'disconnected'
  if (retries < MAX_RETRIES) {
    retries++
    setTimeout(doConnect, RECONNECT_INTERVAL * retries)
  } else {
    startDemo()
  }
}

function disconnect() {
  if (ws) { ws.close(); ws = null }
  stopDemo()
  state.status = 'disconnected'
  retries = 0
}

export function useWebSocket() {
  return {
    status: state.status,
    connect,
    disconnect,
    startDemo,
    stopDemo,
    setDemoRate,
    getDemoRate,
  }
}

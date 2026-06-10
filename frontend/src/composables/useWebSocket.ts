import { ref, reactive } from 'vue'
import { useSonification } from './useSonification'
import { generateDemoAlert } from '~/utils/demoGenerator'
import type { Alert, ConnectionStatus } from '~/types/alert'

const WS_URL = import.meta.env.NUXT_PUBLIC_WS_URL || 'wss://evgenykon-alert-sound-mapping.hf.space'
const RECONNECT_INTERVAL = 1000
const MAX_RETRIES = 3
const TIMEOUT_MS = 5000

const state = reactive({
  status: 'disconnected' as ConnectionStatus,
})

let ws: WebSocket | null = null
let retries = 0
let demoInterval: ReturnType<typeof setInterval> | null = null

function startDemo() {
  state.status = 'demo'
  const sonification = useSonification()

  function emitDemoAlert() {
    const alert = generateDemoAlert()
    sonification.processAlert(alert)
  }

  function scheduleNext() {
    const isBurst = Math.random() < 0.05
    if (isBurst) {
      const count = 5 + Math.floor(Math.random() * 10)
      for (let i = 0; i < count; i++) {
        setTimeout(() => emitDemoAlert(), i * 100)
      }
    }
    const interval = -Math.log(Math.random()) * 2000
    demoInterval = setTimeout(() => {
      emitDemoAlert()
      scheduleNext()
    }, interval)
  }

  scheduleNext()
}

function stopDemo() {
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
    if (ws) {
      ws.close()
      ws = null
    }
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
    } catch {
      // ignore malformed messages
    }
  }

  ws.onclose = () => {
    clearTimeout(timeout)
    ws = null
    handleDisconnect()
  }

  ws.onerror = () => {
    ws?.close()
  }
}

function handleDisconnect() {
  if (state.status === 'connected') {
    state.status = 'disconnected'
  }
  if (retries < MAX_RETRIES) {
    retries++
    setTimeout(doConnect, RECONNECT_INTERVAL * retries)
  } else {
    startDemo()
  }
}

function disconnect() {
  if (ws) {
    ws.close()
    ws = null
  }
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
  }
}

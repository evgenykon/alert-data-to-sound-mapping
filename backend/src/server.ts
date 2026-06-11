import { WebSocketServer, WebSocket } from 'ws'
import type { Alert } from './types.js'

const ALLOWED_ORIGINS = [
  'https://evgenykon.github.io',
  'http://localhost:3001',
  'http://localhost:3000',
  'https://evgenykon-alert-data-to-sound-mapping.hf.space',
]

let wss: WebSocketServer

export function startServer(port = 3000) {
  wss = new WebSocketServer({
    port,
    verifyClient: (info, cb) => {
      const origin = info.origin || info.req.headers['origin'] as string || ''
      const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || !origin
      if (!allowed) {
        console.log(`[WS] Rejected connection from origin: ${origin}`)
        cb(false, 403, 'Forbidden')
        return
      }
      cb(true)
    },
  })

  wss.on('listening', () => {
    console.log(`WebSocket server listening on ws://0.0.0.0:${port}`)
  })

  wss.on('connection', (ws, req) => {
    const origin = req.headers['origin'] || 'unknown'
    console.log(`Client connected from: ${origin}`)

    ws.on('close', () => {
      console.log('Client disconnected')
    })
  })
}

export function broadcast(alert: Alert) {
  if (!wss) return
  const msg = JSON.stringify({ ...alert, _serverTs: Date.now() })
  let count = 0
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
      count++
    }
  })
  if (count > 0) {
    console.log(`Broadcast alert ${alert.alertId} to ${count} client(s)`)
  }
}

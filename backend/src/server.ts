import { WebSocketServer, WebSocket } from 'ws'
import type { Alert } from './types.js'

let wss: WebSocketServer

export function startServer(port = 3000) {
  wss = new WebSocketServer({ port })

  wss.on('listening', () => {
    console.log(`WebSocket server listening on ws://0.0.0.0:${port}`)
  })

  wss.on('connection', (ws) => {
    console.log('Client connected')

    ws.on('close', () => {
      console.log('Client disconnected')
    })
  })
}

export function broadcast(alert: Alert) {
  if (!wss) return
  const msg = JSON.stringify(alert)
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

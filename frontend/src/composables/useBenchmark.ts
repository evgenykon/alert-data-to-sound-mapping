import { ref } from 'vue'
import type { AlertType } from '~/types/alert'

const MAX_SAMP = 10000
const STALE_TIMEOUT = 5000
const SAMPLES: any[] = []
const PENDING = new Map<string, { tA: number; tB: number; type: AlertType; transportLatency?: number }>()

const fps = ref(0)
const rate = ref(0)
const avgLatency = ref(0)
const p95Latency = ref(0)
const maxLatency = ref(0)
const jitter = ref(0)
const sampleCount = ref(0)
const audioCtxState = ref('')
const audioBaseLatency = ref(0)
const frameTime = ref(0)

let frameCnt = 0, lastFps = performance.now(), lastRate = performance.now(), rateCnt = 0, animId = 0
let lastFrameTime = performance.now()

function staleCleanup() {
  const cutoff = performance.now() - STALE_TIMEOUT
  for (const [id, p] of PENDING) {
    if (p.tA < cutoff) PENDING.delete(id)
  }
}

function markA(id: string, type: AlertType, serverTs?: number): string {
  staleCleanup()
  const transportLatency = serverTs ? Date.now() - serverTs : undefined
  const tA = serverTs ? Math.max(performance.now() - (Date.now() - serverTs), performance.now() - STALE_TIMEOUT) : performance.now()
  PENDING.set(id, { tA, tB: 0, type, transportLatency })
  return id
}

function markB(id: string) { const p = PENDING.get(id); if (p) p.tB = performance.now() }

function markC(id: string) {
  const p = PENDING.get(id); if (!p || !p.tB) return
  const tC = performance.now()
  SAMPLES.unshift({
    alertId: id, tA: p.tA, tB: p.tB, tC, type: p.type,
    latencyMap: p.tB - p.tA, latencyAudio: tC - p.tB, totalLatency: tC - p.tA,
    transportLatency: p.transportLatency,
  })
  if (SAMPLES.length > MAX_SAMP) SAMPLES.pop()
  sampleCount.value = SAMPLES.length; rateCnt++; PENDING.delete(id)
}

function tick() {
  const now = performance.now()
  frameTime.value = now - lastFrameTime
  lastFrameTime = now

  if (now - lastFps >= 500) { fps.value = Math.round(frameCnt * 1000 / (now - lastFps)); frameCnt = 0; lastFps = now }
  if (now - lastRate >= 500) { rate.value = Math.round(rateCnt * 1000 / (now - lastRate)); rateCnt = 0; lastRate = now }
  frameCnt++

  if (SAMPLES.length) {
    const latencies = SAMPLES.map((s: any) => s.totalLatency)
    const total = latencies.reduce((s: number, v: number) => s + v, 0)
    avgLatency.value = +(total / latencies.length).toFixed(3)
    const sorted = [...latencies].sort((a: number, b: number) => a - b)
    p95Latency.value = +(sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)]).toFixed(3)
    maxLatency.value = +(sorted[sorted.length - 1]).toFixed(3)
    const mean = total / latencies.length
    const variance = latencies.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / latencies.length
    jitter.value = +Math.sqrt(variance).toFixed(3)
  }

  const ctx = (window as any).__audioCtx
  if (ctx) {
    audioCtxState.value = ctx.state
    audioBaseLatency.value = +(ctx.baseLatency * 1000).toFixed(2)
  }

  animId = requestAnimationFrame(tick)
}

function start() {
  if (animId) cancelAnimationFrame(animId)
  frameCnt = 0; rateCnt = 0
  lastFps = performance.now(); lastRate = performance.now(); lastFrameTime = performance.now()
  animId = requestAnimationFrame(tick)
}

function stop() { if (animId) { cancelAnimationFrame(animId); animId = 0 } }
function resetSamples() { SAMPLES.length = 0; PENDING.clear(); sampleCount.value = 0 }
function getSamples() { return SAMPLES }

export function useBenchmark() {
  return {
    fps, rate, avgLatency, p95Latency, maxLatency, jitter, sampleCount, frameTime,
    audioCtxState, audioBaseLatency,
    markA, markB, markC, start, stop, resetSamples, getSamples,
  }
}

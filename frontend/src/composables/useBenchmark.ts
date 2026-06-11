import { ref } from 'vue'
import type { AlertType } from '~/types/alert'

const MAX_SAMP = 10000
const SAMPLES: any[] = []
const PENDING = new Map<string, { tA: number; tB: number; type: AlertType }>()

const fps = ref(0)
const rate = ref(0)
const avgLatency = ref(0)
const p95Latency = ref(0)
const sampleCount = ref(0)

let frameCnt = 0, lastFps = performance.now(), lastRate = performance.now(), rateCnt = 0, animId = 0

function markA(id: string, type: AlertType): string { PENDING.set(id, { tA: performance.now(), tB: 0, type }); return id }
function markB(id: string) { const p = PENDING.get(id); if (p) p.tB = performance.now() }

function markC(id: string) {
  const p = PENDING.get(id); if (!p || !p.tB) return
  const tC = performance.now()
  SAMPLES.unshift({ alertId: id, tA: p.tA, tB: p.tB, tC, type: p.type, latencyMap: p.tB - p.tA, latencyAudio: tC - p.tB, totalLatency: tC - p.tA })
  if (SAMPLES.length > MAX_SAMP) SAMPLES.pop()
  sampleCount.value = SAMPLES.length; rateCnt++; PENDING.delete(id)
}

function tick() {
  const now = performance.now()
  if (now - lastFps >= 500) { fps.value = Math.round(frameCnt * 1000 / (now - lastFps)); frameCnt = 0; lastFps = now }
  if (now - lastRate >= 500) { rate.value = Math.round(rateCnt * 1000 / (now - lastRate)); rateCnt = 0; lastRate = now }
  frameCnt++
  if (SAMPLES.length) {
    const total = SAMPLES.reduce((s: number, sm: any) => s + sm.totalLatency, 0)
    avgLatency.value = +(total / SAMPLES.length).toFixed(3)
    const sorted = [...SAMPLES].sort((a: any, b: any) => a.totalLatency - b.totalLatency)
    p95Latency.value = +(sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)].totalLatency).toFixed(3)
  }
  animId = requestAnimationFrame(tick)
}

function start() { if (animId) cancelAnimationFrame(animId); frameCnt = 0; rateCnt = 0; lastFps = performance.now(); lastRate = performance.now(); animId = requestAnimationFrame(tick) }
function stop() { if (animId) { cancelAnimationFrame(animId); animId = 0 } }
function resetSamples() { SAMPLES.length = 0; PENDING.clear(); sampleCount.value = 0 }
function getSamples() { return SAMPLES }

export function useBenchmark() {
  return { fps, rate, avgLatency, p95Latency, sampleCount, markA, markB, markC, start, stop, resetSamples, getSamples }
}

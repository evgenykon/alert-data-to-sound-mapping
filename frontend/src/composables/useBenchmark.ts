import { ref } from 'vue'
import type { AlertType } from '~/types/alert'

export interface BenchmarkSample {
  alertId: string
  tA: number
  tB: number
  tC: number
  type: AlertType
  latencyMap: number
  latencyAudio: number
  totalLatency: number
}

const MAX_SAMPLES = 10_000
const FPS_WINDOW = 500

const samples = ref<BenchmarkSample[]>([])
const fps = ref(0)
const rate = ref(0)
const avgLatency = ref(0)
const p95Latency = ref(0)
const sampleCount = ref(0)

let frameCount = 0
let lastFpsTime = performance.now()
let lastRateTime = performance.now()
let rateCount = 0
let animId = 0

const pending = new Map<string, { tA: number; tB: number; type: AlertType }>()

function markA(alertId: string, type: AlertType): string {
  pending.set(alertId, { tA: performance.now(), tB: 0, type })
  return alertId
}

function markB(sampleId: string) {
  const p = pending.get(sampleId)
  if (!p) return
  p.tB = performance.now()
}

function markC(sampleId: string) {
  const p = pending.get(sampleId)
  if (!p || !p.tB) return
  const tC = performance.now()
  const sample: BenchmarkSample = {
    alertId: sampleId,
    tA: p.tA,
    tB: p.tB,
    tC,
    type: p.type,
    latencyMap: p.tB - p.tA,
    latencyAudio: tC - p.tB,
    totalLatency: tC - p.tA,
  }
  pending.delete(sampleId)
  samples.value.unshift(sample)
  if (samples.value.length > MAX_SAMPLES) samples.value.pop()
  sampleCount.value = samples.value.length
  rateCount++
}

function tick() {
  const now = performance.now()
  if (now - lastFpsTime >= FPS_WINDOW) {
    fps.value = Math.round(frameCount * 1000 / (now - lastFpsTime))
    frameCount = 0
    lastFpsTime = now
  }
  if (now - lastRateTime >= FPS_WINDOW) {
    rate.value = Math.round(rateCount * 1000 / (now - lastRateTime))
    rateCount = 0
    lastRateTime = now
  }
  frameCount++

  if (samples.value.length > 0) {
    const total = samples.value.reduce((s, sm) => s + sm.totalLatency, 0)
    avgLatency.value = +(total / samples.value.length).toFixed(3)
    const sorted = [...samples.value].sort((a, b) => a.totalLatency - b.totalLatency)
    const idx = Math.floor(sorted.length * 0.95)
    p95Latency.value = +(sorted[Math.min(idx, sorted.length - 1)].totalLatency).toFixed(3)
  }

  animId = requestAnimationFrame(tick)
}

function startBenchmark() {
  if (animId) cancelAnimationFrame(animId)
  frameCount = 0
  rateCount = 0
  lastFpsTime = performance.now()
  lastRateTime = performance.now()
  animId = requestAnimationFrame(tick)
}

function stopBenchmark() {
  if (animId) {
    cancelAnimationFrame(animId)
    animId = 0
  }
}

function resetSamples() {
  samples.value = []
  pending.clear()
  sampleCount.value = 0
}

function getSamples(): BenchmarkSample[] {
  return samples.value
}

export function useBenchmark() {
  return {
    fps, rate, avgLatency, p95Latency, sampleCount,
    markA, markB, markC,
    startBenchmark, stopBenchmark, resetSamples, getSamples,
  }
}

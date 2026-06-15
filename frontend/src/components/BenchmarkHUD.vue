<script setup lang="ts">
import { ref, computed, unref } from 'vue'
import { useBenchmark } from '~/composables/useBenchmark'
import { useAlertStore } from '~/composables/useAlertStore'
import { downloadCSV } from '~/utils/benchmarkExport'

const bm = useBenchmark()
const store = useAlertStore()
const collapsed = ref(false)
const hasSamples = computed(() => bm.sampleCount.value > 0)
const frameMs = computed(() => bm.frameTime.value.toFixed(1))
const audioRunning = computed(() => unref(bm.audioCtxState) === 'running')
</script>

<template>
  <div v-if="collapsed" class="benchmark-pill" @click="collapsed = false">
    <span class="pill-fps">{{ bm.fps }} FPS</span>
    <span class="pill-avg">{{ bm.avgLatency }}ms</span>
    <span class="pill-expand">▸</span>
  </div>
  <div v-else class="benchmark-hud">
    <div class="hud-header" @click="collapsed = true">
      <span class="hud-title">Benchmark</span>
      <span class="hud-fold">▾</span>
    </div>
    <div class="hud-row"><span class="hud-label">FPS</span><span class="hud-value">{{ bm.fps }}</span></div>
    <div class="hud-row"><span class="hud-label">Frame</span><span class="hud-value">{{ frameMs }}ms</span></div>
    <div class="hud-row"><span class="hud-label">Rate</span><span class="hud-value">{{ bm.rate }} / {{ store.targetRate }} ev/s</span></div>
    <div class="hud-row"><span class="hud-label">Batch</span><span class="hud-value">{{ store.flushIntervalMs }}ms</span></div>
    <div class="hud-divider" />
    <div class="hud-row"><span class="hud-label">Avg</span><span class="hud-value">{{ bm.avgLatency }} ms</span></div>
    <div class="hud-row"><span class="hud-label">p95</span><span class="hud-value">{{ bm.p95Latency }} ms</span></div>
    <div class="hud-row"><span class="hud-label">Max</span><span class="hud-value">{{ bm.maxLatency }} ms</span></div>
    <div class="hud-row"><span class="hud-label">Jitter</span><span class="hud-value">{{ bm.jitter }} ms</span></div>
    <div class="hud-divider" />
    <div class="hud-row"><span class="hud-label">Audio</span><span class="hud-value hud-audio" :class="{ 'hud-warn': !audioRunning }">{{ bm.audioCtxState }}</span></div>
    <div class="hud-row"><span class="hud-label">BaseLat</span><span class="hud-value">{{ bm.audioBaseLatency }}ms</span></div>
    <div class="hud-sml">{{ bm.sampleCount }} samples</div>
    <button v-if="hasSamples" class="hud-csv" @click="downloadCSV(bm.getSamples())">Download CSV</button>
  </div>
</template>

<style scoped>
.benchmark-hud {
  position: fixed; top: 60px; left: 8px; z-index: 200;
  background: rgba(3,7,18,.82); border: 1px solid #374151; border-radius: 4px;
  padding: 8px 12px; font-family: monospace; font-size: 11px; line-height: 1.6;
  min-width: 150px; pointer-events: auto;
}
.hud-row { display: flex; justify-content: space-between; gap: 10px; }
.hud-label { color: #6b7280; }
.hud-value { color: #e5e7eb; text-align: right; }
.hud-audio { text-transform: uppercase; font-size: 10px; }
.hud-warn { color: #f59e0b; }
.hud-divider { border-top: 1px solid #374151; margin: 3px 0; }
.hud-sml { color: #4b5563; font-size: 10px; text-align: center; margin-top: 2px; }
.hud-csv {
  margin-top: 4px; width: 100%; font-size: 10px; padding: 2px 6px;
  border: 1px solid #374151; border-radius: 2px; background: #1f2937;
  color: #9ca3af; cursor: pointer; text-align: center;
}
.hud-csv:hover { background: #374151; color: #e5e7eb; }

.benchmark-pill {
  position: fixed; top: 60px; left: 8px; z-index: 200;
  display: flex; align-items: center; gap: 6px;
  background: rgba(3,7,18,.82); border: 1px solid #374151; border-radius: 4px;
  padding: 3px 8px; font-family: monospace; font-size: 10px; cursor: pointer;
  pointer-events: auto;
}
.pill-fps { color: #9ca3af; }
.pill-avg { color: #e5e7eb; }
.pill-expand { color: #6b7280; font-size: 9px; margin-left: 2px; }
.benchmark-pill:hover { border-color: #6b7280; }

.hud-header {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; margin-bottom: 2px; user-select: none;
}
.hud-title { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
.hud-fold { color: #4b5563; font-size: 9px; }
.hud-header:hover .hud-fold { color: #9ca3af; }
</style>

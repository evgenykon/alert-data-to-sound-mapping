<script setup lang="ts">
import { computed } from 'vue'
import { useBenchmark } from '~/composables/useBenchmark'
import { downloadBenchmarkCSV } from '~/utils/benchmarkExport'

const bm = useBenchmark()
const hasSamples = computed(() => bm.sampleCount.value > 0)
</script>

<template>
  <div class="benchmark-hud">
    <div class="hud-row"><span class="hud-label">FPS</span><span class="hud-value">{{ bm.fps }}</span></div>
    <div class="hud-row"><span class="hud-label">Rate</span><span class="hud-value">{{ bm.rate }} ev/s</span></div>
    <div class="hud-row"><span class="hud-label">Lat</span><span class="hud-value">{{ bm.avgLatency }} ms</span></div>
    <div class="hud-row"><span class="hud-label">p95</span><span class="hud-value">{{ bm.p95Latency }} ms</span></div>
    <div class="hud-row hud-samples">{{ bm.sampleCount }} samples</div>
    <button
      v-if="hasSamples"
      class="hud-csv"
      @click="downloadBenchmarkCSV(bm.getSamples())"
    >Download CSV</button>
  </div>
</template>

<style scoped>
.benchmark-hud {
  position: fixed;
  bottom: 8px;
  right: 8px;
  z-index: 200;
  background: rgba(3, 7, 18, 0.82);
  border: 1px solid #374151;
  border-radius: 4px;
  padding: 8px 12px;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.5;
  pointer-events: auto;
  min-width: 150px;
}
.hud-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.hud-label { color: #6b7280; }
.hud-value { color: #e5e7eb; text-align: right; }
.hud-samples { color: #4b5563; font-size: 10px; justify-content: center; margin-top: 2px; }
.hud-csv {
  margin-top: 4px;
  width: 100%;
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid #374151;
  border-radius: 2px;
  background: #1f2937;
  color: #9ca3af;
  cursor: pointer;
}
.hud-csv:hover { background: #374151; color: #e5e7eb; }
</style>

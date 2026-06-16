<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useAlertStore } from '~/composables/useAlertStore'
import { useBenchmark } from '~/composables/useBenchmark'
import { downloadCSV } from '~/utils/benchmarkExport'
import type { AppMode } from '~/types/alert'

const emit = defineEmits<{ toggleSidebar: []; toggleLogs: [] }>()
const ws = useWebSocket()
const store = useAlertStore()
const bm = useBenchmark()
const hasSamples = computed(() => bm.sampleCount.value > 0)

const isPlaying = ref(false)
const mode = ref<AppMode>('live')
const rateVal = ref(0.5)
const RATES = [0.5, 1, 5, 10, 50, 100, 200, 500]
const source = ref<'local' | 'remote'>('remote')

function togglePlay() { isPlaying.value ? stop() : start() }
function start() {
  isPlaying.value = true
  bm.start()
  store.startCleanup()
  ws.setRate(rateVal.value)
  if (mode.value === 'live') {
    ws.setWsUrl(source.value === 'local' ? 'ws://localhost:3000' : ws.remoteUrl)
    ws.connect()
  } else ws.startDemo()
}
function stop() {
  isPlaying.value = false; bm.stop(); ws.disconnect(); store.stopCleanup()
}

function onSourceChange(s: 'local' | 'remote') {
  source.value = s
  if (isPlaying.value && mode.value === 'live') {
    ws.disconnect()
    ws.setWsUrl(s === 'local' ? 'ws://localhost:3000' : ws.remoteUrl)
    ws.connect()
  }
}
</script>

<template>
  <div style="display:flex;align-items:center;gap:12px;padding:8px 16px;background:#111827;border-bottom:1px solid #1f2937;flex-shrink:0">
    <button :class="`w-9 h-9 rounded-full flex items-center justify-center text-sm border-none cursor-pointer ${isPlaying ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`"
      @click="togglePlay">{{ isPlaying ? '■' : '▶' }}</button>

    <select :value="mode" class="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-700 text-gray-300"
      @change="mode = ($event.target as HTMLSelectElement).value as AppMode">
      <option value="live">Live</option><option value="demo">Demo</option>
    </select>

    <select v-if="mode === 'live'" :value="source" class="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-700 text-gray-300"
      @change="onSourceChange(($event.target as HTMLSelectElement).value as 'local' | 'remote')">
      <option value="local">Local</option><option value="remote">HF Space</option>
    </select>

    <select v-if="mode === 'demo'" :value="rateVal" class="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-700 text-gray-300"
      @change="rateVal = Number(($event.target as HTMLSelectElement).value); ws.setRate(rateVal)">
      <option v-for="r in RATES" :key="r" :value="r">{{ r }} ev/s</option>
    </select>

    <span v-if="isPlaying" class="text-xs text-gray-500 tabular-nums">{{ store.recentAlerts.length }} events</span>
    <div style="flex:1" />

    <button v-if="hasSamples" class="text-xs px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 cursor-pointer"
      @click="downloadCSV(bm.getSamples())">CSV</button>

    <button class="text-xs px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 cursor-pointer"
      @click="emit('toggleLogs')">LOG</button>
    <button class="text-xs px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 cursor-pointer"
      @click="emit('toggleSidebar')">☰</button>
  </div>
</template>

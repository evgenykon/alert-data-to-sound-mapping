<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useSonification } from '~/composables/useSonification'
import { useAlertStore } from '~/composables/useAlertStore'
import { useBenchmark } from '~/composables/useBenchmark'
import { downloadBenchmarkCSV } from '~/utils/benchmarkExport'
import { setDemoRate } from '~/utils/demoGenerator'
import type { AppMode } from '~/types/alert'

const emit = defineEmits<{
  toggleSidebar: []
  toggleLogs: []
}>()

const ws = useWebSocket()
const sonification = useSonification()
const store = useAlertStore()
const bm = useBenchmark()

const isPlaying = ref(false)
const mode = ref<AppMode>('demo')
const rateVal = ref(0.5)

const RATES = [0.5, 1, 5, 10, 50, 100, 200, 500]
const hasSamples = computed(() => bm.sampleCount.value > 0)

function togglePlay() {
  if (isPlaying.value) {
    stop()
  } else {
    start()
  }
}

function start() {
  isPlaying.value = true
  bm.startBenchmark()
  store.startCleanup()
  setDemoRate(rateVal.value)
  if (mode.value === 'live') {
    ws.connect()
  } else {
    ws.startDemo()
  }
}

function stop() {
  isPlaying.value = false
  bm.stopBenchmark()
  ws.disconnect()
  store.stopCleanup()
}

function onRateChange(r: number) {
  rateVal.value = r
  setDemoRate(r)
}
</script>

<template>
  <div class="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800">
    <button
      class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
      :class="isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'"
      @click="togglePlay"
    >
      {{ isPlaying ? '■' : '▶' }}
    </button>

    <select
      :value="mode"
      class="bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
      @change="mode = ($event.target as HTMLSelectElement).value as AppMode"
    >
      <option value="live">Live</option>
      <option value="demo">Demo</option>
    </select>

    <select
      :value="rateVal"
      class="bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
      @change="onRateChange(Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="r in RATES" :key="r" :value="r">{{ r }} ev/s</option>
    </select>

    <span v-if="isPlaying" class="text-xs text-gray-500 tabular-nums">
      {{ store.recentAlerts.length }} events
    </span>

    <div class="flex-1" />

    <button
      v-if="hasSamples"
      class="text-xs px-2 py-1 rounded border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
      @click="downloadBenchmarkCSV(bm.getSamples())"
    >
      CSV
    </button>

    <button
      class="text-xs px-2 py-1 rounded border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
      @click="emit('toggleLogs')"
    >
      LOG
    </button>

    <button
      class="text-xs px-2 py-1 rounded border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
      @click="emit('toggleSidebar')"
    >
      ☰
    </button>
  </div>
</template>

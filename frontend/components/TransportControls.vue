<script setup lang="ts">
import type { AppMode } from '~/types/alert'

const ws = useWebSocket()
const sonification = useSonification()
const store = useAlertStore()

const isPlaying = ref(false)
const volume = ref(0.7)
const mode = ref<AppMode>('demo')

function togglePlay() {
  if (isPlaying.value) {
    stop()
  } else {
    start()
  }
}

function start() {
  isPlaying.value = true
  store.startCleanup()
  if (mode.value === 'live') {
    ws.connect()
  } else {
    ws.startDemo()
  }
}

function stop() {
  isPlaying.value = false
  ws.disconnect()
  store.stopCleanup()
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

    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-400">🔊</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        class="w-24 accent-green-500"
        @input="volume = Number(($event.target as HTMLInputElement).value)"
      >
    </div>

    <select
      :value="mode"
      class="bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
      @change="mode = ($event.target as HTMLSelectElement).value as AppMode"
    >
      <option value="live">Live</option>
      <option value="demo">Demo</option>
    </select>

    <ConnectionStatus />
  </div>
</template>

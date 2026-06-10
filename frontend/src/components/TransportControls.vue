<script setup lang="ts">
import { ref } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useSonification } from '~/composables/useSonification'
import { useAlertStore } from '~/composables/useAlertStore'
import type { AppMode } from '~/types/alert'

const emit = defineEmits<{
  toggleSidebar: []
  toggleLogs: []
}>()

const ws = useWebSocket()
const sonification = useSonification()
const store = useAlertStore()

const isPlaying = ref(false)
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

    <select
      :value="mode"
      class="bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
      @change="mode = ($event.target as HTMLSelectElement).value as AppMode"
    >
      <option value="live">Live</option>
      <option value="demo">Demo</option>
    </select>

    <span v-if="isPlaying" class="text-xs text-gray-500 tabular-nums">
      {{ store.recentAlerts.length }} events
    </span>

    <div class="flex-1" />

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

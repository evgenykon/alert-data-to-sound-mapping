<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useAlertStore } from '~/composables/useAlertStore'

const store = useAlertStore()
const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(timer))

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((now.value - ts * 1000) / 1000))
  if (sec < 60) return sec + 's'
  return Math.floor(sec / 60) + 'm' + (sec % 60) + 's'
}

const icons: Record<string, string> = {
  'RR Lyrae': '🔴', 'Cepheid': '🟡', 'Mira': '🟠', 'LPV': '🟠', 'AGN': '🔵',
  'QSO': '🔵', 'SN Ia': '💥', 'SN Ib': '💥', 'SN Ic': '💥', 'SN II': '💥',
  'Kilonova': '⭐', 'TDE': '💜', 'Unknown': '⚪',
}
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded p-3 flex-1 flex flex-col overflow-hidden">
    <h3 class="text-xs uppercase tracking-wider text-gray-500 mb-2">Event Log ({{ store.recentAlerts.length }})</h3>
    <div class="space-y-0.5 flex-1 overflow-y-auto text-xs">
      <div v-for="a in store.recentAlerts" :key="a.alertId"
        class="grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-x-2 py-0.5 rounded px-1 cursor-pointer"
        :class="store.hoveredId === a.alertId ? 'bg-gray-700' : 'hover:bg-gray-800'"
        @mouseenter="store.setHovered(a.alertId)"
        @mouseleave="store.setHovered(null)"
        @click="store.selectAlert(a.alertId)">
        <span class="text-gray-500 w-10 tabular-nums">{{ timeAgo(a.timestamp) }}</span>
        <span>{{ icons[a.type] || '⚪' }}</span>
        <span class="truncate text-gray-300">{{ a.type }}</span>
        <span class="text-gray-500 tabular-nums">{{ a.magnitude?.toFixed(1) }}</span>
        <span class="text-gray-500 tabular-nums">z{{ a.redshift?.toFixed(2) }}</span>
        <span class="text-gray-600 tabular-nums">{{ a.score?.toFixed(2) }}</span>
      </div>
      <div v-if="!store.recentAlerts.length" class="text-gray-600 text-xs text-center py-4">No events yet</div>
    </div>
  </div>
</template>

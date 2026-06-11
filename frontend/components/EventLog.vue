<script setup lang="ts">
import { useAlertStore } from '~/composables/useAlertStore'

const store = useAlertStore()

const typeIcons: Record<string, string> = {
  'RR Lyrae': '🔴',
  'Cepheid': '🟡',
  'Mira': '🟠',
  'LPV': '🟠',
  'AGN': '🔵',
  'QSO': '🔵',
  'SN Ia': '💥',
  'SN Ib': '💥',
  'SN Ic': '💥',
  'SN II': '💥',
  'Kilonova': '⭐',
  'TDE': '💜',
  'Unknown': '⚪',
}
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded p-3 h-64 overflow-y-auto">
    <h3 class="text-xs uppercase tracking-wider text-gray-500 mb-2 sticky top-0 bg-gray-900 pb-1">
      Event Log ({{ store.recentAlerts.length }})
    </h3>
    <div class="space-y-0.5">
      <div
        v-for="a in store.recentAlerts"
        :key="a.alertId"
        class="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 text-xs py-0.5 hover:bg-gray-800 rounded px-1"
      >
        <span>{{ typeIcons[a.type] || '⚪' }}</span>
        <span class="truncate text-gray-300">{{ a.type }}</span>
        <span class="text-gray-500 tabular-nums">{{ a.magnitude.toFixed(1) }}</span>
        <span class="text-gray-500 tabular-nums">z{{ a.redshift.toFixed(2) }}</span>
      </div>
      <div v-if="!store.recentAlerts.length" class="text-gray-600 text-xs text-center py-4">
        No events yet
      </div>
    </div>
  </div>
</template>

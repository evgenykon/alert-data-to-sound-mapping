<script setup lang="ts">
import type { AlertType } from '~/types/alert'

const sonification = useSonification()

const allTypes: AlertType[] = [
  'RR Lyrae', 'Cepheid', 'Mira', 'LPV', 'AGN', 'QSO',
  'SN Ia', 'SN Ib', 'SN Ic', 'SN II', 'Kilonova', 'TDE', 'Unknown',
]

const typeColors: Record<string, string> = {
  'RR Lyrae': 'text-yellow-400',
  'Cepheid': 'text-yellow-300',
  'Mira': 'text-orange-400',
  'LPV': 'text-orange-300',
  'AGN': 'text-blue-400',
  'QSO': 'text-blue-300',
  'SN Ia': 'text-red-400',
  'SN Ib': 'text-red-400',
  'SN Ic': 'text-red-400',
  'SN II': 'text-red-300',
  'Kilonova': 'text-purple-400',
  'TDE': 'text-pink-400',
  'Unknown': 'text-gray-400',
}
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded p-3 mb-2">
    <h3 class="text-xs uppercase tracking-wider text-gray-500 mb-2">Filter by class</h3>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="t in allTypes"
        :key="t"
        class="text-xs px-2 py-0.5 rounded border transition-colors"
        :class="sonification.config.enabledTypes.has(t)
          ? [`${typeColors[t] || 'text-green-300'}`, 'border-green-700 bg-green-900/30']
          : 'text-gray-600 border-gray-800 bg-gray-800/50'"
        @click="sonification.toggleType(t)"
      >
        {{ t }}
      </button>
    </div>
  </div>
</template>

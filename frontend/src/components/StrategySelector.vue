<script setup lang="ts">
import { ref } from 'vue'
import { useSonification } from '~/composables/useSonification'
import type { SonificationStrategy } from '~/types/alert'

const sonification = useSonification()
const open = ref(false)

const strategies: { value: SonificationStrategy; label: string; desc: string }[] = [
  { value: 'aggregate', label: 'Aggregate', desc: 'Group nearby events into composite sounds' },
  { value: 'score-filter', label: 'Score Filter', desc: 'Only events above score threshold' },
  { value: 'sampling', label: 'Sampling', desc: 'Play every Nth event' },
  { value: 'grains', label: 'Grains', desc: 'Each event = short grain, creates texture' },
  { value: 'rate-limit', label: 'Rate Limit', desc: 'Max K events/sec, rare events prioritized' },
]
</script>

<template>
  <div>
    <button
      class="w-full text-left text-sm px-2 py-1.5 rounded border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 flex items-center justify-between"
      @click="open = !open"
    >
      <span>⚙ {{ strategies.find(s => s.value === sonification.config.strategy)?.label }}</span>
      <span class="text-xs" :class="open ? 'rotate-180' : ''">▼</span>
    </button>

    <div v-if="open" class="mt-1 space-y-1">
      <button
        v-for="s in strategies"
        :key="s.value"
        class="w-full text-left text-xs px-2 py-1.5 rounded transition-colors"
        :class="sonification.config.strategy === s.value
          ? 'bg-green-800 text-green-300'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        @click="sonification.setStrategy(s.value); open = false"
      >
        <span class="font-medium">{{ s.label }}</span>
        <span class="block text-gray-500 truncate">{{ s.desc }}</span>
      </button>
    </div>

    <div v-if="sonification.config.strategy === 'score-filter'" class="mt-2">
      <label class="text-xs text-gray-500">Threshold: {{ sonification.config.scoreThreshold.toFixed(2) }}</label>
      <input type="range" min="0" max="1" step="0.01"
        :value="sonification.config.scoreThreshold"
        class="w-full accent-green-500"
        @input="sonification.setScoreThreshold(Number(($event.target as HTMLInputElement).value))">
    </div>

    <div v-if="sonification.config.strategy === 'sampling'" class="mt-2">
      <label class="text-xs text-gray-500">Every Nth: {{ sonification.config.samplingRate }}</label>
      <input type="range" min="1" max="100" step="1"
        :value="sonification.config.samplingRate"
        class="w-full accent-green-500"
        @input="sonification.setSamplingRate(Number(($event.target as HTMLInputElement).value))">
    </div>

    <div v-if="sonification.config.strategy === 'rate-limit'" class="mt-2">
      <label class="text-xs text-gray-500">Max/sec: {{ sonification.config.rateLimit }}</label>
      <input type="range" min="1" max="500" step="1"
        :value="sonification.config.rateLimit"
        class="w-full accent-green-500"
        @input="sonification.setRateLimit(Number(($event.target as HTMLInputElement).value))">
    </div>
  </div>
</template>

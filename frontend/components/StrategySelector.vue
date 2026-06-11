<script setup lang="ts">
import type { SonificationStrategy } from '~/types/alert'

const sonification = useSonification()

const strategies: { value: SonificationStrategy; label: string; desc: string }[] = [
  { value: 'aggregate', label: 'Aggregate', desc: 'Group nearby events into composite sounds' },
  { value: 'score-filter', label: 'Score Filter', desc: 'Only events above score threshold' },
  { value: 'sampling', label: 'Sampling', desc: 'Play every Nth event' },
  { value: 'grains', label: 'Grains', desc: 'Each event = short grain, creates texture' },
  { value: 'rate-limit', label: 'Rate Limit', desc: 'Max K events/sec, rare events prioritized' },
]
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded p-3 mb-2">
    <h3 class="text-xs uppercase tracking-wider text-gray-500 mb-2">Strategy</h3>
    <div class="space-y-1">
      <button
        v-for="s in strategies"
        :key="s.value"
        class="w-full text-left text-sm px-2 py-1 rounded transition-colors"
        :class="sonification.config.strategy === s.value
          ? 'bg-green-800 text-green-300'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        @click="sonification.setStrategy(s.value)"
      >
        <span class="font-medium">{{ s.label }}</span>
        <span class="block text-xs text-gray-500 mt-0.5">{{ s.desc }}</span>
      </button>
    </div>

    <div v-if="sonification.config.strategy === 'score-filter'" class="mt-2">
      <label class="text-xs text-gray-500">Threshold: {{ sonification.config.scoreThreshold.toFixed(2) }}</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="sonification.config.scoreThreshold"
        class="w-full accent-green-500"
        @input="sonification.setScoreThreshold(Number(($event.target as HTMLInputElement).value))"
      >
    </div>

    <div v-if="sonification.config.strategy === 'sampling'" class="mt-2">
      <label class="text-xs text-gray-500">Every Nth: {{ sonification.config.samplingRate }}</label>
      <input
        type="range"
        min="1"
        max="100"
        step="1"
        :value="sonification.config.samplingRate"
        class="w-full accent-green-500"
        @input="sonification.setSamplingRate(Number(($event.target as HTMLInputElement).value))"
      >
    </div>

    <div v-if="sonification.config.strategy === 'rate-limit'" class="mt-2">
      <label class="text-xs text-gray-500">Max/sec: {{ sonification.config.rateLimit }}</label>
      <input
        type="range"
        min="1"
        max="500"
        step="1"
        :value="sonification.config.rateLimit"
        class="w-full accent-green-500"
        @input="sonification.setRateLimit(Number(($event.target as HTMLInputElement).value))"
      >
    </div>

    <div v-if="sonification.config.strategy === 'grains'">
      <label class="flex items-center gap-2 text-sm text-gray-400 mt-2">
        <input
          type="checkbox"
          :checked="sonification.config.grainsMode"
          class="accent-green-500"
          @change="sonification.setGrainsMode(($event.target as HTMLInputElement).checked)"
        >
        Grain mode
      </label>
    </div>
  </div>
</template>

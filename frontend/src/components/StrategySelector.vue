<script setup lang="ts">
import { ref } from 'vue'
import { useSonification } from '~/composables/useSonification'
import type { SonificationStrategy } from '~/types/alert'

const sonification = useSonification()
const open = ref(false)

const list: { v: SonificationStrategy; l: string; d: string }[] = [
  { v: 'aggregate', l: 'Aggregate', d: 'Group nearby events into composite sounds' },
  { v: 'score-filter', l: 'Score Filter', d: 'Only events above score threshold' },
  { v: 'sampling', l: 'Sampling', d: 'Play every Nth event' },
  { v: 'grains', l: 'Grains', d: 'Each event = short grain, creates texture' },
  { v: 'rate-limit', l: 'Rate Limit', d: 'Max K events/sec, rare events prioritized' },
]
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded p-3">
    <button class="w-full text-left text-sm px-2 py-1.5 rounded border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 flex items-center justify-between"
      @click="open = !open">
      <span>⚙ {{ list.find(s => s.v === sonification.config.strategy)?.l }}</span>
      <span class="text-xs" :class="open ? 'rotate-180' : ''">▼</span>
    </button>

    <div v-if="open" class="mt-1 space-y-1">
      <button v-for="s in list" :key="s.v"
        class="w-full text-left text-xs px-2 py-1.5 rounded transition-colors"
        :class="sonification.config.strategy === s.v ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        @click="sonification.setStrategy(s.v); open = false">
        <span class="font-medium">{{ s.l }}</span>
        <span class="block text-gray-500 truncate">{{ s.d }}</span>
      </button>
    </div>

    <div v-if="sonification.config.strategy === 'score-filter'" class="mt-2">
      <label class="text-xs text-gray-500">Threshold: {{ sonification.config.scoreThreshold.toFixed(2) }}</label>
      <input type="range" min="0" max="1" step="0.01" :value="sonification.config.scoreThreshold"
        class="w-full accent-green-500 mt-1" @input="sonification.setScoreThreshold(Number(($event.target as HTMLInputElement).value))">
    </div>
    <div v-if="sonification.config.strategy === 'sampling'" class="mt-2">
      <label class="text-xs text-gray-500">Every Nth: {{ sonification.config.samplingRate }}</label>
      <input type="range" min="1" max="100" step="1" :value="sonification.config.samplingRate"
        class="w-full accent-green-500 mt-1" @input="sonification.setSamplingRate(Number(($event.target as HTMLInputElement).value))">
    </div>
    <div v-if="sonification.config.strategy === 'rate-limit'" class="mt-2">
      <label class="text-xs text-gray-500">Max/sec: {{ sonification.config.rateLimit }}</label>
      <input type="range" min="1" max="500" step="1" :value="sonification.config.rateLimit"
        class="w-full accent-green-500 mt-1" @input="sonification.setRateLimit(Number(($event.target as HTMLInputElement).value))">
    </div>
  </div>
</template>

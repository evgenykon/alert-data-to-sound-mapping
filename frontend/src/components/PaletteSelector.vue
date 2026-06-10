<script setup lang="ts">
import { ref } from 'vue'
import { useSonification } from '~/composables/useSonification'
import { getPaletteMeta } from '~/utils/mapping'
import type { SoundPaletteId } from '~/types/alert'

const sonification = useSonification()
const open = ref(false)

const palettes: SoundPaletteId[] = ['scientific', 'musical', 'xenomorphic', 'minimal', 'cinematic']
</script>

<template>
  <div>
    <button
      class="w-full text-left text-sm px-2 py-1.5 rounded border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 flex items-center justify-between"
      @click="open = !open"
    >
      <span>🎹 {{ getPaletteMeta(sonification.config.palette).label }}</span>
      <span class="text-xs" :class="open ? 'rotate-180' : ''">▼</span>
    </button>

    <div v-if="open" class="mt-1 space-y-1">
      <button
        v-for="id in palettes"
        :key="id"
        class="w-full text-left text-xs px-2 py-1.5 rounded transition-colors"
        :class="sonification.config.palette === id
          ? 'bg-green-800 text-green-300'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
        @click="sonification.setPalette(id); open = false"
      >
        <span class="font-medium">{{ getPaletteMeta(id).label }}</span>
        <span class="block text-gray-500 truncate">{{ getPaletteMeta(id).desc }}</span>
      </button>
    </div>
  </div>
</template>

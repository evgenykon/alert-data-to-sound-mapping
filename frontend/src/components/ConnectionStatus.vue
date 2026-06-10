<script setup lang="ts">
import { useWebSocket } from '~/composables/useWebSocket'

const ws = useWebSocket()
</script>

<template>
  <div class="flex items-center gap-2 text-xs">
    <span
      class="w-2 h-2 rounded-full"
      :class="{
        'bg-green-400': ws.status === 'connected',
        'bg-yellow-400 animate-pulse': ws.status === 'connecting',
        'bg-orange-400': ws.status === 'demo',
        'bg-red-400': ws.status === 'disconnected',
      }"
    />
    <span class="text-gray-400">{{ ws.status }}</span>
  </div>
</template>

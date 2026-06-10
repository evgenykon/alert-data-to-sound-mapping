<script setup lang="ts">
import { ref } from 'vue'
import TransportControls from '~/components/TransportControls.vue'
import BenchmarkHUD from '~/components/BenchmarkHUD.vue'
import StarMap from '~/components/StarMap.vue'
import StrategySelector from '~/components/StrategySelector.vue'
import PaletteSelector from '~/components/PaletteSelector.vue'
import ClassFilter from '~/components/ClassFilter.vue'
import EventLog from '~/components/EventLog.vue'
import { useAlertStore } from '~/composables/useAlertStore'

const store = useAlertStore()

type PanelMode = 'controls' | 'logs' | 'hidden'

const panelMode = ref<PanelMode>('controls')

function toggleSidebar() {
  if (panelMode.value === 'hidden') {
    panelMode.value = 'controls'
  } else {
    panelMode.value = 'hidden'
  }
}

function toggleLogs() {
  if (panelMode.value === 'hidden') {
    panelMode.value = 'logs'
  } else {
    panelMode.value = panelMode.value === 'logs' ? 'controls' : 'logs'
  }
}
</script>

<template>
  <div class="app-root">
    <TransportControls
      @toggle-sidebar="toggleSidebar"
      @toggle-logs="toggleLogs"
    />
    <div class="app-body">
      <div class="map-area">
        <StarMap />
      </div>
      <div v-if="panelMode !== 'hidden'" class="sidebar-panel">
        <template v-if="panelMode === 'controls'">
          <StrategySelector />
          <PaletteSelector />
          <ClassFilter />
          <div class="bg-gray-900 border border-gray-800 rounded p-3">
            <label class="text-xs text-gray-500 flex items-center justify-between">
              <span>Log retention: {{ (store.logKeep.value / 1000 / 60).toFixed(0) }} min</span>
              <button class="text-xs px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                @click="store.reset()">Clear</button>
            </label>
            <input type="range" min="30" max="3600" step="30" :value="store.logKeep.value / 1000"
              class="w-full accent-green-500 mt-1"
              @input="store.setLogKeep(Number(($event.target as HTMLInputElement).value))">
          </div>
          <EventLog />
        </template>
        <template v-if="panelMode === 'logs'">
          <EventLog />
        </template>
      </div>
    </div>

    <BenchmarkHUD />
  </div>
</template>

<style scoped>
.app-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #030712;
}
.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}
.map-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}
.sidebar-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  overflow-y: auto;
  background: #030712;
  border-left: 1px solid #1f2937;
}
</style>

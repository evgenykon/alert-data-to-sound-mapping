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
  panelMode.value = panelMode.value === 'hidden' ? 'controls' : 'hidden'
}
function toggleLogs() {
  panelMode.value = panelMode.value === 'hidden' ? 'logs' : (panelMode.value === 'logs' ? 'controls' : 'logs')
}
</script>

<template>
  <div class="app-root">
    <TransportControls @toggle-sidebar="toggleSidebar" @toggle-logs="toggleLogs" />
    <div class="app-body">
      <div class="map-area"><StarMap /></div>
      <div v-if="panelMode === 'controls'" class="sidebar-panel">
        <StrategySelector /><PaletteSelector /><ClassFilter />
        <div class="bg-gray-900 border border-gray-800 rounded p-3">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <button class="text-xs px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 cursor-pointer"
              @click="store.reset()">Clear</button>
          </div>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded p-3">
          <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#6b7280;position:relative">
            <span style="cursor:help" @mouseenter="(($event.currentTarget as HTMLElement).nextElementSibling as HTMLElement)?.style.removeProperty('display')" @mouseleave="(($event.currentTarget as HTMLElement).nextElementSibling as HTMLElement)?.style.setProperty('display','none')">
              Batch ℹ️
            </span>
            <div style="display:none;position:absolute;bottom:100%;left:0;background:#1f2937;border:1px solid #374151;border-radius:4px;padding:6px 8px;font-size:10px;color:#d1d5db;white-space:normal;width:220px;z-index:10;pointer-events:none;margin-bottom:4px">
              UI Batching: alerts buffered and flushed to DOM at this interval. Lower = more responsive but higher DOM load.
            </div>
            <select :value="store.flushIntervalMs" class="bg-gray-800 text-xs px-1 py-0.5 rounded border border-gray-700 text-gray-300"
              @change="store.setFlushInterval(Number(($event.target as HTMLSelectElement).value))">
              <option value="16">16ms</option>
              <option value="32">32ms</option>
              <option value="64">64ms</option>
              <option value="100">100ms</option>
              <option value="250">250ms</option>
              <option value="500">500ms</option>
              <option value="1000">1000ms</option>
              <option value="2000">2000ms</option>
            </select>
          </div>
        </div>
        <EventLog />
      </div>
      <div v-else-if="panelMode === 'logs'" class="sidebar-panel">
        <div class="bg-gray-900 border border-gray-800 rounded p-3 flex flex-col flex-1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <button class="text-xs px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 cursor-pointer"
              @click="store.reset()">Clear</button>
            <span style="font-size:9px;color:#6b7280">Retain:</span>
            <input type="range" min="30" max="3600" step="30" :value="store.logKeep.value / 1000" style="width:120px;accent-color:#22c55e;height:4px"
              @input="store.setLogKeep(Number(($event.target as HTMLInputElement).value))">
            <span style="font-size:10px;color:#6b7280;min-width:36px">{{ Math.round(store.logKeep.value / 1000 / 60) }} min</span>
          </div>
          <EventLog />
        </div>
      </div>
    </div>
    <BenchmarkHUD />
  </div>
</template>

<style scoped>
.app-root { position: fixed; inset: 0; display: flex; flex-direction: column; background: #030712; }
.app-body { flex: 1; display: flex; min-height: 0; position: relative; }
.map-area { flex: 1; min-width: 0; min-height: 0; display: flex; }
.sidebar-panel { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px; overflow-y: auto; background: #030712; border-left: 1px solid #1f2937; }
</style>

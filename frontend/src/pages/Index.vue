<script setup lang="ts">
import { ref } from 'vue'
import TransportControls from '~/components/TransportControls.vue'
import StarMap from '~/components/StarMap.vue'
import StrategySelector from '~/components/StrategySelector.vue'
import PaletteSelector from '~/components/PaletteSelector.vue'
import ClassFilter from '~/components/ClassFilter.vue'
import EventLog from '~/components/EventLog.vue'

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
          <EventLog />
        </template>
        <template v-if="panelMode === 'logs'">
          <EventLog />
        </template>
      </div>
    </div>
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

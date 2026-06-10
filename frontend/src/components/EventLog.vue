<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useAlertStore } from '~/composables/useAlertStore'
import { getConstellation } from '~/utils/constellations'

const store = useAlertStore()

const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(timer))

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((now.value - ts * 1000) / 1000))
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${s}s`
}

function sexagesimalRa(ra: number): string {
  const h = ra / 15
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  const ss = ((h - hh - mm / 60) * 3600).toFixed(1)
  return `${hh}h ${mm}m ${ss}s`
}

function sexagesimalDec(dec: number): string {
  const d = Math.floor(Math.abs(dec))
  const m = Math.floor((Math.abs(dec) - d) * 60)
  const s = ((Math.abs(dec) - d - m / 60) * 3600).toFixed(1)
  return `${dec >= 0 ? '+' : '-'}${d}° ${m}' ${s}"`
}

const tooltip = ref<HTMLDivElement | null>(null)
const tooltipData = ref<{ x: number; y: number; type: string; alertId: string; ra: string; dec: string; mag: number; z: number; rise: number; score: number; age: string; icon: string; constellation: string | null } | null>(null)

function showTooltip(e: MouseEvent, a: any) {
  const winW = window.innerWidth
  const winH = window.innerHeight
  let x = e.clientX + 12
  let y = e.clientY - 10
  if (x + 230 > winW) x = e.clientX - 230
  if (y + 240 > winH) y = winH - 245
  if (y < 5) y = 5
  tooltipData.value = {
    x, y,
    type: a.type,
    alertId: a.alertId,
    ra: sexagesimalRa(a.ra),
    dec: sexagesimalDec(a.dec),
    mag: a.magnitude,
    z: a.redshift,
    rise: a.riseTime,
    score: a.score,
    age: timeAgo(a.timestamp),
    icon: typeIcons[a.type] || '⚪',
    constellation: getConstellation(a.ra, a.dec)?.name || null,
  }
}

function hideTooltip() {
  tooltipData.value = null
}

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

const typeColors: Record<string, string> = {
  'RR Lyrae': '#facc15',
  'Cepheid': '#fde047',
  'Mira': '#fb923c',
  'LPV': '#fdba74',
  'AGN': '#60a5fa',
  'QSO': '#93c5fd',
  'SN Ia': '#f87171',
  'SN Ib': '#f87171',
  'SN Ic': '#f87171',
  'SN II': '#fca5a5',
  'Kilonova': '#c084fc',
  'TDE': '#f472b6',
  'Unknown': '#9ca3af',
}
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded p-3 flex-1 overflow-y-auto">
    <h3 class="text-xs uppercase tracking-wider text-gray-500 mb-2 sticky top-0 bg-gray-900 pb-1">
      Event Log ({{ store.recentAlerts.length }})
    </h3>
    <div class="space-y-0.5">
      <div
        v-for="a in store.recentAlerts"
        :key="a.alertId"
        class="grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-x-2 text-xs py-0.5 rounded px-1 cursor-pointer"
        :class="store.hoveredId === a.alertId ? 'bg-gray-700' : 'hover:bg-gray-800'"
        @mouseenter="store.setHovered(a.alertId); showTooltip($event, a)"
        @mouseleave="store.setHovered(null); hideTooltip()"
        @mousemove="tooltipData = tooltipData ? { ...tooltipData, x: $event.clientX + 12, y: $event.clientY - 10 } : null"
      >
        <span class="text-gray-500 w-10 tabular-nums">{{ timeAgo(a.timestamp) }}</span>
        <span>{{ typeIcons[a.type] || '⚪' }}</span>
        <span class="truncate text-gray-300">{{ a.type }}</span>
        <span class="text-gray-500 tabular-nums">{{ a.magnitude?.toFixed(1) }}</span>
        <span class="text-gray-500 tabular-nums">z{{ a.redshift?.toFixed(2) }}</span>
        <span class="text-gray-600 tabular-nums">{{ a.score?.toFixed(2) }}</span>
      </div>
      <div v-if="!store.recentAlerts.length" class="text-gray-600 text-xs text-center py-4">
        No events yet
      </div>
    </div>
  </div>

  <div
    v-if="tooltipData"
    ref="tooltip"
    class="fixed z-50 bg-gray-900/95 border border-gray-700 rounded px-3 py-2 shadow-lg pointer-events-none text-xs leading-relaxed"
    :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
  >
    <strong :style="{ color: typeColors[tooltipData.type] || '#9ca3af' }">{{ tooltipData.type }}</strong><br>
    <span class="text-gray-400">ID:</span> {{ tooltipData.alertId }}<br>
    <span class="text-gray-400">RA:</span> {{ tooltipData.ra }}<br>
    <span class="text-gray-400">Dec:</span> {{ tooltipData.dec }}<br>
    <span class="text-gray-400">con:</span> {{ tooltipData.constellation || '—' }}<br>
    <span class="text-gray-400">mag:</span> {{ tooltipData.mag?.toFixed(1) }}<br>
    <span class="text-gray-400">z:</span> {{ tooltipData.z?.toFixed(3) }}<br>
    <span class="text-gray-400">rise:</span> {{ tooltipData.rise?.toFixed(2) }}s<br>
    <span class="text-gray-400">score:</span> {{ tooltipData.score?.toFixed(2) }}<br>
    <span class="text-gray-400">age:</span> {{ tooltipData.age }}
  </div>
</template>

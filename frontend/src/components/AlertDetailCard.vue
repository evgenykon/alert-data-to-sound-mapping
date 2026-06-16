<script setup lang="ts">
import { computed } from 'vue'
import { useAlertStore } from '~/composables/useAlertStore'
import { getConstellation } from '~/utils/constellations'

const store = useAlertStore()

const alert = computed(() => {
  const id = store.selectedId
  if (!id) return null
  return store.alerts.get(id) ?? store.recentAlerts.find(a => a.alertId === id) ?? null
})

function raHms(ra: number): string {
  if (!ra && ra !== 0) return '—'
  if (ra === 0) return '—'
  const h = ra / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = ((h - hh - mm / 60) * 3600).toFixed(1)
  return `${hh}h ${mm}m ${ss}s`
}

function decDms(dec: number): string {
  if (!dec && dec !== 0) return '—'
  if (dec === 0) return '—'
  const d = dec >= 0 ? Math.floor(dec) : Math.ceil(dec)
  const m = Math.floor(Math.abs(dec - d) * 60)
  const s = ((Math.abs(dec - d) * 60 - m) * 60).toFixed(1)
  return `${d}° ${m}' ${s}"`
}

function fmtTime(ts: number): string {
  if (typeof ts !== 'number' || !isFinite(ts) || ts <= 0) return '—'
  const d = new Date(ts * 1000)
  return d.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function age(ts: number): string {
  if (typeof ts !== 'number' || !isFinite(ts) || ts <= 0) return '—'
  const sec = Math.max(0, Math.round(Date.now() / 1000 - ts))
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  return `${m}m ${sec % 60}s`
}

const typeColors: Record<string, string> = {
  'RR Lyrae': '#facc15', 'Cepheid': '#fde047', 'Mira': '#fb923c', 'LPV': '#fdba74',
  'AGN': '#60a5fa', 'QSO': '#93c5fd', 'SN Ia': '#f87171', 'SN Ib': '#f87171',
  'SN Ic': '#f87171', 'SN II': '#fca5a5', 'Kilonova': '#c084fc', 'TDE': '#f472b6',
  'VS': '#6ee7b7', 'ORPHAN': '#a78bfa', 'CV': '#fbbf24', 'EB': '#34d399', 'YSO': '#fb923c',
  'Unknown': '#9ca3af',
}

function openObjectPage(id: string) {
  window.open(`https://lasair-ztf.lsst.ac.uk/objects/${id}/`, '_blank')
}
</script>

<template>
  <div v-if="alert" class="detail-card">
    <div class="card-header">
      <div class="flex items-center gap-2 min-w-0">
        <span class="type-dot" :style="{ background: typeColors[alert.type] || '#9ca3af' }"></span>
        <span class="alert-type" :style="{ color: typeColors[alert.type] || '#9ca3af' }">{{ alert.type }}</span>
        <span class="alert-id" :title="alert.alertId">{{ alert.alertId.slice(0, 18) }}…</span>
      </div>
      <button class="close-btn" @click="store.clearSelection()">✕</button>
    </div>

    <div class="card-body">
      <div class="field-row">
        <span class="field-label">RA</span>
        <span class="field-val">{{ raHms(alert.ra) }}</span>
        <span class="field-hint">right ascension</span>
      </div>
      <div class="field-row">
        <span class="field-label">Dec</span>
        <span class="field-val">{{ decDms(alert.dec) }}</span>
        <span class="field-hint">declination</span>
      </div>
      <div class="field-row">
        <span class="field-label">mag</span>
        <span class="field-val">{{ alert.magnitude >= 90 ? '—' : alert.magnitude.toFixed(2) }}</span>
        <span class="field-hint">apparent magnitude</span>
      </div>
      <div class="field-row">
        <span class="field-label">z</span>
        <span class="field-val">{{ alert.redshift.toFixed(4) }}</span>
        <span class="field-hint">redshift</span>
      </div>
      <div class="field-row">
        <span class="field-label">rise</span>
        <span class="field-val">{{ alert.riseTime.toFixed(2) }}s</span>
        <span class="field-hint">rise time</span>
      </div>
      <div class="field-row">
        <span class="field-label">score</span>
        <span class="field-val">{{ alert.score.toFixed(3) }}</span>
        <span class="field-hint">priority (0–1)</span>
      </div>
      <div class="field-row">
        <span class="field-label">con</span>
        <span class="field-val">{{ getConstellation(alert.ra, alert.dec) || '—' }}</span>
        <span class="field-hint">constellation</span>
      </div>

      <div class="divider"></div>

      <div class="field-row">
        <span class="field-label">ID</span>
        <span class="field-val mono text-xs link" @click="openObjectPage(alert.alertId)">{{ alert.alertId }}</span>
      </div>
      <div class="field-row">
        <span class="field-label">time</span>
        <span class="field-val text-xs">{{ fmtTime(alert.timestamp) }}</span>
        <span class="field-hint">{{ age(alert.timestamp) }}</span>
      </div>
      <div class="field-row" v-if="'status' in alert">
        <span class="field-label">status</span>
        <span class="field-val" :class="alert.status === 'sounding' ? 'text-green-400' : 'text-gray-500'">{{ alert.status }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-card {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 100;
  width: 280px;
  background: rgba(3, 7, 18, 0.95);
  border: 1px solid #374151;
  border-radius: 6px;
  font-size: 11px;
  pointer-events: auto;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #1f2937;
  gap: 8px;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-type {
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.alert-id {
  color: #6b7280;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.close-btn {
  background: none;
  border: 1px solid #374151;
  color: #6b7280;
  cursor: pointer;
  font-size: 10px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.close-btn:hover {
  color: #e5e7eb;
  border-color: #6b7280;
}

.link { cursor: pointer; }
.link:hover { text-decoration: underline; color: #60a5fa; }

.card-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.6;
}

.field-label {
  color: #6b7280;
  width: 36px;
  flex-shrink: 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-val {
  color: #d1d5db;
  font-family: inherit;
}

.field-hint {
  color: #4b5563;
  font-size: 9px;
  margin-left: auto;
  flex-shrink: 0;
}

.mono {
  font-family: monospace;
}

.divider {
  height: 1px;
  background: #1f2937;
  margin: 4px 0;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { raDecToScreen } from '~/utils/projections'
import { getConstellation } from '~/utils/constellations'
import { useAlertStore } from '~/composables/useAlertStore'

const store = useAlertStore()

const svgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const w = ref(800)
const h = ref(400)

let resizeTimer: ReturnType<typeof setTimeout> | null = null
let animFrame = 0
let pointsGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null

const crosshair = computed(() => {
  const id = store.hoveredId
  if (!id) return null
  const a = store.alerts.get(id)
  if (!a) return null
  const p = raDecToScreen(a.ra, a.dec, w.value, h.value)
  return { x: p.x, y: p.y, color: typeColors[a.type] || '#9ca3af' }
})

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

function magToRadius(mag: number): number {
  return Math.max(2, Math.min(8, (22 - mag) * 0.8))
}

function drawGraticule(svg: SVGSVGElement, width: number, height: number) {
  const s = d3.select(svg)

  for (let ra = 0; ra < 360; ra += 30) {
    const pts: [number, number][] = []
    for (let dec = -90; dec <= 90; dec += 5) {
      const p = raDecToScreen(ra, dec, width, height)
      pts.push([p.x, p.y])
    }
    s.append('polyline')
      .attr('points', pts.map(([x, y]) => `${x},${y}`).join(' '))
      .attr('fill', 'none').attr('stroke', '#1f2937').attr('stroke-width', 1)
  }

  for (let dec = -90; dec <= 90; dec += 30) {
    if (dec === 0) continue
    const pts: [number, number][] = []
    for (let ra = 0; ra <= 360; ra += 2) {
      const p = raDecToScreen(ra, dec, width, height)
      pts.push([p.x, p.y])
    }
    s.append('polyline')
      .attr('points', pts.map(([x, y]) => `${x},${y}`).join(' '))
      .attr('fill', 'none').attr('stroke', '#1f2937').attr('stroke-width', 1)
  }

  const eq: [number, number][] = []
  for (let ra = 0; ra <= 360; ra += 2) {
    const p = raDecToScreen(ra, 0, width, height)
    eq.push([p.x, p.y])
  }
  s.append('polyline')
    .attr('points', eq.map(([x, y]) => `${x},${y}`).join(' '))
    .attr('fill', 'none').attr('stroke', '#374151').attr('stroke-width', 1)

  for (let ra = 0; ra < 360; ra += 60) {
    const p = raDecToScreen(ra, 80, width, height)
    s.append('text')
      .attr('x', p.x).attr('y', p.y)
      .attr('fill', '#4b5563').attr('font-size', 10).attr('text-anchor', 'middle')
      .text(ra === 0 ? '0h' : `${ra / 15}h`)
  }

  for (let dec = -60; dec <= 60; dec += 30) {
    const p = raDecToScreen(10, dec, width, height)
    s.append('text')
      .attr('x', p.x).attr('y', p.y + 3)
      .attr('fill', '#4b5563').attr('font-size', 10).attr('text-anchor', 'start')
      .text(dec > 0 ? `+${dec}°` : `${dec}°`)
  }
}

function render() {
  if (!svgRef.value) return
  const width = w.value
  const height = h.value

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  svg.append('rect')
    .attr('width', width).attr('height', height).attr('fill', '#030712')

  drawGraticule(svgRef.value, width, height)

  pointsGroup = svg.append('g').attr('class', 'points')
  tooltip = d3.select(tooltipRef.value!)
}

function updatePoints() {
  if (!pointsGroup || !tooltip) return
  const width = w.value
  const height = h.value

  const data = Array.from(store.alerts.values())
  const sel = pointsGroup
    .selectAll<SVGCircleElement, typeof data[0]>('circle')
    .data(data, d => d.alertId)

  sel.exit().transition().duration(500).attr('r', 0).remove()

  sel.enter().append('circle').merge(sel as any)
    .attr('cx', d => raDecToScreen(d.ra, d.dec, width, height).x)
    .attr('cy', d => raDecToScreen(d.ra, d.dec, width, height).y)
    .attr('fill', d => typeColors[d.type] || '#9ca3af')
    .attr('opacity', d => d.opacity)
    .attr('r', d => magToRadius(d.magnitude))
    .attr('stroke', d => d.status === 'sounding' ? '#22c55e' : 'none')
    .attr('stroke-width', d => d.status === 'sounding' ? 2 : 0)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event: MouseEvent, d: any) {
      const age = Math.max(0, Math.round((Date.now() / 1000 - d.timestamp)))
      const raH = d.ra / 15
      const raHh = Math.floor(raH)
      const raMm = Math.floor((raH - raHh) * 60)
      const raSs = ((raH - raHh - raMm / 60) * 3600).toFixed(1)
      const decD = d.dec >= 0 ? Math.floor(d.dec) : Math.ceil(d.dec)
      const decM = Math.floor((d.dec - decD) * 60)
      const decS = ((d.dec - decD - decM / 60) * 3600).toFixed(1)
      const constel = getConstellation(d.ra, d.dec)
      const winW = window.innerWidth
      const winH = window.innerHeight
      let left = event.pageX + 10
      let top = event.pageY - 10
      if (left + 230 > winW) left = event.pageX - 230
      if (top + 240 > winH) top = winH - 245
      if (top < 5) top = 5
      tooltip!.style('display', 'block')
        .style('left', `${left}px`).style('top', `${top}px`)
        .html(`<div class="text-xs leading-relaxed" style="max-width: 220px">
          <strong style="color:${typeColors[d.type] || '#9ca3af'}">${d.type}</strong><br>
          <span class="text-gray-400">con:</span> ${constel ? constel.name : '—'}<br>
          <span class="text-gray-400">ID:</span> ${d.alertId}<br>
          <span class="text-gray-400">RA:</span> ${raHh}h ${raMm}m ${raSs}s<br>
          <span class="text-gray-400">Dec:</span> ${decD}° ${Math.abs(decM)}' ${decS}"<br>
          <span class="text-gray-400">mag:</span> ${d.magnitude?.toFixed(1)}<br>
          <span class="text-gray-400">z:</span> ${d.redshift?.toFixed(3)}<br>
          <span class="text-gray-400">rise:</span> ${d.riseTime?.toFixed(2)}s<br>
          <span class="text-gray-400">score:</span> ${d.score?.toFixed(2)}<br>
          <span class="text-gray-400">age:</span> ${age}s
        </div>`)
    })
    .on('mouseleave', () => tooltip!.style('display', 'none'))
}

function loop() {
  if (store.alerts.size > 0) {
    updatePoints()
  }
  animFrame = requestAnimationFrame(loop)
}

function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    render()
  }, 100)
}

onMounted(() => {
  const el = svgRef.value?.parentElement
  if (el) {
    w.value = el.clientWidth || el.offsetWidth || 800
    h.value = el.clientHeight || el.offsetHeight || 400
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      w.value = entry.contentRect.width
      h.value = entry.contentRect.height
    }
    handleResize()
  })
  if (el) {
    observer.observe(el)
  }
  render()
  animFrame = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
})
</script>

<template>
  <div class="star-map-root">
    <svg ref="svgRef" class="star-map-svg" />
    <svg v-if="crosshair" class="star-map-svg" style="position: absolute; inset: 0; pointer-events: none;">
      <line :x1="crosshair.x - 8" :y1="crosshair.y" :x2="crosshair.x + 8" :y2="crosshair.y" stroke="#22c55e" stroke-width="2" />
      <line :x1="crosshair.x" :y1="crosshair.y - 8" :x2="crosshair.x" :y2="crosshair.y + 8" stroke="#22c55e" stroke-width="2" />
      <circle :cx="crosshair.x" :cy="crosshair.y" r="5" fill="none" stroke="#22c55e" stroke-width="1.5" />
    </svg>
    <div ref="tooltipRef" class="star-map-tooltip" />
    <div class="star-map-label">✦ Aitoff projection · RA 0–360° · Dec -90–+90°</div>
  </div>
</template>

<style scoped>
.star-map-root {
  flex: 1;
  display: flex;
  position: relative;
  background: #030712;
  border: 1px solid #1f2937;
  border-radius: 4px;
  overflow: hidden;
}

.star-map-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.star-map-tooltip {
  position: fixed;
  z-index: 50;
  display: none;
  background: rgba(3, 7, 18, 0.95);
  border: 1px solid #374151;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  pointer-events: none;
}

.star-map-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 12px;
  color: #4b5563;
}
</style>

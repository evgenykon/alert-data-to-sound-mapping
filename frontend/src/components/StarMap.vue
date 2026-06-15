<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as d3 from 'd3'
import { raDecToScreen } from '~/utils/projections'
import { getConstellation } from '~/utils/constellations'
import { useAlertStore } from '~/composables/useAlertStore'

const store = useAlertStore()
const svgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)

let mapW = 800, mapH = 400
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
let pointsGroup: d3.Selection<SVGGElement, unknown, null, undefined>
let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>
let animId = 0, mapDirty = false, ro: ResizeObserver | null = null

const crosshair = computed(() => {
  const id = store.hoveredId
  if (!id) return null
  const a = store.alerts.get(id)
  if (!a) return null
  const p = raDecToScreen(a.ra, a.dec, mapW, mapH)
  return { x: p.x, y: p.y }
})

const typeColors: Record<string, string> = {
  'RR Lyrae': '#facc15', 'Cepheid': '#fde047', 'Mira': '#fb923c', 'LPV': '#fdba74',
  'AGN': '#60a5fa', 'QSO': '#93c5fd', 'SN Ia': '#f87171', 'SN Ib': '#f87171',
  'SN Ic': '#f87171', 'SN II': '#fca5a5', 'Kilonova': '#c084fc', 'TDE': '#f472b6', 'Unknown': '#9ca3af',
}

function magToR(mag: number) { return Math.max(2, Math.min(8, (22 - mag) * 0.8)) }

function drawGraticule() {
  svg.selectAll('g.graticule > *').remove()
  const g = svg.select('g.graticule')

  g.append('rect').attr('width', mapW).attr('height', mapH).attr('fill', '#030712')

  // Outer boundary
  const boundary: [number, number][] = []
  for (let d = -90; d <= 90; d += 3) { const p = raDecToScreen(179, d, mapW, mapH); boundary.push([p.x, p.y]) }
  for (let d = 90; d >= -90; d -= 3) { const p = raDecToScreen(180, d, mapW, mapH); boundary.push([p.x, p.y]) }
  g.append('polygon').attr('points', boundary.map(([x, y]) => `${x},${y}`).join(' ')).attr('fill', 'none').attr('stroke', '#374151').attr('stroke-width', 1.5)

  for (let ra = 0; ra < 360; ra += 30) {
    const pts: [number, number][] = []
    for (let d = -90; d <= 90; d += 5) { const p = raDecToScreen(ra, d, mapW, mapH); pts.push([p.x, p.y]) }
    g.append('polyline').attr('points', pts.map(([x, y]) => `${x},${y}`).join(' ')).attr('fill', 'none').attr('stroke', '#1f2937').attr('stroke-width', 1)
  }
  for (let d = -90; d <= 90; d += 30) {
    if (d === 0) continue
    const pts: [number, number][] = []
    for (let r = 0; r <= 360; r += 2) { const p = raDecToScreen(r, d, mapW, mapH); pts.push([p.x, p.y]) }
    g.append('polyline').attr('points', pts.map(([x, y]) => `${x},${y}`).join(' ')).attr('fill', 'none').attr('stroke', '#1f2937').attr('stroke-width', 1)
  }
  const eq: [number, number][] = []
  for (let r = 0; r <= 360; r += 2) { const p = raDecToScreen(r, 0, mapW, mapH); eq.push([p.x, p.y]) }
  g.append('polyline').attr('points', eq.map(([x, y]) => `${x},${y}`).join(' ')).attr('fill', 'none').attr('stroke', '#374151').attr('stroke-width', 1)

  for (let r = 0; r < 360; r += 60) { const p = raDecToScreen(r, 80, mapW, mapH); g.append('text').attr('x', p.x).attr('y', p.y).attr('fill', '#4b5563').attr('font-size', 10).attr('text-anchor', 'middle').text(r === 0 ? '0h' : `${r / 15}h`) }
  for (let d = -60; d <= 60; d += 30) { const p = raDecToScreen(10, d, mapW, mapH); g.append('text').attr('x', p.x).attr('y', p.y + 3).attr('fill', '#4b5563').attr('font-size', 10).attr('text-anchor', 'start').text(d > 0 ? `+${d}°` : `${d}°`) }
}

function updatePoints() {
  if (!pointsGroup) return
  const data = Array.from(store.alerts.values())
  const sel = pointsGroup.selectAll('circle').data(data, d => (d as any).alertId)
  sel.exit().remove()
  sel.enter().append('circle')
    .attr('cx', (d: any) => raDecToScreen(d.ra, d.dec, mapW, mapH).x)
    .attr('cy', (d: any) => raDecToScreen(d.ra, d.dec, mapW, mapH).y)
    .attr('fill', (d: any) => typeColors[d.type] || '#9ca3af')
    .attr('opacity', (d: any) => d.opacity)
    .attr('r', (d: any) => magToR(d.magnitude))
    .attr('stroke', (d: any) => d.status === 'sounding' ? '#22c55e' : 'none')
    .attr('stroke-width', (d: any) => d.status === 'sounding' ? 2 : 0)
    .style('cursor', 'pointer')
    .on('mouseenter', function (this: SVGCircleElement, event: MouseEvent, d: unknown) {
      const a = d as any
      const raH = a.ra / 15, hh = Math.floor(raH), mm = Math.floor((raH - hh) * 60), ss = ((raH - hh - mm / 60) * 3600).toFixed(1)
      const decD = a.dec >= 0 ? Math.floor(a.dec) : Math.ceil(a.dec), decM = Math.floor((a.dec - decD) * 60), decS = ((a.dec - decD - decM / 60) * 3600).toFixed(1)
      const con = getConstellation(a.ra, a.dec), age = Math.max(0, Math.round(Date.now() / 1000 - a.timestamp))
      let lx = event.pageX + 12, ly = event.pageY - 10
      if (lx + 200 > window.innerWidth) lx = event.pageX - 200
      if (ly + 220 > window.innerHeight) ly = window.innerHeight - 225
      tooltip!.style('display', 'block').style('left', lx + 'px').style('top', ly + 'px')
        .html(`<div style="font-size:11px;line-height:1.5;max-width:200px"><strong style="color:${typeColors[a.type]||'#9ca3af'}">${a.type}</strong><br><span style="color:#6b7280">con:</span> ${con||'—'}<br><span style="color:#6b7280">ID:</span> ${a.alertId}<br><span style="color:#6b7280">RA:</span> ${hh}h ${mm}m ${ss}s<br><span style="color:#6b7280">Dec:</span> ${decD}° ${Math.abs(decM)}' ${decS}"<br><span style="color:#6b7280">mag:</span> ${a.magnitude.toFixed(1)}<br><span style="color:#6b7280">z:</span> ${a.redshift.toFixed(3)}<br><span style="color:#6b7280">rise:</span> ${a.riseTime.toFixed(2)}s<br><span style="color:#6b7280">score:</span> ${a.score.toFixed(2)}<br><span style="color:#6b7280">age:</span> ${age}s<br><a href="https://lasair-ztf.lsst.ac.uk/objects/${a.alertId}/" target="_blank" style="color:#60a5fa;text-decoration:underline">🔗 Lasair</a></div>`)
    })
    .on('mouseleave', () => tooltip!.style('display', 'none'))
}

function loop() {
  if (mapDirty) { mapDirty = false; updatePoints() }
  animId = requestAnimationFrame(loop)
}

watch(() => store.clearKey.value, () => {
  if (svg) {
    svg.selectAll('g.graticule > *').remove()
    svg.selectAll('g.points > *').remove()
    drawGraticule()
    pointsGroup = svg.append('g').attr('class', 'points')
  }
})

// Dirty flag when alerts change
watch(() => store.alerts.size, () => { mapDirty = true })

onMounted(() => {
  svg = d3.select(svgRef.value!)
  tooltip = d3.select(tooltipRef.value!)
  const parent = svgRef.value!.parentElement!
  mapW = parent.clientWidth || 800; mapH = parent.clientHeight || 400
  svg.append('g').attr('class', 'graticule')
  drawGraticule()
  pointsGroup = svg.append('g').attr('class', 'points')
  ro = new ResizeObserver(entries => {
    for (const e of entries) { mapW = e.contentRect.width; mapH = e.contentRect.height }
    drawGraticule()
  })
  ro.observe(parent)
  animId = requestAnimationFrame(loop)
})

onUnmounted(() => { cancelAnimationFrame(animId); if (ro) ro.disconnect() })

function markDirty() { mapDirty = true }
// Expose to global for use by cleanup
;(window as any).__starMapDirty = markDirty
</script>

<template>
  <div style="flex:1;display:flex;position:relative;background:#030712;border:1px solid #1f2937;border-radius:4px;overflow:hidden">
    <svg ref="svgRef" style="width:100%;height:100%;display:block" />
    <svg v-if="crosshair" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none">
      <line :x1="crosshair.x - 8" :y1="crosshair.y" :x2="crosshair.x + 8" :y2="crosshair.y" stroke="#22c55e" stroke-width="2" />
      <line :x1="crosshair.x" :y1="crosshair.y - 8" :x2="crosshair.x" :y2="crosshair.y + 8" stroke="#22c55e" stroke-width="2" />
      <circle :cx="crosshair.x" :cy="crosshair.y" r="5" fill="none" stroke="#22c55e" stroke-width="1.5" />
    </svg>
    <div ref="tooltipRef" style="position:fixed;z-index:300;display:none;background:rgba(3,7,18,.95);border:1px solid #374151;border-radius:4px;padding:8px 12px;pointer-events:auto" />
    <div style="position:absolute;bottom:8px;left:8px;font-size:10px;color:#4b5563;pointer-events:none">✦ Aitoff projection</div>
  </div>
</template>

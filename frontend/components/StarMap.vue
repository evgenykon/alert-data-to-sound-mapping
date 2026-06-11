<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import { raDecToScreen } from '~/utils/projections'
import { useAlertStore } from '~/composables/useAlertStore'

const store = useAlertStore()

const svgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const width = ref(800)
const height = ref(400)

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

function render() {
  if (!svgRef.value) return

  const svg = d3.select(svgRef.value)
  const w = width.value
  const h = height.value

  svg.selectAll('*').remove()

  const background = svg.append('rect')
    .attr('width', w)
    .attr('height', h)
    .attr('fill', '#030712')

  const pointsGroup = svg.append('g').attr('class', 'points')

  const tooltip = d3.select(tooltipRef.value)

  function update() {
    const data = Array.from(store.alerts.values())
    const sel = pointsGroup.selectAll<SVGCircleElement, typeof data[0]>('circle')
      .data(data, d => d.alertId)

    sel.exit()
      .transition()
      .duration(500)
      .attr('r', 0)
      .remove()

    const enter = sel.enter().append('circle')

    const merged = enter.merge(sel)

    merged
      .attr('cx', d => raDecToScreen(d.ra, d.dec, w, h).x)
      .attr('cy', d => raDecToScreen(d.ra, d.dec, w, h).y)
      .attr('fill', d => typeColors[d.type] || '#9ca3af')
      .attr('opacity', d => d.opacity)
      .attr('r', d => magToRadius(d.magnitude))
      .attr('stroke', d => d.status === 'sounding' ? '#22c55e' : 'none')
      .attr('stroke-width', d => d.status === 'sounding' ? 2 : 0)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        tooltip
          .style('display', 'block')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(`
            <div class="text-xs leading-relaxed">
              <strong class="${typeColors[d.type] || 'text-gray-300'}">${d.type}</strong><br>
              <span class="text-gray-400">ID:</span> ${d.alertId}<br>
              <span class="text-gray-400">RA:</span> ${d.ra.toFixed(2)}°<br>
              <span class="text-gray-400">Dec:</span> ${d.dec.toFixed(2)}°<br>
              <span class="text-gray-400">mag:</span> ${d.magnitude.toFixed(1)}<br>
              <span class="text-gray-400">z:</span> ${d.redshift.toFixed(3)}<br>
              <span class="text-gray-400">score:</span> ${d.score.toFixed(2)}
            </div>
          `)
      })
      .on('mouseleave', () => {
        tooltip.style('display', 'none')
      })

    requestAnimationFrame(() => {
      if (store.alerts.size > 0) {
        update()
      }
    })
  }

  let animFrame: number

  function loop() {
    update()
    animFrame = requestAnimationFrame(loop)
  }

  loop()

  onUnmounted(() => cancelAnimationFrame(animFrame))
}

onMounted(() => {
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      width.value = entry.contentRect.width
      height.value = entry.contentRect.height
    }
  })
  if (svgRef.value?.parentElement) {
    resizeObserver.observe(svgRef.value.parentElement)
  }
  render()
})
</script>

<template>
  <div class="relative w-full h-full bg-gray-950 rounded border border-gray-800 overflow-hidden">
    <svg ref="svgRef" :width="width" :height="height" class="w-full h-full" />
    <div
      ref="tooltipRef"
      class="fixed z-50 hidden bg-gray-900/95 border border-gray-700 rounded px-3 py-2 shadow-lg pointer-events-none"
    />
    <div class="absolute bottom-2 left-2 text-xs text-gray-600">
      ✦ Aitoff projection · RA 0–360° · Dec -90–+90°
    </div>
  </div>
</template>

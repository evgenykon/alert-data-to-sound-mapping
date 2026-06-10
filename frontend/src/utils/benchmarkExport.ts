import type { BenchmarkSample } from '~/composables/useBenchmark'

export function downloadBenchmarkCSV(samples: BenchmarkSample[]) {
  if (!samples.length) return

  const header = 'alertId,type,tA,tB,tC,latencyMap_ms,latencyAudio_ms,totalLatency_ms'
  const rows = samples.map(s =>
    `${s.alertId},${s.type},${s.tA.toFixed(3)},${s.tB.toFixed(3)},${s.tC.toFixed(3)},${s.latencyMap.toFixed(3)},${s.latencyAudio.toFixed(3)},${s.totalLatency.toFixed(3)}`
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  a.href = url
  a.download = `benchmark-${ts}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Sample { alertId: string; type: string; tA: number; tB: number; tC: number; latencyMap: number; latencyAudio: number; totalLatency: number }

export function downloadCSV(samples: Sample[]) {
  if (!samples.length) return
  const h = 'alertId,type,tA,tB,tC,latencyMap_ms,latencyAudio_ms,totalLatency_ms'
  const rows = samples.map(s => `${s.alertId},${s.type},${s.tA.toFixed(3)},${s.tB.toFixed(3)},${s.tC.toFixed(3)},${s.latencyMap.toFixed(3)},${s.latencyAudio.toFixed(3)},${s.totalLatency.toFixed(3)}`)
  const blob = new Blob([[h, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'benchmark-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

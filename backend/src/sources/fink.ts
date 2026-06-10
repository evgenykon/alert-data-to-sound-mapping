import type { Alert, AlertSource, AlertType } from '../types.js'

const FINK_API = 'https://api.ztf.fink-portal.org'

// Map Fink SIMBAD classes to our AlertType
function mapClassToType(simbadClass: string): AlertType {
  if (simbadClass.includes('SN')) return 'SN Ia'
  if (simbadClass.includes('AGN') || simbadClass.includes('Blazar') || simbadClass.includes('QSO')) return 'AGN'
  if (simbadClass.includes('RR')) return 'RR Lyrae'
  if (simbadClass.includes('Cepheid') || simbadClass.includes('Cep')) return 'Cepheid'
  if (simbadClass.includes('Mira') || simbadClass.includes('AGB') || simbadClass.includes('LPV')) return 'Mira'
  return 'Unknown'
}

export function createFinkSource(config: {
  pollIntervalMs?: number
  maxResults?: number
}): AlertSource {
  let timer: ReturnType<typeof setTimeout> | null = null
  let onAlert: ((a: Alert) => void) | null = null
  let seenIds = new Set<string>()
  const pollInterval = config.pollIntervalMs ?? 30000
  const maxResults = config.maxResults ?? 10

  async function poll() {
    if (!onAlert) return
    try {
      const res = await fetch(`${FINK_API}/api/v1/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxresults: maxResults,
          // Fink's explore API accepts date range
          // This needs actual Fink API auth/token in production
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return

      for (const obj of data) {
        if (!obj || seenIds.has(obj.aid || obj.objectId)) continue
        seenIds.add(obj.aid || obj.objectId)
        if (seenIds.size > 10000) seenIds.clear()

        const alert: Alert = {
          alertId: obj.aid || obj.objectId || `fink-${Date.now()}`,
          ra: obj.ra ?? 0,
          dec: obj.dec ?? 0,
          magnitude: obj.magnitude ?? obj.magpsf ?? 18,
          type: mapClassToType(obj.simbad_class || ''),
          redshift: obj.redshift ?? 0,
          riseTime: 0.5,
          score: obj.d ?? 0.5,
          timestamp: Date.now() / 1000,
        }
        onAlert(alert)
      }
    } catch {
      // poll failed, will retry
    }
  }

  return {
    type: 'fink',
    start(cb) {
      onAlert = cb
      console.log('[FinkSource] starting (polling every ' + pollInterval + 'ms)')
      poll()
      timer = setInterval(poll, pollInterval)
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      onAlert = null
      console.log('[FinkSource] stopped')
    },
  }
}

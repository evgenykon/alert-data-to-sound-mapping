import type { Alert, AlertType, AudioParams } from '~/types/alert'

const BASE_FREQ = 220

const TYPE_WAVE: Record<string, OscillatorType> = {
  'RR Lyrae': 'sine',
  Cepheid: 'sine',
  Mira: 'triangle',
  LPV: 'triangle',
  AGN: 'square',
  QSO: 'square',
  'SN Ia': 'sawtooth',
  'SN Ib': 'sawtooth',
  'SN Ic': 'sawtooth',
  'SN II': 'sawtooth',
  Kilonova: 'sawtooth',
  TDE: 'sawtooth',
}

const RARE_TYPES = new Set<AlertType>(['Kilonova', 'TDE'])

export function alertToAudioParams(alert: Alert): AudioParams {
  const raRad = (alert.ra * Math.PI) / 180
  const decRad = (alert.dec * Math.PI) / 180

  return {
    type: TYPE_WAVE[alert.type] ?? 'sine',
    frequency: BASE_FREQ * Math.pow(2, alert.redshift + 1),
    gain: magnitudeToGain(alert.magnitude),
    positionX: Math.cos(decRad) * Math.sin(raRad),
    positionY: Math.sin(decRad),
    positionZ: Math.cos(decRad) * Math.cos(raRad),
    attack: Math.min(alert.riseTime, 0.3),
  }
}

function magnitudeToGain(mag: number): number {
  const magRef = 12
  const raw = Math.pow(10, (magRef - mag) / 20)
  return Math.max(0, Math.min(1, raw))
}

export function isRareType(type: AlertType): boolean {
  return RARE_TYPES.has(type)
}

import type { Alert, AlertType, AudioParams, SoundPaletteId } from '~/types/alert'

const BASE_FREQ = 220
const RARE_TYPES = new Set<AlertType>(['Kilonova', 'TDE'])

const SCI_WAVE: Record<string, OscillatorType> = {
  'RR Lyrae': 'sine', Cepheid: 'sine', Mira: 'triangle', LPV: 'triangle',
  AGN: 'square', QSO: 'square', 'SN Ia': 'sawtooth', 'SN Ib': 'sawtooth',
  'SN Ic': 'sawtooth', 'SN II': 'sawtooth', Kilonova: 'sawtooth', TDE: 'sawtooth',
}

const PENT = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]
const ALL_SINE: Record<string, OscillatorType> = { _: 'sine' }

const PALETTES: Record<string, {
  wave: Record<string, OscillatorType> | ((t: AlertType) => OscillatorType)
  freq: (z: number) => number; gain: (m: number) => number; attack: (t: number) => number
}> = {
  scientific: { wave: SCI_WAVE, freq: z => BASE_FREQ * Math.pow(2, z + 1), gain: m => Math.max(0, Math.min(1, Math.pow(10, (12 - m) / 20))), attack: t => Math.min(t, 0.3) },
  musical: { wave: ALL_SINE, freq: z => PENT[Math.min(Math.floor((z + 0.1) * 7), PENT.length - 1)], gain: m => Math.max(0, Math.min(1, Math.pow(10, (12 - m) / 20))), attack: t => Math.min(t + 0.05, 0.3) },
  xenomorphic: { wave: (t: AlertType) => ['Kilonova', 'TDE'].includes(t) ? 'sawtooth' : 'square', freq: z => 60 + z * 400, gain: m => Math.max(0.2, Math.min(0.9, (22 - m) / 15)), attack: () => 0.01 },
  minimal: { wave: ALL_SINE, freq: () => 440, gain: m => Math.max(0.05, Math.min(0.5, (20 - m) / 20)), attack: () => 0.001 },
  cinematic: { wave: (t: AlertType) => ['Kilonova', 'TDE'].includes(t) ? 'sawtooth' : 'triangle', freq: z => 110 * Math.pow(1.5, z + 1), gain: m => Math.max(0, Math.min(1, Math.pow(10, (14 - m) / 20))), attack: t => Math.min(t + 0.2, 0.8) },
}

export function alertToAudioParams(alert: Alert, paletteId: SoundPaletteId = 'scientific'): AudioParams {
  const p = PALETTES[paletteId] || PALETTES.scientific
  const raRad = (alert.ra * Math.PI) / 180
  const decRad = (alert.dec * Math.PI) / 180
  const wave = typeof p.wave === 'function' ? p.wave(alert.type) : (p.wave as Record<string, OscillatorType>)[alert.type] || 'sine'
  return {
    type: wave, frequency: p.freq(alert.redshift), gain: p.gain(alert.magnitude),
    positionX: Math.cos(decRad) * Math.sin(raRad), positionY: Math.sin(decRad),
    positionZ: Math.cos(decRad) * Math.cos(raRad), attack: p.attack(alert.riseTime),
  }
}

export function isRareType(type: AlertType): boolean { return RARE_TYPES.has(type) }

export function getPaletteMeta(id: SoundPaletteId): { label: string; desc: string } {
  const map: Record<string, { label: string; desc: string }> = {
    scientific: { label: 'Scientific', desc: 'Waveform by type, pitch by redshift' },
    musical: { label: 'Musical', desc: 'Pentatonic scale, all sine' },
    xenomorphic: { label: 'Xenomorphic', desc: 'Harsh square waves, alien' },
    minimal: { label: 'Minimal', desc: 'Simple clicks, constant pitch' },
    cinematic: { label: 'Cinematic', desc: 'Dramatic, long attacks' },
  }
  return map[id] || map.scientific
}

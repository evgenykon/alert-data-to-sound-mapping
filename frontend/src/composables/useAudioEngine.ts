let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

export function playSound(params: {
  type: OscillatorType
  frequency: number
  gain: number
  positionX: number
  positionY: number
  positionZ: number
  attack: number
  duration: number
}) {
  const ctx = getContext()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  const panner = ctx.createPanner()

  osc.type = params.type
  osc.frequency.setValueAtTime(params.frequency, now)

  panner.panningModel = 'HRTF'
  panner.positionX.setValueAtTime(params.positionX, now)
  panner.positionY.setValueAtTime(params.positionY, now)
  panner.positionZ.setValueAtTime(params.positionZ, now)

  const attack = Math.min(params.attack, params.duration * 0.8)
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(params.gain, now + attack)
  gainNode.gain.linearRampToValueAtTime(0, now + params.duration)

  osc.connect(gainNode)
  gainNode.connect(panner)
  panner.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + params.duration + 0.05)
}

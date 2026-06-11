let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function playSound(p: {
  type: OscillatorType; frequency: number; gain: number
  positionX: number; positionY: number; positionZ: number; attack: number; duration: number
}) {
  const ctx = getCtx(), now = ctx.currentTime
  const osc = ctx.createOscillator(), gn = ctx.createGain(), pn = ctx.createPanner()
  osc.type = p.type
  osc.frequency.setValueAtTime(p.frequency, now)
  pn.panningModel = 'HRTF'
  pn.positionX.setValueAtTime(p.positionX, now)
  pn.positionY.setValueAtTime(p.positionY, now)
  pn.positionZ.setValueAtTime(p.positionZ, now)
  const atk = Math.min(p.attack, p.duration * 0.8)
  gn.gain.setValueAtTime(0, now)
  gn.gain.linearRampToValueAtTime(p.gain, now + atk)
  gn.gain.linearRampToValueAtTime(0, now + p.duration)
  osc.connect(gn); gn.connect(pn); pn.connect(ctx.destination)
  osc.start(now); osc.stop(now + p.duration + 0.05)
}

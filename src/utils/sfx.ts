let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    audioCtx = new AC()
  }
  return audioCtx!
}

let spinOsc: OscillatorNode | null = null
let spinGain: GainNode | null = null

export async function startSpinSound() {
  try {
    const ctx = getCtx()
    await ctx.resume()
    stopSpinSound()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    // subtle vibrato
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 6
    lfoGain.gain.value = 10
    lfo.connect(lfoGain).connect(osc.frequency)
    lfo.start()

    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    spinOsc = osc
    spinGain = gain
  } catch (e) {
    // ignore audio errors
  }
}

export function stopSpinSound() {
  try {
    if (spinGain && spinOsc) {
      const ctx = getCtx()
      spinGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
      spinOsc.stop(ctx.currentTime + 0.2)
    }
  } catch {}
  spinOsc = null
  spinGain = null
}

export async function playWinJingle() {
  try {
    const ctx = getCtx()
    await ctx.resume()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    const start = ctx.currentTime
    const dur = 0.12
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = start + i * (dur * 0.9)
      const t1 = t0 + dur
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t1)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t1 + 0.01)
    })
  } catch (e) {
    // ignore
  }
}


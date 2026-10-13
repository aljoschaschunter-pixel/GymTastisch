// Small wrappers around the browser features we use on the phone:
// sound (Web Audio) and keeping the screen on (Screen Wake Lock).

let ctx: AudioContext | undefined

/**
 * iOS only lets a page make sound after a tap, so call this from a tap handler
 * (e.g. "Save set") to have the beep ready when the rest timer ends.
 */
export function unlockAudio() {
  try {
    // Mix with the music app instead of pausing it (Safari 16.4+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'transient'
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    // A silent blip fully unlocks output on older iOS versions.
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.01)
  } catch {
    // no audio available
  }
}

/** Three short rising beeps. */
export function beep() {
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') void ctx.resume()
    const start = ctx.currentTime + 0.05
    ;[880, 880, 1320].forEach((freq, i) => {
      const t = start + i * 0.22
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === 2 ? 0.4 : 0.15))
      osc.connect(gain).connect(ctx!.destination)
      osc.start(t)
      osc.stop(t + 0.45)
    })
  } catch {
    // ignore
  }
}

let lock: WakeLockSentinel | undefined
let wanted = false

async function acquire() {
  if (!wanted || lock || document.visibilityState !== 'visible') return
  try {
    lock = await navigator.wakeLock?.request('screen')
    lock?.addEventListener('release', () => {
      lock = undefined
    })
  } catch {
    // not supported or denied (e.g. low power mode)
  }
}

document.addEventListener('visibilitychange', () => void acquire())

/** Keep the screen on while `on` is true. Re-acquired automatically after the app comes back. */
export function setKeepAwake(on: boolean) {
  wanted = on
  if (on) void acquire()
  else {
    void lock?.release()
    lock = undefined
  }
}

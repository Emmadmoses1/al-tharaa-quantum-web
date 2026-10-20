import { useEffect, useRef } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type SoundName = 'login' | 'welcome' | 'deposit' | 'withdraw' | 'order' | 'win' | 'lose' | 'tie' | 'notify' | 'error'

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const C = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch { return null }
}

if (typeof window !== 'undefined') {
  const unlock = () => { ac() }
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

export function isMuted() {
  try { return localStorage.getItem('sound_muted') === '1' } catch { return false }
}
export function setMuted(m: boolean) {
  try { localStorage.setItem('sound_muted', m ? '1' : '0') } catch { /* ignore */ }
}

function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.16) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g); g.connect(c.destination)
  o.start(at); o.stop(at + dur + 0.02)
}

const NOTE = { C4: 261.6, A3: 220, F3: 174.6, A4: 440, C5: 523.3, E5: 659.3, G5: 784, B5: 987.8, C6: 1046.5, E6: 1318.5, B6: 1975.5 }

export function playSound(name: SoundName) {
  if (isMuted()) return
  const c = ac()
  if (!c) return
  const t = c.currentTime + 0.02
  switch (name) {
    case 'login': tone(c, NOTE.C5, t, 0.18); tone(c, NOTE.G5, t + 0.12, 0.3); break
    case 'welcome': [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone(c, f, t + i * 0.1, 0.32)); break
    case 'deposit': tone(c, NOTE.E6, t, 0.12, 'triangle'); tone(c, NOTE.B6, t + 0.09, 0.4, 'triangle'); break
    case 'withdraw': [NOTE.G5, NOTE.B5, NOTE.E6].forEach((f, i) => tone(c, f, t + i * 0.09, 0.2, 'triangle')); break
    case 'order': tone(c, 880, t, 0.07, 'square', 0.07); break
    case 'win':
      ;[NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => tone(c, f, t + i * 0.09, 0.28, 'triangle', 0.2))
      tone(c, NOTE.C6, t + 0.4, 0.5, 'sine', 0.2)
      try { navigator.vibrate?.([60, 40, 90]) } catch { /* ignore */ }
      break
    case 'lose': tone(c, NOTE.A3, t, 0.28, 'sawtooth', 0.08); tone(c, NOTE.F3, t + 0.2, 0.45, 'sawtooth', 0.08); break
    case 'tie': tone(c, NOTE.A4, t, 0.3); break
    case 'notify': tone(c, NOTE.E6, t, 0.5, 'sine', 0.14); tone(c, NOTE.B5, t + 0.12, 0.6, 'sine', 0.1); break
    case 'error': tone(c, 150, t, 0.22, 'square', 0.09); break
  }
}

// Play once each time `flag` turns true (not on first render if it is already true)
export function useSoundWhen(flag: boolean, name: SoundName) {
  const prev = useRef<boolean | null>(null)
  useEffect(() => {
    if (prev.current === false && flag) playSound(name)
    prev.current = flag
  }, [flag, name])
}

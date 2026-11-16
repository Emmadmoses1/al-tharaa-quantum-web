import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { speak, unlockSpeech, greeting, phraseFor, voiceSupported, voiceEnabled, setVoiceEnabled, type SpeakResult } from '../lib/voice'

type N = { id: string; type: string; title_ar: string | null; message_ar: string | null; created_at: string }

const MONEY = ['trade', 'deposit', 'withdrawal', 'investment', 'bonus', 'balance']
const HELP: Partial<Record<SpeakResult, string>> = {
  novoice: 'لا يوجد صوت عربي على هذا الجهاز. من إعدادات الهاتف: اللغة > تحويل النص إلى كلام > خدمات Google > تثبيت بيانات الصوت العربي، ثم أعد المحاولة.',
  blocked: 'المتصفح منع الصوت. المس الشاشة مرة ثم أعد المحاولة.',
  error: 'تعذّر تشغيل الصوت. تأكد أن صوت الوسائط مرتفع وأن محرك النطق مثبّت.',
}

// Greets once per login session and speaks (in Arabic) when a new notification arrives. A small button mutes it.
export default function VoiceAnnouncer() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [on, setOn] = useState(voiceEnabled())
  const [needsTap, setNeedsTap] = useState(true)
  const [note, setNote] = useState('')
  const seen = useRef<Set<string> | null>(null)
  const pending = useRef<string[]>([])
  const unlocked = useRef(false)

  async function say(text: string) {
    const r = await speak(text)
    if (r === 'blocked' && !unlocked.current) { if (pending.current.length < 2) pending.current.push(text) }
    return r
  }

  // The first tap anywhere unlocks speech for the rest of the visit, and plays anything that was waiting.
  useEffect(() => {
    if (!voiceSupported()) return
    const h = () => {
      unlocked.current = true; setNeedsTap(false); unlockSpeech()
      const q = pending.current.splice(0)
      q.forEach(t => { void speak(t) })
      ;['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, h))
    }
    ;['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, h, { passive: true }))
    return () => { ;['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, h)) }
  }, [])

  useEffect(() => {
    if (!user?.id || !voiceSupported()) return
    try {
      if (sessionStorage.getItem('aq_voice_hello') !== user.id) {
        sessionStorage.setItem('aq_voice_hello', user.id)
        void say(greeting())
      }
    } catch { /* ignore */ }

    let stop = false, busy = false
    async function poll() {
      if (stop || busy || document.hidden) return // a hidden tab is not polled; the next visit catches up
      busy = true
      try {
        const { data } = await supabase.from('notifications').select('id, type, title_ar, message_ar, created_at')
          .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(8)
        const rows = (data || []) as N[]
        if (seen.current === null) { seen.current = new Set(rows.map(r => r.id)); return } // what already exists is never spoken
        const fresh = rows.filter(r => !seen.current!.has(r.id)).reverse()
        fresh.forEach(r => seen.current!.add(r.id))
        if (fresh.some(r => MONEY.includes(r.type))) {
          // Money moved: refresh balances right away instead of waiting for the next timer.
          for (const k of ['wallet-balances', 'ledger', 'investment-portfolio', 'trading-portfolio', 'notifications', 'unread-count']) void qc.invalidateQueries({ queryKey: [k] })
        }
        const recent = fresh.filter(r => Date.now() - new Date(r.created_at).getTime() < 30 * 60000)
        for (const r of recent.slice(-2)) { const p = phraseFor(r); if (p) await say(p) }
      } finally { busy = false }
    }
    void poll()
    const t = setInterval(() => { void poll() }, 10000)
    const vis = () => { if (!document.hidden) void poll() }
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('focus', vis)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('focus', vis) }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!voiceSupported()) return null
  async function toggle() {
    const n = !on
    setOn(n); setVoiceEnabled(n); setNote('')
    if (!n) return
    unlocked.current = true; setNeedsTap(false)
    const r = await speak('تم تشغيل الصوت. أهلاً بك.')
    if (HELP[r]) setNote(HELP[r] as string)
  }
  return (
    <>
      {note && (
        <div role="status" onClick={() => setNote('')} style={{ position: 'fixed', left: 12, right: 12, bottom: 136, zIndex: 61, background: '#1a1a1a', color: '#fff', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.8, fontFamily: 'Cairo' }}>{note}</div>
      )}
      {on && needsTap && !note && (
        <div style={{ position: 'fixed', left: 58, bottom: 96, zIndex: 60, background: 'rgba(20,20,20,0.92)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontFamily: 'Cairo' }}>المس الشاشة لتفعيل الصوت</div>
      )}
      <button type="button" aria-label={on ? 'إيقاف الصوت' : 'تشغيل الصوت'} title={on ? 'إيقاف الصوت' : 'تشغيل الصوت'} onClick={() => { void toggle() }}
        style={{ position: 'fixed', left: 12, bottom: 88, zIndex: 60, width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.35)', background: 'rgba(20,20,20,0.9)', color: on ? '#D4AF37' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {on ? <Volume2 size={17} /> : <VolumeX size={17} />}
      </button>
    </>
  )
}

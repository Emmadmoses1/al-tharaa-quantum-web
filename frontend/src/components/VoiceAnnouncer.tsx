import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { speak, greeting, phraseFor, voiceSupported, voiceEnabled, setVoiceEnabled } from '../lib/voice'

type N = { id: string; type: string; title_ar: string | null; message_ar: string | null }

// Greets once per login session and speaks (in Arabic) when a new notification arrives. A small button mutes it.
export default function VoiceAnnouncer() {
  const { user } = useAuth()
  const [on, setOn] = useState(voiceEnabled())
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!user?.id || !voiceSupported()) return
    try {
      if (sessionStorage.getItem('aq_voice_hello') !== user.id) {
        sessionStorage.setItem('aq_voice_hello', user.id)
        void speak(greeting())
      }
    } catch { /* ignore */ }

    let stop = false
    async function poll() {
      if (stop) return
      const { data } = await supabase.from('notifications').select('id, type, title_ar, message_ar')
        .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(8)
      const rows = (data || []) as N[]
      if (seen.current === null) { seen.current = new Set(rows.map(r => r.id)); return } // what already exists is never spoken
      const fresh = rows.filter(r => !seen.current!.has(r.id)).reverse()
      fresh.forEach(r => seen.current!.add(r.id))
      if (document.hidden) return
      for (const r of fresh.slice(-2)) { const p = phraseFor(r); if (p) await speak(p) }
    }
    void poll()
    const t = setInterval(() => { void poll() }, 12000)
    return () => { stop = true; clearInterval(t) }
  }, [user?.id])

  if (!voiceSupported()) return null
  return (
    <button type="button" aria-label={on ? 'إيقاف الصوت' : 'تشغيل الصوت'} title={on ? 'إيقاف الصوت' : 'تشغيل الصوت'}
      onClick={() => { const n = !on; setOn(n); setVoiceEnabled(n); if (n) void speak('تم تشغيل الصوت.') }}
      style={{ position: 'fixed', left: 12, bottom: 88, zIndex: 60, width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.35)', background: 'rgba(20,20,20,0.9)', color: on ? '#D4AF37' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {on ? <Volume2 size={17} /> : <VolumeX size={17} />}
    </button>
  )
}

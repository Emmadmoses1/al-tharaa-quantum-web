import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react'
import { randomChallenge, uploadFace } from '../lib/face'

type Phase = 'intro' | 'live' | 'review' | 'sending' | 'sent'

// Live camera selfie only (no gallery upload). The photo goes to a private bucket and is reviewed by an admin.
export default function FaceCapture({ userId, onDone, onSkip }: { userId: string; onDone: () => void; onSkip?: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [challenge] = useState(randomChallenge)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const blob = useRef<Blob | null>(null)

  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null }
  useEffect(() => () => { stop() }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function start() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) return setError('الكاميرا غير مدعومة في هذا المتصفح. افتح الموقع في Chrome أو Safari.')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      stream.current = s
      setPhase('live')
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}) } })
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      setError(name === 'NotAllowedError' ? 'تم رفض إذن الكاميرا. اسمح بالوصول للكاميرا من إعدادات المتصفح ثم حاول مجدداً.' : 'تعذر تشغيل الكاميرا. تأكد أنها غير مستخدمة في تطبيق آخر.')
    }
  }

  function snap() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const size = Math.min(v.videoWidth, v.videoHeight)
    const out = Math.min(size, 640)
    const c = document.createElement('canvas')
    c.width = c.height = out
    const x = c.getContext('2d')
    if (!x) return
    x.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, out, out)
    c.toBlob(b => {
      if (!b) return setError('تعذر التقاط الصورة. حاول مجدداً.')
      blob.current = b
      setPreview(URL.createObjectURL(b))
      stop()
      setPhase('review')
    }, 'image/jpeg', 0.85)
  }

  async function send() {
    if (!blob.current) return
    setPhase('sending'); setError('')
    try {
      await uploadFace(userId, blob.current, challenge)
      setPhase('sent')
    } catch {
      setError('تعذر إرسال الصورة. تحقق من الاتصال وحاول مجدداً.')
      setPhase('review')
    }
  }

  const btn = (primary: boolean): React.CSSProperties => ({
    width: '100%', padding: 13, borderRadius: 10, fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    border: primary ? 'none' : '1px solid rgba(212,175,55,0.35)', background: primary ? 'linear-gradient(135deg, #D4AF37, #E8CC6A)' : 'transparent', color: primary ? '#0B0B0B' : '#D4AF37',
  })

  return (
    <div style={{ background: 'rgba(44,44,44,0.4)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 22, direction: 'rtl', textAlign: 'center' }}>
      {error && (
        <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'right', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo', lineHeight: 1.6 }}>{error}</span>
        </div>
      )}

      {phase === 'intro' && (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Camera size={28} color="#D4AF37" /></div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Cairo', lineHeight: 1.9, margin: '0 0 6px' }}>سنلتقط صورة حية لوجهك للتأكد من هويتك وحماية حسابك وأموالك.</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', lineHeight: 1.8, margin: '0 0 16px' }}>الصورة تُحفظ بشكل خاص ولا يراها إلا فريق المراجعة.</p>
          <button type="button" onClick={start} style={btn(true)}>تشغيل الكاميرا</button>
          {onSkip && <button type="button" onClick={onSkip} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer', marginTop: 12 }}>لاحقاً</button>}
        </>
      )}

      {phase === 'live' && (
        <>
          <div style={{ fontSize: 14, color: '#D4AF37', fontFamily: 'Cairo', fontWeight: 700, marginBottom: 10 }}>{challenge}</div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', background: '#000', border: '2px solid rgba(212,175,55,0.4)', marginBottom: 14 }}>
            <video ref={video} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', margin: '0 0 12px' }}>ضع وجهك في المنتصف في إضاءة جيدة، وأظهر الحركة المطلوبة بوضوح.</p>
          <button type="button" onClick={snap} style={btn(true)}>التقاط الصورة</button>
        </>
      )}

      {(phase === 'review' || phase === 'sending') && preview && (
        <>
          <img src={preview} alt="" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 16, border: '2px solid rgba(212,175,55,0.4)', marginBottom: 12, transform: 'scaleX(-1)' }} />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', margin: '0 0 12px' }}>تأكد أن وجهك واضح وأن الحركة «{challenge}» ظاهرة.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <button type="button" disabled={phase === 'sending'} onClick={send} style={{ ...btn(true), opacity: phase === 'sending' ? 0.6 : 1 }}>{phase === 'sending' ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}</button>
            <button type="button" disabled={phase === 'sending'} onClick={() => { setPreview(null); blob.current = null; start() }} style={{ ...btn(false), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><RefreshCw size={15} />إعادة الالتقاط</button>
          </div>
        </>
      )}

      {phase === 'sent' && (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><ShieldCheck size={30} color="#10b981" /></div>
          <p style={{ fontSize: 15, color: '#fff', fontFamily: 'Cairo', fontWeight: 700, margin: '0 0 6px' }}>تم استلام صورتك</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', lineHeight: 1.8, margin: '0 0 16px' }}>سنراجعها ونُبلغك بالنتيجة عبر البريد الإلكتروني.</p>
          <button type="button" onClick={onDone} style={btn(true)}>متابعة</button>
        </>
      )}
    </div>
  )
}

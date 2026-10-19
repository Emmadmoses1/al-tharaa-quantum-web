import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LifeBuoy, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

/* eslint-disable @typescript-eslint/no-explicit-any */
const ST: Record<string, { t: string; c: string }> = {
  open: { t: 'مفتوحة', c: '#f59e0b' },
  in_progress: { t: 'قيد المعالجة', c: '#6366f1' },
  resolved: { t: 'تم الحل', c: '#10b981' },
  closed: { t: 'مغلقة', c: '#6b7280' },
}
const field = { width: '100%', background: 'rgba(11,11,11,0.6)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '13px 14px', color: '#fff', fontSize: 16, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 }

export default function SupportPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('support_tickets').select('*')
        .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      return (data || []) as any[]
    },
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setOk(false)
    if (subject.trim().length < 3) return setErr('اكتب عنواناً واضحاً')
    if (message.trim().length < 10) return setErr('اشرح مشكلتك بتفصيل أكثر')
    setBusy(true)
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user!.id, subject: subject.trim(), message: message.trim(),
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setSubject(''); setMessage(''); setOk(true)
    qc.invalidateQueries({ queryKey: ['my-tickets'] })
  }

  return (
    <div style={{ direction: 'rtl', maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Cairo', color: '#fff', marginBottom: 6 }}>الدعم</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo', marginBottom: 20 }}>
        أرسل مشكلتك أو سؤالك وسيرد عليك فريقنا هنا وفي الإشعارات.
      </p>

      <form onSubmit={submit} className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="العنوان" maxLength={120} style={field} />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اشرح بالتفصيل (لا ترسل كلمة المرور أبداً)" rows={4} maxLength={2000} style={{ ...field, resize: 'vertical' }} />
        {err && <div style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Cairo', marginBottom: 10 }}>{err}</div>}
        {ok && <div style={{ fontSize: 13, color: '#10b981', fontFamily: 'Cairo', marginBottom: 10 }}>تم إرسال تذكرتك.</div>}
        <button type="submit" disabled={busy} className="btn-gold" style={{ width: '100%', minHeight: 48, fontSize: 15, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'جارٍ الإرسال…' : 'إرسال'}
        </button>
      </form>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo', marginBottom: 10 }}>تذاكري</div>
      {isLoading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo' }}>جارٍ التحميل…</div>
      ) : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Cairo', fontSize: 14 }}>
          <LifeBuoy size={30} color="rgba(212,175,55,0.25)" style={{ marginBottom: 8 }} /><div>لا توجد تذاكر بعد</div>
        </div>
      ) : data.map(t => {
        const s = ST[t.status] || ST.open
        return (
          <div key={t.id} className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{t.subject}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.c, background: `${s.c}1a`, borderRadius: 6, padding: '3px 9px', fontFamily: 'Cairo', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{s.t}</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{t.message}</div>
            {t.admin_response && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#10b981', fontFamily: 'Cairo', marginBottom: 6 }}>
                  <CheckCircle2 size={14} /> رد الدعم
                </div>
                <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Cairo', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{t.admin_response}</div>
              </div>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', marginTop: 10 }} dir="ltr">
              {new Date(t.created_at).toLocaleString('en-GB')}
            </div>
          </div>
        )
      })}
    </div>
  )
}

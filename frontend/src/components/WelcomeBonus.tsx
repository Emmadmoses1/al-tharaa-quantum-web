import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { playSound } from '../lib/sound'

type Claim = { claimed: boolean; reason?: string; usd?: number; amount?: number; asset?: string; local?: { currency: string; amount: number } | null }

// Captures ?ref= links, applies a referral once after login, then claims the welcome bonus (the server decides if it is due).
export default function WelcomeBonus() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [res, setRes] = useState<Claim | null>(null)
  const done = useRef<string | null>(null)

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('ref')
      if (code && /^[A-Za-z0-9]{4,20}$/.test(code)) localStorage.setItem('ref_code', code.toUpperCase())
    } catch { /* storage blocked */ }
  }, [])

  useEffect(() => {
    if (!user?.id || done.current === user.id) return
    done.current = user.id
    ;(async () => {
      try {
        const code = localStorage.getItem('ref_code')
        if (code) {
          await api.post('/api/referral/apply', { code }).catch(() => null)
          localStorage.removeItem('ref_code')
        }
      } catch { /* ignore */ }
      try {
        const r = await api.post<Claim>('/api/bonus/claim', {})
        if (r.claimed || r.reason === 'confirm_email') setRes(r)
        if (r.claimed) {
          playSound('deposit')
          qc.invalidateQueries({ queryKey: ['wallet-balances'] })
          qc.invalidateQueries({ queryKey: ['turnover'] })
        }
      } catch { /* bonus is optional */ }
    })()
  }, [user?.id, qc])

  if (!res) return null
  const box: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }
  const card: React.CSSProperties = { background: '#141414', border: '1px solid rgba(212,175,55,0.5)', borderRadius: 18, padding: 26, maxWidth: 380, width: '100%', textAlign: 'center' }

  return (
    <div style={box} onClick={() => setRes(null)}>
      <div style={card} onClick={e => e.stopPropagation()}>
        {res.claimed ? (
          <>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎁</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#D4AF37', fontFamily: 'Cairo', marginBottom: 8 }}>مكافأة الترحيب</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat', direction: 'ltr' }}>{res.amount} {res.asset}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', margin: '6px 0 14px', lineHeight: 1.8 }}>
              ≈ ${res.usd}{res.local ? ` ≈ ${res.local.amount.toLocaleString('en-US')} ${res.local.currency}` : ''}<br />
              أُضيفت إلى محفظة التداول. يُفتح سحبها بعد تداول 4 أضعاف قيمتها.
            </div>
            <button type="button" className="btn-gold" style={{ width: '100%', padding: '13px 0', fontSize: 15 }} onClick={() => { setRes(null); nav('/dashboard/trade') }}>ابدأ التداول</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✉️</div>
            <div style={{ fontSize: 15, color: '#fff', fontFamily: 'Cairo', lineHeight: 1.9, marginBottom: 14 }}>أكّد بريدك الإلكتروني (افتح رسالة التفعيل) ثم سجّل الدخول مجدداً لتستلم مكافأة الترحيب.</div>
            <button type="button" className="btn-outline-gold" style={{ width: '100%', padding: '12px 0' }} onClick={() => setRes(null)}>حسناً</button>
          </>
        )}
      </div>
    </div>
  )
}

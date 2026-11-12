import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Share2, Copy, Check } from 'lucide-react'
import { api } from '../lib/api'

type Ref = { code: string; referred: number; earned_usdt: number; enabled: boolean; reward_usdt: number; min_deposit_usdt: number }

// One-tap invite: native share sheet where available, plus WhatsApp / Telegram / copy. Reward numbers come from your real settings.
export default function InviteShare() {
  const q = useQuery({ queryKey: ['referral'], staleTime: 60000, retry: 0, queryFn: () => api.get<Ref>('/api/referral/me') })
  const [copied, setCopied] = useState(false)
  const r = q.data
  if (!r || !r.enabled || !r.code) return null
  const link = `${window.location.origin}/register?ref=${r.code}`
  const text = `انضم إلى الثراء كوانتوم: منصة استثمار وتداول بالعربية. سجّل من رابطي:`
  const full = `${text} ${link}`
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function share() {
    try { await navigator.share({ title: 'الثراء كوانتوم', text, url: link }) } catch { /* user cancelled */ }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }
  const btn: React.CSSProperties = { flex: 1, minHeight: 42, borderRadius: 10, border: '1px solid rgba(212,175,55,0.3)', background: 'transparent', color: '#D4AF37', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', padding: '0 12px' }
  return (
    <div className="dq-card" style={{ padding: 16, margin: '0 0 16px', direction: 'rtl' }}>
      <div style={{ color: '#fff', fontFamily: 'Cairo', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>ادعُ أصدقاءك</div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', fontSize: 12, lineHeight: 1.8, marginBottom: 12 }}>
        تحصل على {r.reward_usdt} USDT عندما يودع صديقك لأول مرة {r.min_deposit_usdt}$ أو أكثر.
        {r.referred > 0 ? ` دعوت حتى الآن ${r.referred}.` : ''}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canShare ? <button type="button" onClick={share} style={{ ...btn, background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)', color: '#0B0B0B', border: 'none' }}><Share2 size={15} />شارك</button> : null}
        <a href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer" style={btn}>واتساب</a>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" style={btn}>تيليجرام</a>
        <button type="button" onClick={copy} style={btn}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'تم النسخ' : 'نسخ الرابط'}</button>
      </div>
    </div>
  )
}

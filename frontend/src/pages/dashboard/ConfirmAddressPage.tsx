import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, XCircle } from 'lucide-react'
import { api } from '../../lib/api'

// Opened from the email link: confirms a new withdrawal address for this account.
export default function ConfirmAddressPage() {
  const [sp] = useSearchParams()
  const [state, setState] = useState<'wait' | 'ok' | 'err'>('wait')
  const [msg, setMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const t = sp.get('t') || ''
    api.post('/api/withdrawals/confirm', { token: t })
      .then(() => setState('ok'))
      .catch((e: unknown) => { setMsg(e instanceof Error ? e.message : 'Failed'); setState('err') })
  }, [sp])

  return (
    <div className="glass-card" style={{ maxWidth: 480, margin: '40px auto', padding: 32, textAlign: 'center' }}>
      {state === 'wait' && <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Cairo' }}>جارٍ التأكيد…</div>}
      {state === 'ok' && (<>
        <ShieldCheck size={44} color="#10b981" />
        <h2 style={{ color: '#fff', fontFamily: 'Cairo', margin: '12px 0 6px' }}>تم تأكيد العنوان</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.8 }}>عد إلى صفحة السحب وقدّم الطلب مرة أخرى.</p>
        <Link to="/dashboard/withdraw" style={{ color: '#D4AF37', fontFamily: 'Cairo' }}>صفحة السحب ←</Link>
      </>)}
      {state === 'err' && (<>
        <XCircle size={44} color="#ef4444" />
        <h2 style={{ color: '#fff', fontFamily: 'Cairo', margin: '12px 0 6px' }}>تعذّر التأكيد</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', lineHeight: 1.8 }}>{msg}</p>
        <Link to="/dashboard/withdraw" style={{ color: '#D4AF37', fontFamily: 'Cairo' }}>صفحة السحب ←</Link>
      </>)}
    </div>
  )
}

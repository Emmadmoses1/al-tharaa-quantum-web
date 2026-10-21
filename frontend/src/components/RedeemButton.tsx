import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useSite } from '../lib/useSite'

export default function RedeemButton({ id, status, amount }: { id: string; status: string; amount: number }) {
  const { data: site } = useSite()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (status !== 'active' || !site?.investments.early_redeem_enabled) return null
  const pen = site.investments.early_redeem_penalty_percent
  const refund = amount * (1 - pen / 100)

  async function go() {
    if (!window.confirm(`استرداد مبكر: تُخصم غرامة ${pen}% من المبلغ المستثمر. ستستلم ${refund.toFixed(3)} USDT في محفظة الاستثمار. لا يمكن التراجع. هل تريد المتابعة؟`)) return
    setBusy(true); setMsg(null)
    try {
      await api.post(`/api/redeem/${id}`, {})
      qc.invalidateQueries({ queryKey: ['investment-portfolio'] })
      qc.invalidateQueries({ queryKey: ['wallet-balances'] })
      setMsg('تم الاسترداد')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'فشل الاسترداد') }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 8, textAlign: 'right' }}>
      <button type="button" disabled={busy} onClick={go}
        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontFamily: 'Cairo', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
        {busy ? '...' : `استرداد مبكر (غرامة ${pen}%)`}
      </button>
      {msg && <div style={{ fontSize: 11, color: '#D4AF37', fontFamily: 'Cairo', marginTop: 4 }}>{msg}</div>}
    </div>
  )
}

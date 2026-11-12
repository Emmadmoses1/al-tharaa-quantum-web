import { useLocalCurrency, useLocalMoney } from '../lib/useLocalMoney'

// "≈ 1,234.00 BHD" shown under a crypto amount, using the exchange rate locked when the user registered.
export function LocalAmt({ usdt }: { usdt: number }) {
  const fmt = useLocalMoney()
  const s = fmt(usdt)
  if (!s) return null
  return <div dir="ltr" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', textAlign: 'right', marginTop: 2 }}>≈ {s}</div>
}

export function LocalRateNote() {
  const { data } = useLocalCurrency()
  if (!data || data.currency === 'USD' || !data.rate) return null
  const when = data.locked_at ? new Date(data.locked_at).toLocaleDateString('en-GB') : ''
  return (
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Cairo', marginTop: 10, lineHeight: 1.7 }}>
      المبالغ بـ {data.currency} تقريبية، بسعر الصرف المثبّت وقت تسجيلك{when ? ` (${when})` : ''}: 1 USDT ≈ {data.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {data.currency}
    </div>
  )
}

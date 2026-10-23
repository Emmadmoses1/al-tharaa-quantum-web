import { useState } from 'react'
import { Zap, CreditCard, Hand } from 'lucide-react'
import DepositPage from '../pages/dashboard/DepositPage'
import NowPaymentsDeposit from './NowPaymentsDeposit'
import CardDeposit from './CardDeposit'
import { useSite } from '../lib/useSite'

type Tab = 'crypto' | 'card' | 'manual'

// Deposit methods in tabs: automatic crypto, bank card, manual address.
export default function DepositSwitch() {
  const { data: site } = useSite()
  const [tab, setTab] = useState<Tab | null>(null)
  const hasCrypto = !!site?.payments?.nowpayments
  const hasCard = !!site?.payments?.card
  if (!hasCrypto && !hasCard) return <DepositPage />

  const fromCard = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('card')
  const cur: Tab = tab ?? (fromCard && hasCard ? 'card' : hasCrypto ? 'crypto' : 'card')
  const tabs = ([
    hasCrypto && { k: 'crypto', l: 'عملات رقمية', icon: Zap },
    hasCard && { k: 'card', l: 'بطاقة بنكية', icon: CreditCard },
    { k: 'manual', l: 'يدوي', icon: Hand },
  ].filter(Boolean)) as { k: Tab; l: string; icon: typeof Zap }[]

  return (
    <div>
      <div style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto 16px', display: 'flex', gap: 6, padding: 5, background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 14 }}>
        {tabs.map(t => (
          <button key={t.k} type="button" onClick={() => setTab(t.k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, background: cur === t.k ? 'linear-gradient(135deg,#F6DE8D,#D4AF37 55%,#A8871C)' : 'transparent', color: cur === t.k ? '#0B0B0B' : 'rgba(255,255,255,0.6)' }}>
            <t.icon size={15} />{t.l}
          </button>
        ))}
      </div>
      {cur === 'crypto' && hasCrypto && <NowPaymentsDeposit />}
      {cur === 'card' && hasCard && <CardDeposit />}
      {cur === 'manual' && <DepositPage />}
    </div>
  )
}

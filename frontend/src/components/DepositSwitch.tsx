import DepositPage from '../pages/dashboard/DepositPage'
import NowPaymentsDeposit from './NowPaymentsDeposit'
import { useSite } from '../lib/useSite'

// When NOWPayments is connected, automatic deposit comes first and the manual address flow stays below it.
export default function DepositSwitch() {
  const { data: site } = useSite()
  if (!site?.payments?.nowpayments) return <DepositPage />
  return (
    <div>
      <NowPaymentsDeposit />
      <details style={{ direction: 'rtl', maxWidth: 560, margin: '0 auto 14px' }}>
        <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo', fontSize: 13, padding: '8px 0' }}>إيداع يدوي بعنوان المنصة، وسجل الإيداعات</summary>
        <div style={{ marginTop: 10 }}><DepositPage /></div>
      </details>
    </div>
  )
}

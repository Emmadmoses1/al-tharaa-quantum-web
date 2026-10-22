import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type SiteSettings = {
  platform_name: string; support_email: string; maintenance: boolean; maintenance_message: string
  bonus: { enabled: boolean; usd: number }
  referral: { enabled: boolean; reward_usdt: number }
  investments: { early_redeem_enabled: boolean; early_redeem_penalty_percent: number }
  license_text?: string
  public?: { users: number | null }
  payments?: { nowpayments: boolean; min_usd: number; max_usd: number }
  invoice: { company_name: string; address: string; tax_id: string; footer: string }
}

export function useSite() {
  return useQuery({ queryKey: ['site-settings'], staleTime: 60000, queryFn: () => api.get<SiteSettings>('/api/public/settings') })
}

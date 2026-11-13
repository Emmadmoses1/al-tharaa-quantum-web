import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type PayoutItem = { name: string; amount: number; asset: string; network: string; at: string; txid: string; url: string | null }
export type Payouts = { count: number; total_usd: number; median_minutes: number | null; items: PayoutItem[] }

export function usePayouts(n: number) {
  return useQuery({ queryKey: ['payouts', n], staleTime: 60000, retry: 0, queryFn: () => api.get<Payouts>(`/api/public/payouts?n=${n}`) })
}

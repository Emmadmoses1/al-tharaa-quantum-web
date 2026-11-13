import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type LocalCur = { currency: string; symbol: string; decimals: number; rate: number | null; locked_at: string | null }

export function useLocalCurrency() {
  return useQuery({ queryKey: ['currency-me'], staleTime: 10 * 60000, retry: 0, queryFn: () => api.get<LocalCur>('/api/currency/me') })
}

// Converts a USDT amount into the user's own currency at the rate locked for them. Returns null when there is nothing to show.
export function useLocalMoney() {
  const { data } = useLocalCurrency()
  return (usdt: number): string | null => {
    if (!data || data.currency === 'USD' || !data.rate || !Number.isFinite(usdt)) return null
    const v = usdt * data.rate
    return `${v.toLocaleString('en-US', { minimumFractionDigits: data.decimals, maximumFractionDigits: data.decimals })} ${data.currency}`
  }
}

// An amount in any platform currency (for example BHD), shown as crypto (USDT) and in the user's own currency.
export function useInvestMoney() {
  const me = useLocalCurrency()
  const rates = useQuery({ queryKey: ['fx-rates'], staleTime: 30 * 60000, retry: 0, queryFn: () => api.get<Record<string, number>>('/api/currency/rates') })
  return (amount: number, cur: string): { usdt: number; local: string | null } | null => {
    const r = rates.data?.[String(cur || '').toUpperCase()]
    if (!r || !(amount > 0) || !Number.isFinite(amount)) return null
    const usdt = amount / r
    const m = me.data
    let local: string | null = null
    if (m && m.currency !== 'USD' && m.rate) {
      const v = m.currency === String(cur).toUpperCase() ? amount : usdt * m.rate
      local = `${v.toLocaleString('en-US', { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals })} ${m.currency}`
    }
    return { usdt, local }
  }
}

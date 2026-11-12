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

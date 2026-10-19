import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface WalletBalance {
  ledger_type: 'investment' | 'trading'
  asset: string
  balance: number
}

// Wallet balance = latest ledger balance_after per (ledger_type, asset).
export function useWalletBalances() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['wallet-balances', user?.id],
    enabled: !!user?.id,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<WalletBalance[]> => {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('ledger_type, asset, balance_after, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      const seen = new Map<string, WalletBalance>()
      for (const row of data || []) {
        const key = `${row.ledger_type}:${row.asset}`
        if (!seen.has(key)) {
          seen.set(key, { ledger_type: row.ledger_type, asset: row.asset, balance: Number(row.balance_after) })
        }
      }
      return Array.from(seen.values())
    },
  })
}

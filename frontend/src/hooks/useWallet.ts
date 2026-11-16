import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface WalletBalance {
  ledger_type: 'investment' | 'trading'
  asset: string
  balance: number
}

const LEDGERS = ['investment', 'trading'] as const
const ASSETS = ['USDT', 'USDC', 'BTC', 'ETH'] as const
const ck = (uid: string) => `aq_wb_${uid}`

// The last balances this device saw for this account, so a refresh shows real numbers at once while the fresh ones load.
function cached(uid?: string): WalletBalance[] | undefined {
  if (!uid) return undefined
  try { const v = JSON.parse(localStorage.getItem(ck(uid)) || 'null'); return Array.isArray(v) ? v : undefined } catch { return undefined }
}

// Wallet balance = latest ledger balance_after per (ledger_type, asset). One tiny query per wallet, run in parallel.
export function useWalletBalances() {
  const { user } = useAuth()
  const uid = user?.id
  return useQuery({
    queryKey: ['wallet-balances', uid],
    enabled: !!uid,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    placeholderData: () => cached(uid),
    queryFn: async (): Promise<WalletBalance[]> => {
      const res = await Promise.all(LEDGERS.flatMap(l => ASSETS.map(async a => {
        const { data, error } = await supabase.from('ledger_entries').select('balance_after')
          .eq('user_id', uid!).eq('ledger_type', l).eq('asset', a)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1)
        if (error) throw error
        return data && data.length ? { ledger_type: l, asset: a, balance: Number(data[0].balance_after) } as WalletBalance : null
      })))
      const out = res.filter((x): x is WalletBalance => !!x)
      try { localStorage.setItem(ck(uid!), JSON.stringify(out)) } catch { /* ignore */ }
      return out
    },
  })
}

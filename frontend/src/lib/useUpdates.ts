import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type Update = { id: string; title: string; body: string | null; media_url: string | null; media_type: 'image' | 'video' | null; created_at: string }

export function useOppUpdates(oppId: string) {
  return useQuery({ queryKey: ['opp-updates', oppId], staleTime: 60000, retry: 0, queryFn: () => api.get<Update[]>(`/api/public/opportunity-updates/${oppId}`) })
}

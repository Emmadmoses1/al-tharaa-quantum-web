import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export type LegalDoc = {
  id: number; doc_type: 'license' | 'registration' | 'certificate' | 'policy' | 'other'
  title_ar: string; title: string | null; issuer: string | null; number: string | null
  issued_at: string | null; expires_at: string | null; mime: string; url: string
}
export type LegalPublic = {
  license_text: string
  company: { name: string; address: string; tax_id: string }
  documents: LegalDoc[]
}

export const DOC_TYPES: Record<LegalDoc['doc_type'], { ar: string; en: string }> = {
  license: { ar: 'ترخيص', en: 'Licence' },
  registration: { ar: 'سجل تجاري / تسجيل', en: 'Registration' },
  certificate: { ar: 'شهادة', en: 'Certificate' },
  policy: { ar: 'سياسة', en: 'Policy' },
  other: { ar: 'وثيقة', en: 'Document' },
}

export function useLegal() {
  return useQuery({ queryKey: ['public-legal'], staleTime: 60000, queryFn: () => api.get<LegalPublic>('/api/public/legal') })
}

import { useState } from 'react'
import { Plus, TrendingUp, AlertTriangle, Edit } from 'lucide-react'
import { useAdminOpportunities, useAdminCreateOpportunity, useAdminUpdateOpportunity } from '../../hooks/useData'
import { TableRowSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(107,114,128,0.1)', text: '#9ca3af' },
  open: { bg: 'rgba(16,185,129,0.1)', text: '#10b981' },
  funding: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8' },
  funded: { bg: 'rgba(212,175,55,0.1)', text: '#D4AF37' },
  active: { bg: 'rgba(16,185,129,0.1)', text: '#10b981' },
  completed: { bg: 'rgba(107,114,128,0.1)', text: '#9ca3af' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  suspended: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
}

const CATEGORIES = ['technology', 'real_estate', 'startups', 'agriculture', 'renewable_energy', 'infrastructure', 'funds', 'sukuk', 'consumer_businesses', 'project_financing']
const RISK_LEVELS = ['low', 'medium', 'high', 'very_high']
const STATUSES = Object.keys(STATUS_COLORS)

const EMPTY_FORM = {
  name: '', name_ar: '', category: 'technology',
  location: '', description: '', description_ar: '',
  minimum_investment: '', target_amount: '', currency: 'USDT',
  risk_level: 'medium', duration_days: '',
  projected_return_min: '', projected_return_max: '',
  fees_percent: '1.5', status: 'draft',
}

export default function AdminOpportunities() {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: opps, isLoading, isError, refetch } = useAdminOpportunities()
  const createOpp = useAdminCreateOpportunity()
  const updateOpp = useAdminUpdateOpportunity()

  function setF(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(opp: Record<string, unknown>) {
    setForm({
      name: String(opp.name || ''),
      name_ar: String(opp.name_ar || ''),
      category: String(opp.category || 'technology'),
      location: String(opp.location || ''),
      description: String(opp.description || ''),
      description_ar: String(opp.description_ar || ''),
      minimum_investment: String(opp.minimum_investment || ''),
      target_amount: String(opp.target_amount || ''),
      currency: String(opp.currency || 'USDT'),
      risk_level: String(opp.risk_level || 'medium'),
      duration_days: String(opp.duration_days || ''),
      projected_return_min: String(opp.projected_return_min || ''),
      projected_return_max: String(opp.projected_return_max || ''),
      fees_percent: String(opp.fees_percent || '1.5'),
      status: String(opp.status || 'draft'),
    })
    setEditingId(opp.id as string)
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit() {
    setFormError(null)
    if (!form.name.trim()) return setFormError('Name is required')
    if (!form.minimum_investment || Number(form.minimum_investment) <= 0) return setFormError('Minimum investment required')
    if (!form.target_amount || Number(form.target_amount) <= 0) return setFormError('Target amount required')

    const payload = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim() || null,
      category: form.category,
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      description_ar: form.description_ar.trim() || null,
      minimum_investment: Number(form.minimum_investment),
      target_amount: Number(form.target_amount),
      currency: form.currency,
      risk_level: form.risk_level,
      duration_days: form.duration_days ? Number(form.duration_days) : null,
      projected_return_min: form.projected_return_min ? Number(form.projected_return_min) : null,
      projected_return_max: form.projected_return_max ? Number(form.projected_return_max) : null,
      fees_percent: Number(form.fees_percent),
      status: form.status,
    }

    try {
      if (editingId) {
        await updateOpp.mutateAsync({ id: editingId, updates: payload })
      } else {
        await createOpp.mutateAsync(payload)
      }
      setShowModal(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(11,11,11,0.7)',
    border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8,
    padding: '10px 14px', color: '#fff', fontSize: 12,
    fontFamily: 'Montserrat', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat',
    letterSpacing: 1, marginBottom: 7,
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 4 }}>
            Investment Opportunities
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat' }}>
            {opps ? `${opps.length} opportunities` : 'Loading...'}
          </p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
          border: 'none', borderRadius: 8, padding: '10px 18px',
          color: '#0B0B0B', fontSize: 12, fontWeight: 700,
          fontFamily: 'Montserrat', cursor: 'pointer',
        }}>
          <Plus size={15} /> New Opportunity
        </button>
      </div>

      <div style={{
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)', fontFamily: 'Montserrat', lineHeight: 1.7 }}>
          All projected returns must be verified and clearly marked as illustrative. Never fabricate financial data.
        </span>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          zIndex: 500, display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center', padding: '20px 24px',
          backdropFilter: 'blur(8px)', overflowY: 'auto',
        }}>
          <div style={{
            background: '#141414', border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: 16, padding: 32, maxWidth: 600, width: '100%',
            marginTop: 20, marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Montserrat', color: '#fff', marginBottom: 24 }}>
              {editingId ? 'Edit Opportunity' : 'New Investment Opportunity'}
            </h2>

            {formError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 7, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: '#ef4444', fontFamily: 'Montserrat',
              }}>{formError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>NAME (EN) *</label>
                  <input type="text" value={form.name} onChange={e => setF('name', e.target.value)} style={inputStyle} placeholder="Opportunity name" />
                </div>
                <div>
                  <label style={labelStyle}>الاسم (AR)</label>
                  <input type="text" value={form.name_ar} onChange={e => setF('name_ar', e.target.value)} style={{ ...inputStyle, direction: 'rtl', fontFamily: 'Cairo' }} placeholder="اسم الفرصة" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>CATEGORY</label>
                  <select value={form.category} onChange={e => setF('category', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#141414' }}>{c.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>LOCATION</label>
                  <input type="text" value={form.location} onChange={e => setF('location', e.target.value)} style={inputStyle} placeholder="Bahrain" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>DESCRIPTION (EN)</label>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} placeholder="Investment opportunity description..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>MINIMUM (USDT) *</label>
                  <input type="number" value={form.minimum_investment} onChange={e => setF('minimum_investment', e.target.value)} style={inputStyle} placeholder="500" />
                </div>
                <div>
                  <label style={labelStyle}>TARGET (USDT) *</label>
                  <input type="number" value={form.target_amount} onChange={e => setF('target_amount', e.target.value)} style={inputStyle} placeholder="100000" />
                </div>
                <div>
                  <label style={labelStyle}>DURATION (DAYS)</label>
                  <input type="number" value={form.duration_days} onChange={e => setF('duration_days', e.target.value)} style={inputStyle} placeholder="365" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>RISK</label>
                  <select value={form.risk_level} onChange={e => setF('risk_level', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {RISK_LEVELS.map(r => <option key={r} value={r} style={{ background: '#141414' }}>{r.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>RETURN MIN %</label>
                  <input type="number" value={form.projected_return_min} onChange={e => setF('projected_return_min', e.target.value)} style={inputStyle} placeholder="5" />
                </div>
                <div>
                  <label style={labelStyle}>RETURN MAX %</label>
                  <input type="number" value={form.projected_return_max} onChange={e => setF('projected_return_max', e.target.value)} style={inputStyle} placeholder="15" />
                </div>
                <div>
                  <label style={labelStyle}>FEES %</label>
                  <input type="number" value={form.fees_percent} onChange={e => setF('fees_percent', e.target.value)} style={inputStyle} placeholder="1.5" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>STATUS</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {STATUSES.map(s => <option key={s} value={s} style={{ background: '#141414' }}>{s.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, background: 'transparent',
                border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8,
                padding: '11px', color: '#D4AF37',
                fontSize: 12, fontFamily: 'Montserrat', cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={createOpp.isPending || updateOpp.isPending}
                style={{
                  flex: 1, background: 'linear-gradient(135deg,#D4AF37,#E8CC6A)',
                  border: 'none', borderRadius: 8, padding: '11px',
                  color: '#0B0B0B', fontSize: 12, fontWeight: 700,
                  fontFamily: 'Montserrat', cursor: 'pointer',
                  opacity: (createOpp.isPending || updateOpp.isPending) ? 0.7 : 1,
                }}>
                {createOpp.isPending || updateOpp.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(212,175,55,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 100px 120px 80px 100px 80px',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(212,175,55,0.07)', gap: 10,
        }}>
          {['Name', 'Category', 'Target', 'Risk', 'Status', 'Edit'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat', letterSpacing: 1 }}>{h}</div>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
        ) : isError ? (
          <ErrorState english onRetry={refetch} />
        ) : !opps || opps.length === 0 ? (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <TrendingUp size={32} color="rgba(212,175,55,0.2)" />
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat' }}>
              No opportunities yet — create the first one
            </div>
          </div>
        ) : (
          opps.map((opp, i) => {
            const sc = STATUS_COLORS[opp.status] || STATUS_COLORS.draft
            return (
              <div key={opp.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 120px 80px 100px 80px',
                padding: '13px 20px',
                borderBottom: i < opps.length - 1 ? '1px solid rgba(212,175,55,0.05)' : 'none',
                gap: 10, alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Montserrat', marginBottom: 2 }}>
                    {opp.name}
                  </div>
                  {opp.name_ar && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo', direction: 'rtl', textAlign: 'left' }}>
                      {opp.name_ar}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat' }}>
                  {opp.category.replace('_', ' ')}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37', fontFamily: 'Montserrat' }}>
                  {opp.currency} {Number(opp.target_amount).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Montserrat', fontWeight: 600, color: '#f59e0b' }}>
                  {opp.risk_level.toUpperCase()}
                </div>
                <span style={{
                  background: sc.bg, color: sc.text,
                  fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat',
                  padding: '3px 8px', borderRadius: 4, display: 'inline-block',
                }}>
                  {opp.status.toUpperCase()}
                </span>
                <button
                  onClick={() => openEdit(opp as unknown as Record<string, unknown>)}
                  style={{
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    borderRadius: 6, padding: '5px 8px',
                    cursor: 'pointer', color: '#D4AF37', display: 'flex',
                  }}>
                  <Edit size={13} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

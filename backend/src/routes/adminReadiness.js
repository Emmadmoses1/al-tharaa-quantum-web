import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAdmin } from '../middleware/authGuard.js'
import { getSetting } from '../lib/settings.js'
import { getSecret } from '../lib/secrets.js'

// A real pre-launch checklist: every line is computed from the current settings, keys and data. Nothing is assumed.
const router = Router()
router.use(requireAdmin)

router.get('/', async (_req, res, next) => {
  try {
    const [g, inv, pay, em] = await Promise.all([getSetting('general'), getSetting('invoice'), getSetting('payments'), getSetting('email')])
    const [resend, npKey, npIpn] = await Promise.all([getSecret('RESEND_API_KEY'), getSecret('NOWPAYMENTS_API_KEY'), getSecret('NOWPAYMENTS_IPN_SECRET')])
    const { count: docs } = await supabase.from('legal_documents').select('id', { count: 'exact', head: true }).eq('is_public', true)
    const { count: licDocs } = await supabase.from('legal_documents').select('id', { count: 'exact', head: true }).eq('is_public', true).eq('doc_type', 'license')
    const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const { count: expiring } = await supabase.from('legal_documents').select('id', { count: 'exact', head: true }).eq('is_public', true).not('expires_at', 'is', null).lte('expires_at', soon)
    const { count: faceOld } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('face_status', 'pending').lt('face_submitted_at', new Date(Date.now() - 24 * 3600000).toISOString())
    const { count: overdue } = await supabase.from('binary_orders').select('id', { count: 'exact', head: true })
      .eq('status', 'open').lt('expires_at', new Date(Date.now() - 5 * 60000).toISOString())

    const items = [
      { key: 'email_key', level: 'required', ok: !!resend, label: 'Email sending key (Resend) is saved', hint: 'Needed for signup codes, password reset, invoices and alerts. Admin → API Keys.', href: '/admin/integrations' },
      { key: 'email_from', level: 'required', ok: !!(em.from && String(em.from).includes('@')), label: 'Sender address is set', hint: 'Use an address on your verified domain, e.g. no-reply@altharaaquantum.com. Admin → Settings → Email.', href: '/admin/settings' },
      { key: 'support_email', level: 'required', ok: !!(g.support_email && String(g.support_email).includes('@')), label: 'Support email is set', hint: 'Shown on the Help page and footer. Admin → Settings → General.', href: '/admin/settings' },
      { key: 'company', level: 'required', ok: !!(inv.company_name && inv.address), label: 'Company name and address are filled', hint: 'Shown on the Documents page and invoices. Admin → Settings → Invoices.', href: '/admin/settings' },
      { key: 'legal_docs', level: 'recommended', ok: (docs || 0) > 0, label: 'At least one legal document is published', hint: 'Upload your real licence/registration. Admin → Legal Documents.', href: '/admin/legal' },
      { key: 'license_text', level: 'recommended', ok: !!g.license_text || (licDocs || 0) > 0, label: 'A licence statement or licence document is shown', hint: 'Only fill this if it is true. It appears in the footer.', href: '/admin/settings' },
      { key: 'docs_expiry', level: 'recommended', ok: !expiring, label: 'No public document is expired or expiring within 30 days', hint: `${expiring || 0} need renewal. Admin → Legal Documents.`, href: '/admin/legal' },
      { key: 'payments', level: 'recommended', ok: !!(pay.nowpayments_enabled && npKey && npIpn), label: 'Automatic deposits (NOWPayments) are fully set up', hint: 'Enable it in Settings and save both the API key and IPN secret. Skip if you only use wallet deposits.', href: '/admin/integrations' },
      { key: 'maintenance', level: 'required', ok: !g.maintenance, label: 'Maintenance mode is off', hint: 'While on, trades and withdrawals are paused for everyone.', href: '/admin/settings' },
      { key: 'face_backlog', level: 'recommended', ok: !faceOld, label: 'No face verification is waiting more than 24 hours', hint: `${faceOld || 0} waiting. Review them in Admin → Users.`, href: '/admin/users' },
      { key: 'binary_overdue', level: 'required', ok: !overdue, label: 'No binary order is overdue for settlement', hint: `${overdue || 0} overdue. Check price feeds and server logs.`, href: '/admin/statistics' },
      { key: 'otp_pepper', level: 'recommended', ok: !!process.env.OTP_PEPPER, label: 'OTP_PEPPER environment variable is set', hint: 'Set a long random value in Render → Environment so one-time codes are hashed with their own secret.', href: '' },
      { key: 'alerts', level: 'recommended', ok: process.env.ADMIN_ALERTS !== 'off', label: 'Admin alert emails are enabled', hint: 'ADMIN_ALERTS=off disables them.', href: '' },
    ]
    const req = items.filter(i => i.level === 'required')
    res.json({ success: true, data: { items, required_done: req.filter(i => i.ok).length, required_total: req.length, ready: req.every(i => i.ok) } })
  } catch (err) { next(err) }
})

export default router

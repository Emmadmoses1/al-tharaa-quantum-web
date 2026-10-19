import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { message: 'Missing token', code: 'UNAUTHORIZED' } })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabasePublic.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' } })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

export async function requireAdmin(req, res, next) {
  try {
    await requireAuth(req, res, async () => {
      const { supabase } = await import('../lib/supabase.js')
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single()

      if (error || !profile) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden', code: 'FORBIDDEN' } })
      }

      const adminRoles = ['admin', 'super_admin', 'finance', 'trading_admin']
      if (!adminRoles.includes(profile.role)) {
        return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
      }

      req.userRole = profile.role
      next()
    })
  } catch (err) {
    next(err)
  }
}

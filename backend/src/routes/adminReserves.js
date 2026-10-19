import { Router } from 'express'
import { requireAdmin } from '../middleware/authGuard.js'
import { getReserves } from '../services/reserves.js'

const router = Router()
router.use(requireAdmin)

let lastRun = 0
router.get('/', async (req, res, next) => {
  try {
    if (!['admin', 'super_admin', 'finance'].includes(req.userRole)) {
      return res.status(403).json({ success: false, error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } })
    }
    if (Date.now() - lastRun < 15000) {
      return res.status(429).json({ success: false, error: { message: 'Please wait a few seconds between checks.', code: 'RATE_LIMITED' } })
    }
    lastRun = Date.now()
    res.json({ success: true, data: await getReserves() })
  } catch (err) { next(err) }
})

export default router

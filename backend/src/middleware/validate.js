import Joi from 'joi'

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        },
      })
    }

    req.body = value
    next()
  }
}

// Schemas
export const depositSchema = Joi.object({
  asset: Joi.string().valid('USDT', 'BTC', 'ETH', 'USDC').required(),
  network: Joi.string().max(20).required(),
  purpose: Joi.string().valid('investment', 'trading').required(),
  amount: Joi.number().positive().max(10000000).required(),
})

export const txidSchema = Joi.object({
  txid: Joi.string().min(10).max(200).required(),
})

export const withdrawalSchema = Joi.object({
  withdrawal_type: Joi.string().valid('trading', 'investment_redemption').required(),
  asset: Joi.string().valid('USDT', 'BTC', 'ETH', 'USDC').required(),
  network: Joi.string().max(20).required(),
  amount: Joi.number().positive().required(),
  destination_address: Joi.string().min(10).max(200).required(),
})

export const profileUpdateSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().max(20).allow('', null).optional(),
  preferred_currency: Joi.string().length(3).uppercase().optional(),
  preferred_language: Joi.string().valid('ar', 'en').optional(),
})

export const openTradeSchema = Joi.object({
  signal_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().max(10000000).required(),
})

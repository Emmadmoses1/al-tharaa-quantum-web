export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message || err)

  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
    },
  })
}

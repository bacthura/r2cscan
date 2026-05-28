/**
 * Error Handling Middleware
 * Centralized error handling with structured responses.
 * R2C-Scan v2.0
 */

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Not Found handler (404)
 */
export function notFound(req, res, next) {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
}

/**
 * Global error handler
 * Handles:
 * - Zod validation errors
 * - ValidationError (custom invite code errors)
 * - AppError (custom application errors)
 * - Firebase Auth errors
 * - Generic errors
 */
export function errorHandler(err, req, res, _next) {
  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 3).join('\n'),
      path: req.originalUrl,
      method: req.method
    });
  }

  // ── Zod validation errors ──
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // ── ValidationError (custom invite code errors) ──
  if (err?.name === 'ValidationError') {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message
    });
  }

  // ── AppError (custom application errors) ──
  if (err?.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  // ── Firebase Auth errors ──
  if (err?.code?.startsWith?.('auth/')) {
    return res.status(400).json({
      success: false,
      error: 'Erro de autenticação'
    });
  }

  // ── Generic / Unexpected errors ──
  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack?.split('\n').slice(0, 3).join('\n') })
  });
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
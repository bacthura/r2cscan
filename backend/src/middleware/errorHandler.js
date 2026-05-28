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

  // Determine status code
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational
    ? err.message
    : 'Erro interno do servidor';

  res.status(statusCode).json({
    error: message,
    code,
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
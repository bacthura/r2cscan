/**
 * Security Middleware
 * Helmet configuration, rate limiting, input sanitization.
 * R2C-Scan v2.0
 */
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Helmet security headers configuration
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: false, // Disabled for development; enable in production
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
}

/**
 * General API rate limiter
 */
export function apiRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: 'see Retry-After header'
    }
  });
}

/**
 * Strict rate limiter for auth endpoints
 */
export function authRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Muitas tentativas de login. Aguarde 15 minutos.'
    }
  });
}

/**
 * Sanitize request body to prevent XSS
 */
export function sanitizeInput(req, res, next) {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Remove HTML tags from string inputs
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+="[^"]*"/gi, '')
          .replace(/on\w+='[^']*'/gi, '');
      }
    }
  }
  next();
}
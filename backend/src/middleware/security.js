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
 * Remove vetores de XSS comuns de uma string.
 */
function sanitizeString(value) {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?\s*(iframe|object|embed)\b[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}

/**
 * Percorre recursivamente strings, objetos e arrays sanitizando o conteúdo.
 * Limita a profundidade para evitar estouro de pilha com payloads maliciosos.
 */
function sanitizeValue(value, depth = 0) {
  if (depth > 6) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, depth + 1));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = sanitizeValue(value[key], depth + 1);
    }
  }
  return value;
}

/**
 * Sanitize request body (inclusive aninhado) para mitigar XSS.
 */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}
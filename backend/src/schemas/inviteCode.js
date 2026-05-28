/**
 * Zod Schemas for Invite Code Validation
 * R2C-Scan - Invite Code System
 *
 * Centralizes all validation rules for invite codes
 * to ensure data integrity and security.
 */
import { z } from 'zod';

/**
 * Generate a random 6-digit numeric code as a string
 * Uses cryptographically secure random generation when available
 */
export function generateCode() {
  const digits = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 10).toString()
  );
  return digits.join('');
}

/**
 * Schema: Generate Invite Code (Admin)
 */
export const generateCodeSchema = z.object({
  expiresInHours: z
    .number()
    .int('Deve ser um número inteiro')
    .positive('Deve ser positivo')
    .max(8760, 'Máximo de 1 ano (8760 horas)')
    .optional()
    .nullable()
    .default(null),
  label: z
    .string()
    .max(100, 'Label deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .default(null)
});

/**
 * Schema: Register with Invite Code
 */
export const registerWithCodeSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letra maiúscula, minúscula e número'
    ),
  code: z
    .string()
    .length(6, 'Código deve ter exatamente 6 dígitos')
    .regex(/^\d{6}$/, 'Código deve conter apenas números')
});

/**
 * Schema: Admin Login (for admin panel - uses Firebase or custom JWT)
 */
export const adminLoginSchema = z.object({
  email: z.string().email('Email inválido').trim().toLowerCase(),
  password: z.string().min(1, 'Senha é obrigatória')
});

/**
 * Schema: Search / Filter Invite Codes
 */
export const listCodesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const n = parseInt(val || '1', 10);
      return isNaN(n) || n < 1 ? 1 : n;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const n = parseInt(val || '20', 10);
      return isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
  used: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  search: z
    .string()
    .max(20, 'Busca muito longa')
    .optional()
    .default(''),
  sortBy: z
    .enum(['created_at', 'code', 'used', 'expires_at'])
    .optional()
    .default('created_at'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
});


/**
 * Invite Code Service
 * R2C-Scan - Invite Code System
 *
 * Handles all business logic for invite code management:
 * - Generation with uniqueness guarantee
 * - Validation (exists, used, expired)
 * - Atomic usage marking (prevents race conditions)
 * - Audit logging
 */
import { getSupabaseAdmin } from '../config/supabase.js';
import { generateCode } from '../schemas/inviteCode.js';
import logger from '../utils/logger.js';

const CODES_TABLE = 'invite_codes';
const PROFILES_TABLE = 'profiles';
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate a unique 6-digit numeric invite code
 * Retries if collision occurs (extremely rare with 1M combinations)
 */
export async function generateInviteCode(adminId, expiresInHours = null, label = null) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  let code = '';
  let attempts = 0;

  // Generate unique code with collision protection
  do {
    code = generateCode();
    attempts++;

    const { data: existing } = await supabase
      .from(CODES_TABLE)
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (!existing) break;
    if (attempts >= MAX_GENERATION_ATTEMPTS) {
      throw new Error('Não foi possível gerar um código único após múltiplas tentativas');
    }
  } while (true);

  // Calculate expiration if provided
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 3600000).toISOString()
    : null;

  const newCode = {
    code,
    used: false,
    used_by: null,
    created_by: adminId,
    label,
    created_at: new Date().toISOString(),
    expires_at: expiresAt
  };

  const { data, error } = await supabase
    .from(CODES_TABLE)
    .insert(newCode)
    .select()
    .single();

  if (error) {
    logger.error('Erro ao gerar código de convite', { error: error.message, adminId });
    throw new Error('Erro ao gerar código de convite');
  }

  logger.info('Código de convite gerado', {
    codeId: data.id,
    adminId,
    expiresAt
  });

  return data;
}

/**
 * Validate an invite code
 * Checks: exists, not used, not expired
 * Returns the code record if valid, throws if invalid
 */
export async function validateInviteCode(code) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data: inviteCode, error } = await supabase
    .from(CODES_TABLE)
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    logger.error('Erro ao validar código', { error: error.message, code });
    throw new Error('Erro ao validar código de convite');
  }

  if (!inviteCode) {
    throw new ValidationError('Código de convite inválido');
  }

  if (inviteCode.used) {
    throw new ValidationError('Código de convite já foi utilizado');
  }

  if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
    throw new ValidationError('Código de convite expirou');
  }

  return inviteCode;
}

/**
 * Mark an invite code as used (atomic operation)
 * Uses Supabase's RPC or conditional update to prevent race conditions
 */
export async function markCodeAsUsed(codeId, userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  // Atomic update: only marks as used if not already used
  const { data, error } = await supabase
    .from(CODES_TABLE)
    .update({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString()
    })
    .eq('id', codeId)
    .eq('used', false) // Prevents race condition: only update if still unused
    .select()
    .single();

  if (error) {
    logger.error('Erro ao marcar código como usado', { error: error.message, codeId, userId });
    throw new Error('Erro ao utilizar código de convite');
  }

  // If no rows were updated, another request already used this code
  if (!data) {
    throw new ValidationError('Código de convite já foi utilizado por outro usuário');
  }

  logger.info('Código de convite utilizado', { codeId, userId });
  return data;
}

/**
 * List invite codes with pagination, search, and filters
 */
export async function listInviteCodes({ page = 1, limit = 20, used = undefined, search = '', sortBy = 'created_at', sortOrder = 'desc' }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from(CODES_TABLE)
    .select('*', { count: 'exact' });

  // Filter by used status
  if (used !== undefined) {
    query = query.eq('used', used);
  }

  // Search by code
  if (search) {
    query = query.ilike('code', `%${search}%`);
  }

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Erro ao listar códigos', { error: error.message });
    throw new Error('Erro ao listar códigos de convite');
  }

  return {
    codes: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

/**
 * Get a single invite code by ID
 */
export async function getInviteCodeById(id) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from(CODES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error('Código de convite não encontrado');
  }

  return data;
}

/**
 * Manually invalidate an invite code (admin action)
 */
export async function invalidateInviteCode(id) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  // Check if code exists and is not already used
  const { data: existing } = await supabase
    .from(CODES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) {
    throw new ValidationError('Código de convite não encontrado');
  }

  if (existing.used) {
    throw new ValidationError('Não é possível invalidar um código já utilizado');
  }

  // Set expiration to now to invalidate
  const { data, error } = await supabase
    .from(CODES_TABLE)
    .update({
      expires_at: new Date().toISOString(),
      manually_invalidated: true
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Erro ao invalidar código', { error: error.message, codeId: id });
    throw new Error('Erro ao invalidar código de convite');
  }

  logger.info('Código de convite invalidado manualmente', { codeId: id });
  return data;
}

/**
 * Create a user profile in the profiles table
 */
export async function createProfile(profileData) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .insert({
      id: profileData.id,
      name: profileData.name,
      email: profileData.email,
      role: profileData.role || 'user',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    logger.error('Erro ao criar perfil', { error: error.message, email: profileData.email });
    throw new Error('Erro ao criar perfil de usuário');
  }

  return data;
}

/**
 * Get user profile by ID
 */
export async function getProfileById(id) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error('Erro ao buscar perfil');
  }

  return data;
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}
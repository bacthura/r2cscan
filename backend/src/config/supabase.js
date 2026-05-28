/**
 * Supabase Client Configuration
 * Centralized Supabase initialization.
 * Uses SERVICE_ROLE_KEY for backend operations (safe, never exposed to client).
 * R2C-Scan v2.0
 */
import { createClient } from '@supabase/supabase-js';
import env from './env.js';

let supabaseAdmin = null;
let supabaseAnon = null;

/**
 * Get Supabase admin client (uses SERVICE_ROLE_KEY - backend only)
 * Has full access, should NEVER be exposed to frontend
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      console.warn('⚠️ Supabase not configured. Using local IndexedDB fallback.');
      return null;
    }
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}

/**
 * Get Supabase anon client (uses ANON_KEY - safe for RLS-protected public access)
 */
export function getSupabaseAnon() {
  if (!supabaseAnon) {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      console.warn('⚠️ Supabase not configured for public access.');
      return null;
    }
    supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return supabaseAnon;
}

/**
 * Test Supabase connection
 */
export async function testConnection() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { connected: false, message: 'Not configured' };
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1).maybeSingle();
    return { connected: !error || error.code !== 'PGRST116', message: error?.message || 'Connected' };
  } catch (e) {
    return { connected: false, message: e.message };
  }
}

export default getSupabaseAdmin;
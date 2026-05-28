-- ============================================================
-- R2C-Scan - Invite Code System
-- Supabase SQL Schema
-- v2.0
-- ============================================================
-- Execute this SQL in your Supabase SQL Editor
-- (https://app.supabase.com/project/_/sql/new)
-- ============================================================

-- ── INVITE CODES TABLE ──
-- Stores all invite codes for account registration
CREATE TABLE IF NOT EXISTS invite_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(6) NOT NULL UNIQUE,             -- 6-digit numeric code
  used          BOOLEAN NOT NULL DEFAULT FALSE,          -- Whether the code has been used
  used_by       UUID DEFAULT NULL,                      -- User ID who used the code
  used_at       TIMESTAMPTZ DEFAULT NULL,                -- When the code was used
  created_by    UUID NOT NULL,                           -- Admin user ID who created the code
  label         VARCHAR(100) DEFAULT NULL,               -- Optional label for identification
  manually_invalidated BOOLEAN DEFAULT FALSE,            -- Admin manually invalidated
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- When the code was created
  expires_at    TIMESTAMPTZ DEFAULT NULL                 -- Null = never expires
);

-- Index for fast code lookup during registration
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

-- Index for filtering by used status
CREATE INDEX IF NOT EXISTS idx_invite_codes_used ON invite_codes(used);

-- Index for listing/sorting by creation date
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_at ON invite_codes(created_at DESC);

-- Index for checking expiration
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON invite_codes(expires_at);

-- ── PROFILES TABLE ──
-- Extends Firebase Auth users with additional profile data
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY,                        -- Matches Firebase Auth UID
  name          VARCHAR(100) NOT NULL,                   -- User display name
  email         VARCHAR(255) NOT NULL UNIQUE,            -- User email
  role          VARCHAR(20) NOT NULL DEFAULT 'user',     -- 'user' or 'admin'
  avatar_url    TEXT DEFAULT NULL,                       -- Optional avatar URL
  phone         VARCHAR(20) DEFAULT NULL,                -- Optional phone number
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,           -- Account active status
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),      -- Account creation date
  updated_at    TIMESTAMPTZ DEFAULT NULL                 -- Last profile update
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ── SECURITY AUDIT LOG TABLE ──
-- Tracks all security-sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        VARCHAR(50) NOT NULL,                    -- Action type (e.g., 'code_generated', 'user_registered', 'login_attempt')
  user_id       UUID DEFAULT NULL,                       -- User who performed the action (NULL for anonymous)
  details       JSONB DEFAULT NULL,                      -- Additional context as JSON
  ip_address    INET DEFAULT NULL,                       -- Requester IP
  user_agent    TEXT DEFAULT NULL,                       -- Requester user agent
  success       BOOLEAN NOT NULL DEFAULT TRUE,           -- Whether the action succeeded
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()       -- When the action occurred
);

-- Index for querying logs by action
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Index for querying logs by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ── SETUP: Create first admin profile ──
-- ⚠️ IMPORTANT: After creating your first admin user in Firebase,
--    run the following INSERT with the actual Firebase UID:
--
-- INSERT INTO profiles (id, name, email, role)
-- VALUES ('<FIREBASE_ADMIN_UID>', 'Admin', '<ADMIN_EMAIL>', 'admin');

-- ── ROW LEVEL SECURITY (RLS) ──
-- Enable RLS on all tables for production security

-- Invite Codes RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read invite codes (needed for validation)
CREATE POLICY "Anyone can read invite codes"
  ON invite_codes
  FOR SELECT
  USING (true);

-- Policy: Only authenticated with role 'admin' can insert
CREATE POLICY "Admins can insert invite codes"
  ON invite_codes
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policy: Only service role can update (mark as used)
CREATE POLICY "Service role can update invite codes"
  ON invite_codes
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Service role can read any profile
CREATE POLICY "Service role can read all profiles"
  ON profiles
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy: Service role can insert profiles
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Audit Logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage audit logs
CREATE POLICY "Service role can manage audit logs"
  ON audit_logs
  USING (auth.role() = 'service_role');

-- ── AUTOMATIC CLEANUP ──
-- Remove expired unused codes after 30 days
-- (Run this as a scheduled cron job or Supabase Edge Function)
--
-- DELETE FROM invite_codes
-- WHERE used = false
--   AND expires_at IS NOT NULL
--   AND expires_at < NOW() - INTERVAL '30 days';

-- ── VERIFICATION QUERIES ──
-- Run these to verify schema installation:

-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- SELECT COUNT(*) AS total_codes FROM invite_codes;
-- SELECT COUNT(*) AS total_profiles FROM profiles;
-- SELECT COUNT(*) AS total_audit_logs FROM audit_logs;
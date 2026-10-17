-- ============================================================
-- AUREX CRITICAL SECURITY MIGRATIONS
-- Apply these manually in Supabase SQL Editor if npm run migrate fails
-- Dashboard: https://supabase.com/dashboard/project/kcddivyenvzuiidcrgax/sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration 007: Secure Semi-Account Credentials
-- ============================================================

-- Drop existing semi_accounts table if it exists (to avoid conflicts)
DROP TABLE IF EXISTS semi_account_access_log CASCADE;
DROP TABLE IF EXISTS semi_accounts CASCADE;

-- Create semi_accounts table
CREATE TABLE semi_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number INTEGER UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_semi_accounts_account_number ON semi_accounts(account_number);
CREATE INDEX idx_semi_accounts_username ON semi_accounts(username);

-- Create audit logging
CREATE TABLE semi_account_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semi_account_id UUID REFERENCES semi_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_semi_account_access_log_user ON semi_account_access_log(user_id);
CREATE INDEX idx_semi_account_access_log_account ON semi_account_access_log(semi_account_id);

-- Migration 008: Add Admin Role to Users
-- ============================================================

-- Add is_admin column to users table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for faster admin lookups
DROP INDEX IF EXISTS idx_users_is_admin;
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Drop existing admin_action_log if exists
DROP TABLE IF EXISTS admin_action_log CASCADE;

-- Create admin action log
CREATE TABLE admin_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  target_resource VARCHAR(255),
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_action_log_admin ON admin_action_log(admin_user_id);
CREATE INDEX idx_admin_action_log_created ON admin_action_log(created_at DESC);
CREATE INDEX idx_admin_action_log_action_type ON admin_action_log(action_type);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$ 
BEGIN
  RAISE NOTICE 'Migrations applied successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create an admin user: UPDATE users SET is_admin = TRUE WHERE email = ''your-email@example.com'';';
  RAISE NOTICE '2. Add semi-account credentials (see comments below)';
END $$;

-- ============================================================
-- MANUAL STEPS AFTER RUNNING THIS SQL:
-- ============================================================

-- 1. Create an admin user (replace with your email):
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-admin@example.com';

-- 2. Add semi-account credentials (use strong passwords):
-- INSERT INTO semi_accounts (account_number, username, password_hash) 
-- VALUES 
--   (1, 'account1_username', crypt('strong_password_1', gen_salt('bf'))),
--   (2, 'account2_username', crypt('strong_password_2', gen_salt('bf'))),
--   (3, 'account3_username', crypt('strong_password_3', gen_salt('bf'))),
--   (4, 'account4_username', crypt('strong_password_4', gen_salt('bf')));

-- ============================================================
-- VERIFICATION QUERIES:
-- ============================================================

-- Check if tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('semi_accounts', 'admin_action_log');

-- Check if is_admin column exists:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin';

-- Check admin users:
-- SELECT id, email, is_admin FROM users WHERE is_admin = TRUE;

-- Migration: Secure Semi-Account Credentials
-- Purpose: Move hardcoded credentials to database with encryption
-- Date: 2026-04-26

-- Create semi_accounts table if not exists
CREATE TABLE IF NOT EXISTS semi_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number INTEGER UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: Passwords should be set via environment variables or secure admin interface
-- DO NOT insert plaintext passwords here
-- Use the admin CLI tool to set semi-account credentials securely

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_semi_accounts_account_number ON semi_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_semi_accounts_username ON semi_accounts(username);

-- Add audit logging
CREATE TABLE IF NOT EXISTS semi_account_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semi_account_id UUID REFERENCES semi_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_semi_account_access_log_user ON semi_account_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_semi_account_access_log_account ON semi_account_access_log(semi_account_id);

-- Migration: Add Admin Role to Users
-- Purpose: Add is_admin column for admin authentication
-- Date: 2026-04-26

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Add audit logging for admin actions
CREATE TABLE IF NOT EXISTS admin_action_log (
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

CREATE INDEX IF NOT EXISTS idx_admin_action_log_admin ON admin_action_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_created ON admin_action_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_action_type ON admin_action_log(action_type);

-- Note: To create an admin user, run:
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-admin-email@example.com';

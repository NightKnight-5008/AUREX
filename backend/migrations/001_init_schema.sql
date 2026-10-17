-- AUREX Financial Operating System - Initial Schema
-- Complete database schema with users, auth, RBAC, ledger, SMS trust, FX, and audit logging
-- Created: 2026-02-07

-- ============================================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  android_app_password VARCHAR(255),
  auth_token VARCHAR(500),
  token_expires_at TIMESTAMP WITH TIME ZONE,
  language VARCHAR(10) DEFAULT 'en',
  email_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(10),
  verification_code_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_token ON users(auth_token);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- Sessions table - track active user sessions with device fingerprinting
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  device_fingerprint VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_device_fingerprint ON sessions(device_fingerprint);

-- ============================================================================
-- 2. RBAC (Role-Based Access Control)
-- ============================================================================

-- Roles table - stores role definitions with permissions
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Permissions table - granular permission definitions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (resource, action)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- User roles - assignment of roles to users
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================================
-- 3. DOUBLE-ENTRY LEDGER
-- ============================================================================

-- Chart of accounts - complete account master
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
  normal_balance VARCHAR(10) NOT NULL, -- Debit or Credit
  currency VARCHAR(3) DEFAULT 'USD',
  parent_id VARCHAR(50) REFERENCES accounts(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts(currency);

-- Ledger entries - complete transaction records with double-entry
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number SERIAL UNIQUE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(20,4) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  debit_account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  credit_account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  description TEXT,
  source VARCHAR(100), -- 'SMS', 'Manual', 'API', 'Import'
  source_ref VARCHAR(255), -- Reference to source transaction
  reversed BOOLEAN DEFAULT false,
  reversed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confidence_score INT DEFAULT 100, -- 0-100 for AI-parsed entries
  metadata JSONB DEFAULT '{}'::JSONB,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_timestamp ON ledger_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_debit_account ON ledger_entries(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_credit_account ON ledger_entries(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_source ON ledger_entries(source);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_by ON ledger_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_currency ON ledger_entries(currency);

-- ============================================================================
-- 4. SMS TRUST & DEDUPLICATION
-- ============================================================================

-- SMS messages with trust scoring
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_message TEXT NOT NULL,
  message_hash VARCHAR(64) UNIQUE NOT NULL,
  parsed_data JSONB, -- Extracted structured data from SMS
  trust_level VARCHAR(10) DEFAULT 'UNKNOWN', -- HIGH, MEDIUM, LOW, UNKNOWN
  confidence_score INT DEFAULT 50, -- 0-100
  trust_factors JSONB DEFAULT '{}'::JSONB, -- Why we trust or don't trust this SMS
  requires_review BOOLEAN DEFAULT false,
  review_status VARCHAR(20), -- PENDING, APPROVED, REJECTED
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_trust_level ON sms_messages(trust_level);
CREATE INDEX IF NOT EXISTS idx_sms_messages_requires_review ON sms_messages(requires_review);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);

-- SMS deduplication - prevent duplicate processing
CREATE TABLE IF NOT EXISTS sms_deduplication (
  message_hash VARCHAR(64) PRIMARY KEY,
  original_message_id UUID NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  count INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sms_dedup_original_id ON sms_deduplication(original_message_id);

-- ============================================================================
-- 5. MULTI-CURRENCY & FX RATES
-- ============================================================================

-- FX rate snapshots - track historical exchange rates
CREATE TABLE IF NOT EXISTS fx_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(20,10) NOT NULL,
  inverse_rate DECIMAL(20,10), -- 1 / rate for reverse direction
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(20), -- 'ECB', 'YAHOO', 'POLYGON', etc
  provider VARCHAR(100), -- API provider name
  transaction_id UUID, -- Link to transaction if applicable
  ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fx_snapshots_currencies ON fx_snapshots(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_fx_snapshots_timestamp ON fx_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_fx_snapshots_ledger_entry ON fx_snapshots(ledger_entry_id);

-- FX cache - fast lookups for recent rates
CREATE TABLE IF NOT EXISTS fx_cache (
  cache_key VARCHAR(10) PRIMARY KEY, -- 'USDEUR' format
  rate DECIMAL(20,10) NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ttl INT DEFAULT 3600, -- Time to live in seconds
  expires_at TIMESTAMP WITH TIME ZONE,
  source VARCHAR(20),
  provider VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_fx_cache_expires_at ON fx_cache(expires_at);

-- ============================================================================
-- 6. OAUTH & ENCRYPTED SECRETS
-- ============================================================================

-- OAuth tokens - securely store third-party API tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'stripe', 'plaid', etc
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);

-- Encrypted secrets - general purpose encrypted storage
CREATE TABLE IF NOT EXISTS encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret_type VARCHAR(50) NOT NULL, -- 'api_key', 'password', 'certificate', etc
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL, -- Initialization vector
  tag TEXT NOT NULL, -- Authentication tag for GCM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_encrypted_secrets_user_id ON encrypted_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_secrets_type ON encrypted_secrets(secret_type);

-- ============================================================================
-- 7. AUDIT LOGGING (Append-Only)
-- ============================================================================

-- Audit logs - immutable record of all changes for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number SERIAL UNIQUE,
  user_id UUID,
  action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc
  resource VARCHAR(100) NOT NULL, -- 'users', 'accounts', 'ledger_entries', etc
  resource_id UUID,
  changes JSONB DEFAULT '{}'::JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  prev_log_hash VARCHAR(64), -- Hash of previous log for chain integrity
  log_hash VARCHAR(64), -- Hash of this log entry
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sequence_number ON audit_logs(sequence_number);

-- ============================================================================
-- 8. AI INSIGHTS
-- ============================================================================

-- Analyst insights - AI-generated financial analysis
CREATE TABLE IF NOT EXISTS analyst_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- 'trend', 'anomaly', 'comparison', 'projection'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metrics JSONB DEFAULT '{}'::JSONB,
  ledger_entry_ids UUID[] DEFAULT ARRAY[]::UUID[],
  account_ids VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  source_data JSONB DEFAULT '{}'::JSONB,
  calculation_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_analyst_insights_user_id ON analyst_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_analyst_insights_analysis_type ON analyst_insights(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analyst_insights_period ON analyst_insights(period_start, period_end);

-- Forecast insights - AI predictions and forecasting
CREATE TABLE IF NOT EXISTS forecast_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forecast_type VARCHAR(50) NOT NULL, -- 'cash_flow', 'revenue', 'expense', 'balance'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  predictions JSONB DEFAULT '{}'::JSONB, -- Predicted values with confidence intervals
  historical_data JSONB DEFAULT '{}'::JSONB, -- Training data used
  assumptions TEXT[] DEFAULT ARRAY[]::TEXT[],
  model_parameters JSONB DEFAULT '{}'::JSONB, -- Model hyperparameters
  fit_metrics JSONB DEFAULT '{}'::JSONB, -- R-squared, MAE, RMSE, etc
  warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_forecast_insights_user_id ON forecast_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_forecast_insights_forecast_type ON forecast_insights(forecast_type);

-- Explainer insights - LLM-generated explanations of financial events
CREATE TABLE IF NOT EXISTS explainer_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  explanation_type VARCHAR(50) NOT NULL, -- 'transaction', 'account', 'trend', 'anomaly'
  title VARCHAR(255) NOT NULL,
  narrative TEXT NOT NULL,
  source_metrics JSONB DEFAULT '{}'::JSONB,
  llm_model VARCHAR(50), -- 'gpt-4', 'claude-3', etc
  temperature DECIMAL(3,2) DEFAULT 0.7, -- LLM temperature parameter
  disclaimer TEXT,
  human_edited BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_explainer_insights_user_id ON explainer_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_explainer_insights_explanation_type ON explainer_insights(explanation_type);

-- ============================================================================
-- 9. LEGACY TABLES (Preserved from original schema)
-- ============================================================================

-- Credit cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alias_name VARCHAR(100) NOT NULL,
  last_four_digits VARCHAR(4) NOT NULL,
  card_network VARCHAR(20),
  limit_amount DECIMAL(12, 2) DEFAULT 0,
  current_balance DECIMAL(12, 2) DEFAULT 0,
  billing_cycle_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_last_four ON credit_cards(last_four_digits);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID,
  transaction_type VARCHAR(50),
  amount DECIMAL(12, 2),
  description VARCHAR(500),
  transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sender VARCHAR(255),
  content TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_received_at ON sms_logs(received_at);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  country VARCHAR(100),
  currency VARCHAR(10),
  language VARCHAR(10),
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Semi-accounts table (legacy, likely for manual accounting)
CREATE TABLE IF NOT EXISTS semi_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_name VARCHAR(255),
  account_balance DECIMAL(12, 2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_semi_accounts_user_id ON semi_accounts(user_id);

-- Security credentials table (legacy encryption keys)
CREATE TABLE IF NOT EXISTS security_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credential_type VARCHAR(100),
  encrypted_credential TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_credentials_user_id ON security_credentials(user_id);

-- Legacy encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_user_id ON encryption_keys(user_id);

-- Card field change history
CREATE TABLE IF NOT EXISTS card_field_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_history_card_id ON card_field_change_history(card_id);

-- Card reliability metadata
CREATE TABLE IF NOT EXISTS card_reliability_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID UNIQUE NOT NULL,
  reliability_score DECIMAL(5, 2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_reliability_card_id ON card_reliability_metadata(card_id);

-- Financial stress index
CREATE TABLE IF NOT EXISTS financial_stress_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stress_score DECIMAL(5, 2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stress_index_user_id ON financial_stress_index(user_id);

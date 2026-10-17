-- AUREX Financial Operating System - Performance Indexes
-- Created: 2026-02-07

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Ledger queries - frequently queried by account and date range
CREATE INDEX IF NOT EXISTS idx_ledger_account_date
  ON ledger_entries(debit_account_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_credit_account_date
  ON ledger_entries(credit_account_id, timestamp DESC);

-- Multi-currency transactions
CREATE INDEX IF NOT EXISTS idx_ledger_currency_date
  ON ledger_entries(currency, timestamp DESC);

-- SMS processing - find unreviewed messages by user and creation time
CREATE INDEX IF NOT EXISTS idx_sms_review_status_date
  ON sms_messages(user_id, review_status, created_at DESC);

-- Account lookups by user and type
CREATE INDEX IF NOT EXISTS idx_accounts_created_by_type
  ON accounts(created_by, type);

-- User roles with assignment tracking
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_at
  ON user_roles(assigned_at DESC);

-- Audit trail - efficient compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_resource
  ON audit_logs(user_id, resource, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp
  ON audit_logs(action, timestamp DESC);

-- FX rates - find latest rate for currency pair
CREATE INDEX IF NOT EXISTS idx_fx_snapshots_currencies_timestamp
  ON fx_snapshots(from_currency, to_currency, timestamp DESC);

-- OAuth tokens - find active tokens by provider
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider
  ON oauth_tokens(user_id, provider, expires_at DESC);

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Active accounts only
CREATE INDEX IF NOT EXISTS idx_accounts_active
  ON accounts(id) WHERE active = true;

-- Unreviewed SMS requiring immediate attention
CREATE INDEX IF NOT EXISTS idx_sms_requires_review
  ON sms_messages(created_at DESC) WHERE requires_review = true;

-- Non-reversed ledger entries (most queries exclude reversals)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_active
  ON ledger_entries(timestamp DESC) WHERE reversed = false;

-- Active sessions only
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(user_id, created_at DESC) WHERE expires_at > CURRENT_TIMESTAMP;

-- ============================================================================
-- EXPRESSION INDEXES FOR ADVANCED SEARCHES
-- ============================================================================

-- Case-insensitive email searches
CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON users(LOWER(email));

-- Account searches by code pattern
CREATE INDEX IF NOT EXISTS idx_accounts_code_pattern
  ON accounts(code);

-- SMS message content searches
CREATE INDEX IF NOT EXISTS idx_sms_messages_search
  ON sms_messages USING GIN(parsed_data);

-- JSONB searches for flexible metadata
CREATE INDEX IF NOT EXISTS idx_audit_logs_changes_search
  ON audit_logs USING GIN(changes);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_metadata_search
  ON ledger_entries USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_analyst_insights_metrics_search
  ON analyst_insights USING GIN(metrics);

-- ============================================================================
-- UNIQUE CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure unique session tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_unique
  ON sessions(token_hash);

-- Ensure unique roles per user (already done inline, but explicit here)
-- Ensure unique account codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_code_unique
  ON accounts(code);

-- ============================================================================
-- COVERING INDEXES (For Index-Only Scans)
-- ============================================================================

-- User sessions covering query for login checks
CREATE INDEX IF NOT EXISTS idx_sessions_user_device_covering
  ON sessions(user_id, device_fingerprint) INCLUDE (expires_at, created_at);

-- Ledger balance queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_amount_covering
  ON ledger_entries(debit_account_id, timestamp DESC) INCLUDE (amount, currency);

-- ============================================================================
-- STATISTICS FOR QUERY PLANNER
-- ============================================================================

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE sessions;
ANALYZE roles;
ANALYZE permissions;
ANALYZE user_roles;
ANALYZE accounts;
ANALYZE ledger_entries;
ANALYZE sms_messages;
ANALYZE sms_deduplication;
ANALYZE fx_snapshots;
ANALYZE fx_cache;
ANALYZE oauth_tokens;
ANALYZE encrypted_secrets;
ANALYZE audit_logs;
ANALYZE analyst_insights;
ANALYZE forecast_insights;
ANALYZE explainer_insights;

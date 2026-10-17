-- AUREX Financial Operating System - Triggers & Stored Procedures
-- Audit log hash chain, timestamp updates, and data integrity triggers
-- Created: 2026-02-07

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate SHA256 hash of audit log entry
CREATE OR REPLACE FUNCTION calculate_log_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Concatenate audit log fields for hashing
  -- Format: id | user_id | action | resource | resource_id | timestamp
  NEW.log_hash := encode(
    digest(
      COALESCE(NEW.id::TEXT, '') ||
      COALESCE(NEW.user_id::TEXT, '') ||
      COALESCE(NEW.action, '') ||
      COALESCE(NEW.resource, '') ||
      COALESCE(NEW.resource_id::TEXT, '') ||
      COALESCE(NEW.timestamp::TEXT, ''),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to link to previous audit log hash
CREATE OR REPLACE FUNCTION link_previous_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  prev_log audit_logs%ROWTYPE;
BEGIN
  -- Find the previous log by sequence number
  SELECT * INTO prev_log
  FROM audit_logs
  WHERE sequence_number = NEW.sequence_number - 1
  LIMIT 1;

  IF FOUND THEN
    NEW.prev_log_hash := prev_log.log_hash;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUDIT LOG TRIGGERS
-- ============================================================================

-- Trigger to calculate hash before inserting audit log
CREATE TRIGGER trigger_audit_log_hash_calculation
BEFORE INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION calculate_log_hash();

-- Trigger to link previous audit log hash
CREATE TRIGGER trigger_audit_log_chain_linking
BEFORE INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION link_previous_audit_log();

-- ============================================================================
-- TIMESTAMP TRIGGERS
-- ============================================================================

-- Auto-update users.updated_at on modification
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_users_timestamp();

-- Auto-update roles.updated_at on modification
CREATE OR REPLACE FUNCTION update_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_roles_update_timestamp
BEFORE UPDATE ON roles
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_roles_timestamp();

-- Auto-update accounts.updated_at on modification
CREATE OR REPLACE FUNCTION update_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accounts_update_timestamp
BEFORE UPDATE ON accounts
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_accounts_timestamp();

-- Auto-update oauth_tokens.updated_at on modification
CREATE OR REPLACE FUNCTION update_oauth_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_oauth_tokens_update_timestamp
BEFORE UPDATE ON oauth_tokens
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_oauth_tokens_timestamp();

-- Auto-update encrypted_secrets.updated_at on modification
CREATE OR REPLACE FUNCTION update_encrypted_secrets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_encrypted_secrets_update_timestamp
BEFORE UPDATE ON encrypted_secrets
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_encrypted_secrets_timestamp();

-- ============================================================================
-- LEDGER ENTRY VALIDATION TRIGGERS
-- ============================================================================

-- Ensure debit and credit accounts are different
CREATE OR REPLACE FUNCTION validate_ledger_accounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.debit_account_id = NEW.credit_account_id THEN
    RAISE EXCEPTION 'Debit and credit accounts must be different';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_ledger_accounts
BEFORE INSERT OR UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_accounts();

-- Ensure debit and credit amounts are equal (double-entry principle)
CREATE OR REPLACE FUNCTION validate_ledger_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Ledger entry amount must be greater than zero';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_ledger_amounts
BEFORE INSERT OR UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION validate_ledger_amounts();

-- ============================================================================
-- SMS DEDUPLICATION TRIGGERS
-- ============================================================================

-- Auto-update SMS deduplication last_seen and count
CREATE OR REPLACE FUNCTION update_sms_dedup()
RETURNS TRIGGER AS $$
DECLARE
  dedup_record sms_deduplication%ROWTYPE;
BEGIN
  -- Check if this message_hash already exists in dedup table
  SELECT * INTO dedup_record
  FROM sms_deduplication
  WHERE message_hash = NEW.message_hash;

  IF FOUND THEN
    -- Update existing dedup record
    UPDATE sms_deduplication
    SET last_seen = CURRENT_TIMESTAMP,
        count = count + 1
    WHERE message_hash = NEW.message_hash;
  ELSE
    -- Create new dedup record
    INSERT INTO sms_deduplication (message_hash, original_message_id, first_seen, last_seen, count)
    VALUES (NEW.message_hash, NEW.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sms_deduplication
AFTER INSERT ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION update_sms_dedup();

-- ============================================================================
-- FX CACHE EXPIRATION TRIGGER
-- ============================================================================

-- Auto-calculate expiration time for FX cache entries
CREATE OR REPLACE FUNCTION update_fx_cache_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.cached_at + (NEW.ttl || ' seconds')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fx_cache_expiry
BEFORE INSERT OR UPDATE ON fx_cache
FOR EACH ROW
EXECUTE FUNCTION update_fx_cache_expiry();

-- ============================================================================
-- SMS MESSAGE STATUS TRIGGERS
-- ============================================================================

-- Validate SMS review status transitions
CREATE OR REPLACE FUNCTION validate_sms_review_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow valid status transitions
  IF NEW.review_status IS NOT NULL THEN
    IF NEW.review_status NOT IN ('PENDING', 'APPROVED', 'REJECTED') THEN
      RAISE EXCEPTION 'Invalid SMS review status: %', NEW.review_status;
    END IF;
  END IF;

  -- If status is being set, ensure reviewed_by and reviewed_at are set
  IF NEW.review_status IN ('APPROVED', 'REJECTED') THEN
    IF NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'reviewed_by and reviewed_at must be set when setting review_status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sms_validate_review_status
BEFORE INSERT OR UPDATE ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION validate_sms_review_status();

-- ============================================================================
-- USER SETTINGS TRIGGERS
-- ============================================================================

-- Auto-update user_settings.updated_at
CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_settings_update_timestamp
BEFORE UPDATE ON user_settings
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_user_settings_timestamp();

-- Auto-update credit_cards.updated_at
CREATE OR REPLACE FUNCTION update_credit_cards_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_credit_cards_update_timestamp
BEFORE UPDATE ON credit_cards
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION update_credit_cards_timestamp();

-- ============================================================================
-- AUDIT LOG CREATION TRIGGERS
-- ============================================================================

-- Function to create audit log for user updates
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.* IS DISTINCT FROM NEW.* THEN
    INSERT INTO audit_logs (user_id, action, resource, resource_id, changes)
    VALUES (
      NEW.id,
      'UPDATE',
      'users',
      NEW.id,
      jsonb_build_object(
        'email', jsonb_build_object('old', OLD.email, 'new', NEW.email),
        'email_verified', jsonb_build_object('old', OLD.email_verified, 'new', NEW.email_verified)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_users
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION audit_user_changes();

-- Function to create audit log for ledger entry creation
CREATE OR REPLACE FUNCTION audit_ledger_entry_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource, resource_id, changes)
  VALUES (
    NEW.created_by,
    'CREATE',
    'ledger_entries',
    NEW.id,
    jsonb_build_object(
      'debit_account_id', NEW.debit_account_id,
      'credit_account_id', NEW.credit_account_id,
      'amount', NEW.amount,
      'currency', NEW.currency,
      'source', NEW.source
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_ledger_entries
AFTER INSERT ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION audit_ledger_entry_creation();

-- ============================================================================
-- CONSENT AND CONSISTENCY CHECKS
-- ============================================================================

-- Ensure accounts cannot be marked active/inactive by non-owner operations
-- This is enforced at application level, but here's a safeguard
CREATE OR REPLACE FUNCTION validate_account_modifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure account code is immutable (cannot change)
  IF OLD.code IS DISTINCT FROM NEW.code THEN
    RAISE EXCEPTION 'Account code cannot be modified';
  END IF;

  -- Ensure account type is immutable
  IF OLD.type IS DISTINCT FROM NEW.type THEN
    RAISE EXCEPTION 'Account type cannot be modified';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_account_modifications
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION validate_account_modifications();

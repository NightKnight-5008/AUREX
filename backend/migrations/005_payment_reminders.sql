-- ============================================================
-- AUREX Payment Reminder System - Database Schema
-- ============================================================
-- Replaces Google Calendar reminders with WhatsApp-based system
--
-- Features:
-- - Encrypted phone number storage
-- - Payment schedule tracking
-- - Reminder delivery logging
-- - Atomic operations to prevent duplicates
-- - Timezone support
--
-- Migration: 005_payment_reminders.sql
-- ============================================================

-- ============================================================
-- USER REMINDER PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_reminder_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact information (encrypted at application level)
  phone_number_encrypted TEXT NOT NULL,
  phone_country_code VARCHAR(10) NOT NULL DEFAULT '+1',

  -- Preferences
  reminders_enabled BOOLEAN DEFAULT TRUE,
  reminder_time_hour INTEGER DEFAULT 9 CHECK (reminder_time_hour >= 0 AND reminder_time_hour <= 23),
  timezone VARCHAR(100) DEFAULT 'America/New_York',

  -- Privacy consent
  whatsapp_consent_given BOOLEAN DEFAULT FALSE,
  whatsapp_consent_date TIMESTAMP,
  privacy_notice_accepted BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

-- ============================================================
-- PAYMENT REMINDERS SCHEDULE
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,

  -- Payment details
  payment_amount DECIMAL(15, 2) NOT NULL,
  payment_due_date DATE NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),

  -- Card reference (for reminder message)
  card_last_four VARCHAR(4) NOT NULL,
  card_name VARCHAR(100),

  -- Reminder scheduling
  reminder_scheduled_date DATE NOT NULL,
  reminder_scheduled_time TIME DEFAULT '09:00:00',
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,

  -- Delivery tracking
  last_attempt_at TIMESTAMP,
  attempt_count INTEGER DEFAULT 0,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
  delivery_error TEXT,

  -- External references
  whatsapp_message_id VARCHAR(255),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure no duplicate reminders for same payment
  UNIQUE(card_id, payment_due_date, user_id)
);

-- ============================================================
-- REMINDER DELIVERY LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS reminder_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID NOT NULL REFERENCES payment_reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Delivery attempt
  attempt_number INTEGER NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Message content
  message_content TEXT NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL, -- Redacted/hashed for privacy

  -- Delivery status
  status VARCHAR(50) NOT NULL CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed', 'rejected')),
  status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- WhatsApp API response
  whatsapp_message_id VARCHAR(255),
  whatsapp_response JSONB,
  error_code VARCHAR(50),
  error_message TEXT,

  -- Network details
  api_endpoint VARCHAR(255),
  http_status_code INTEGER,
  response_time_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REMINDER RETRY QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS reminder_retry_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID NOT NULL REFERENCES payment_reminders(id) ON DELETE CASCADE,

  -- Retry scheduling
  scheduled_retry_at TIMESTAMP NOT NULL,
  retry_attempt INTEGER NOT NULL,
  max_retries INTEGER DEFAULT 5,

  -- Backoff strategy
  backoff_strategy VARCHAR(50) DEFAULT 'exponential' CHECK (backoff_strategy IN ('linear', 'exponential', 'fibonacci')),
  next_retry_delay_seconds INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMP,

  -- Error tracking
  last_error TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- User preferences lookups
CREATE INDEX IF NOT EXISTS idx_reminder_prefs_user_id
  ON user_reminder_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_reminder_prefs_enabled
  ON user_reminder_preferences(reminders_enabled)
  WHERE reminders_enabled = TRUE;

-- Payment reminders queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_id
  ON payment_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_due_date
  ON payment_reminders(payment_due_date);

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled
  ON payment_reminders(reminder_scheduled_date, reminder_sent)
  WHERE reminder_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_reminders_status
  ON payment_reminders(payment_status);

CREATE INDEX IF NOT EXISTS idx_reminders_delivery
  ON payment_reminders(delivery_status);

-- Delivery log queries
CREATE INDEX IF NOT EXISTS idx_delivery_log_reminder_id
  ON reminder_delivery_log(reminder_id);

CREATE INDEX IF NOT EXISTS idx_delivery_log_user_id
  ON reminder_delivery_log(user_id);

CREATE INDEX IF NOT EXISTS idx_delivery_log_attempted
  ON reminder_delivery_log(attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_log_status
  ON reminder_delivery_log(status);

-- Retry queue queries
CREATE INDEX IF NOT EXISTS idx_retry_queue_scheduled
  ON reminder_retry_queue(scheduled_retry_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_retry_queue_reminder
  ON reminder_retry_queue(reminder_id);

CREATE INDEX IF NOT EXISTS idx_retry_queue_status
  ON reminder_retry_queue(status);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================

-- User preferences updated_at trigger
CREATE OR REPLACE FUNCTION update_reminder_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reminder_prefs_timestamp
  BEFORE UPDATE ON user_reminder_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_prefs_timestamp();

-- Payment reminders updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_reminders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_reminders_timestamp
  BEFORE UPDATE ON payment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_reminders_timestamp();

-- Retry queue updated_at trigger
CREATE OR REPLACE FUNCTION update_retry_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_retry_queue_timestamp
  BEFORE UPDATE ON reminder_retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_retry_queue_timestamp();

-- ============================================================
-- CONSTRAINTS AND VALIDATION
-- ============================================================

-- Ensure reminder time is valid
ALTER TABLE user_reminder_preferences
  ADD CONSTRAINT check_valid_reminder_hour
  CHECK (reminder_time_hour >= 0 AND reminder_time_hour <= 23);

-- Ensure positive payment amounts
ALTER TABLE payment_reminders
  ADD CONSTRAINT check_positive_amount
  CHECK (payment_amount > 0);

-- Ensure attempt count is non-negative
ALTER TABLE payment_reminders
  ADD CONSTRAINT check_attempt_count
  CHECK (attempt_count >= 0);

-- Ensure retry attempts are positive
ALTER TABLE reminder_retry_queue
  ADD CONSTRAINT check_retry_attempt
  CHECK (retry_attempt > 0 AND retry_attempt <= max_retries);

-- ============================================================
-- INITIAL DATA / MIGRATION NOTES
-- ============================================================

-- Migration complete
-- Next steps:
-- 1. Encrypt existing phone numbers from users table
-- 2. Create initial reminder preferences for existing users
-- 3. Set up WhatsApp Business API credentials
-- 4. Configure reminder scheduler cron job

COMMENT ON TABLE user_reminder_preferences IS 'User preferences for WhatsApp payment reminders';
COMMENT ON TABLE payment_reminders IS 'Scheduled payment reminders with delivery tracking';
COMMENT ON TABLE reminder_delivery_log IS 'Audit log of all reminder delivery attempts';
COMMENT ON TABLE reminder_retry_queue IS 'Queue for failed reminder retries with backoff';

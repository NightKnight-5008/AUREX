-- ============================================================
-- AUREX Payment Reminder System - Test User Configuration
-- ============================================================
-- Creates 3 test users with credit cards and scheduled reminders
--
-- USERS:
-- 1. Alice Johnson - Trial user with 1 card, upcoming payment
-- 2. Bob Martinez - Pro user with 2 cards, multiple payments
-- 3. Carol Enterprise - Enterprise user with 3 cards, various scenarios
--
-- Usage:
-- psql $DATABASE_URL < test-config/test-users.sql
-- ============================================================

-- Note: Phone numbers are encrypted at application level
-- This script assumes encryption is handled by the application

BEGIN;

-- ============================================================
-- TEST USER 1: Alice Johnson (Trial Tier)
-- ============================================================

-- Create user
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  'alice-test-uuid-0001-000000000001'::uuid,
  'alice.johnson@test.aurex.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456', -- Hashed: 'TestPassword123!'
  '2026-01-15 10:00:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Create user settings
INSERT INTO user_settings (user_id, country, currency, language, theme, created_at, updated_at)
VALUES (
  'alice-test-uuid-0001-000000000001'::uuid,
  'US',
  'USD',
  'en',
  'light',
  '2026-01-15 10:01:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO NOTHING;

-- Create reminder preferences
-- Note: phone_number_encrypted should be set via API with proper encryption
INSERT INTO user_reminder_preferences (
  user_id,
  phone_number_encrypted,
  phone_country_code,
  reminders_enabled,
  reminder_time_hour,
  timezone,
  whatsapp_consent_given,
  whatsapp_consent_date,
  privacy_notice_accepted,
  created_at,
  updated_at
) VALUES (
  'alice-test-uuid-0001-000000000001'::uuid,
  'ENCRYPTED_PHONE_PLACEHOLDER_+12025551001', -- Replace via API call
  '+1',
  TRUE,
  9, -- 9 AM
  'America/New_York',
  TRUE,
  '2026-01-15 10:05:00',
  TRUE,
  '2026-01-15 10:05:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO UPDATE SET
  reminders_enabled = EXCLUDED.reminders_enabled,
  whatsapp_consent_given = EXCLUDED.whatsapp_consent_given;

-- Create credit card
INSERT INTO credit_cards (
  id,
  user_id,
  card_name,
  last_four,
  card_network,
  credit_limit,
  available_balance,
  outstanding_debt,
  minimum_payment,
  due_date,
  payment_status,
  billing_cycle_day,
  created_at,
  updated_at
) VALUES (
  'card-alice-001'::uuid,
  'alice-test-uuid-0001-000000000001'::uuid,
  'Chase Sapphire',
  '1001',
  'Visa',
  5000.00,
  4200.00,
  800.00,
  150.00,
  15, -- Due on the 15th of each month
  'pending',
  1,
  '2026-01-15 10:10:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Create payment reminder (due in 7 days)
INSERT INTO payment_reminders (
  id,
  user_id,
  card_id,
  payment_amount,
  payment_due_date,
  payment_status,
  card_last_four,
  card_name,
  reminder_scheduled_date,
  reminder_scheduled_time,
  reminder_sent,
  delivery_status,
  created_at,
  updated_at
) VALUES (
  'reminder-alice-001'::uuid,
  'alice-test-uuid-0001-000000000001'::uuid,
  'card-alice-001'::uuid,
  150.00,
  CURRENT_DATE + INTERVAL '7 days', -- Due in 7 days
  'pending',
  '1001',
  'Chase Sapphire',
  CURRENT_DATE + INTERVAL '7 days', -- Reminder on due date
  '09:00:00',
  FALSE,
  'pending',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (card_id, payment_due_date, user_id) DO NOTHING;

-- ============================================================
-- TEST USER 2: Bob Martinez (Pro Tier)
-- ============================================================

INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  'bob-test-uuid-0002-000000000002'::uuid,
  'bob.martinez@test.aurex.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
  '2026-01-10 14:00:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_settings (user_id, country, currency, language, theme, created_at, updated_at)
VALUES (
  'bob-test-uuid-0002-000000000002'::uuid,
  'US',
  'USD',
  'en',
  'dark',
  '2026-01-10 14:01:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_reminder_preferences (
  user_id,
  phone_number_encrypted,
  phone_country_code,
  reminders_enabled,
  reminder_time_hour,
  timezone,
  whatsapp_consent_given,
  whatsapp_consent_date,
  privacy_notice_accepted,
  created_at,
  updated_at
) VALUES (
  'bob-test-uuid-0002-000000000002'::uuid,
  'ENCRYPTED_PHONE_PLACEHOLDER_+12025552002',
  '+1',
  TRUE,
  10, -- 10 AM
  'America/Chicago',
  TRUE,
  '2026-01-10 14:05:00',
  TRUE,
  '2026-01-10 14:05:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO UPDATE SET
  reminders_enabled = EXCLUDED.reminders_enabled;

-- Card 1
INSERT INTO credit_cards (
  id, user_id, card_name, last_four, card_network,
  credit_limit, available_balance, outstanding_debt, minimum_payment,
  due_date, payment_status, billing_cycle_day, created_at, updated_at
) VALUES (
  'card-bob-001'::uuid,
  'bob-test-uuid-0002-000000000002'::uuid,
  'Amex Platinum',
  '2001',
  'American Express',
  15000.00,
  12500.00,
  2500.00,
  350.00,
  20,
  'pending',
  5,
  '2026-01-10 14:10:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Card 2
INSERT INTO credit_cards (
  id, user_id, card_name, last_four, card_network,
  credit_limit, available_balance, outstanding_debt, minimum_payment,
  due_date, payment_status, billing_cycle_day, created_at, updated_at
) VALUES (
  'card-bob-002'::uuid,
  'bob-test-uuid-0002-000000000002'::uuid,
  'Capital One Venture',
  '2002',
  'Visa',
  10000.00,
  8200.00,
  1800.00,
  200.00,
  25,
  'pending',
  10,
  '2026-01-10 14:11:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Reminder for Card 1 (due in 3 days)
INSERT INTO payment_reminders (
  id, user_id, card_id, payment_amount, payment_due_date, payment_status,
  card_last_four, card_name, reminder_scheduled_date, reminder_scheduled_time,
  reminder_sent, delivery_status, created_at, updated_at
) VALUES (
  'reminder-bob-001'::uuid,
  'bob-test-uuid-0002-000000000002'::uuid,
  'card-bob-001'::uuid,
  350.00,
  CURRENT_DATE + INTERVAL '3 days',
  'pending',
  '2001',
  'Amex Platinum',
  CURRENT_DATE + INTERVAL '3 days',
  '10:00:00',
  FALSE,
  'pending',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (card_id, payment_due_date, user_id) DO NOTHING;

-- Reminder for Card 2 (due in 14 days)
INSERT INTO payment_reminders (
  id, user_id, card_id, payment_amount, payment_due_date, payment_status,
  card_last_four, card_name, reminder_scheduled_date, reminder_scheduled_time,
  reminder_sent, delivery_status, created_at, updated_at
) VALUES (
  'reminder-bob-002'::uuid,
  'bob-test-uuid-0002-000000000002'::uuid,
  'card-bob-002'::uuid,
  200.00,
  CURRENT_DATE + INTERVAL '14 days',
  'pending',
  '2002',
  'Capital One Venture',
  CURRENT_DATE + INTERVAL '14 days',
  '10:00:00',
  FALSE,
  'pending',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (card_id, payment_due_date, user_id) DO NOTHING;

-- ============================================================
-- TEST USER 3: Carol Enterprise (Enterprise Tier)
-- ============================================================

INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES (
  'carol-test-uuid-0003-000000000003'::uuid,
  'carol.enterprise@test.aurex.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
  '2025-12-01 09:00:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_settings (user_id, country, currency, language, theme, created_at, updated_at)
VALUES (
  'carol-test-uuid-0003-000000000003'::uuid,
  'US',
  'USD',
  'en',
  'dark',
  '2025-12-01 09:01:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_reminder_preferences (
  user_id,
  phone_number_encrypted,
  phone_country_code,
  reminders_enabled,
  reminder_time_hour,
  timezone,
  whatsapp_consent_given,
  whatsapp_consent_date,
  privacy_notice_accepted,
  created_at,
  updated_at
) VALUES (
  'carol-test-uuid-0003-000000000003'::uuid,
  'ENCRYPTED_PHONE_PLACEHOLDER_+12025553003',
  '+1',
  TRUE,
  8, -- 8 AM
  'America/Los_Angeles',
  TRUE,
  '2025-12-01 09:05:00',
  TRUE,
  '2025-12-01 09:05:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (user_id) DO UPDATE SET
  reminders_enabled = EXCLUDED.reminders_enabled;

-- Card 1 (Already paid)
INSERT INTO credit_cards (
  id, user_id, card_name, last_four, card_network,
  credit_limit, available_balance, outstanding_debt, minimum_payment,
  due_date, payment_status, billing_cycle_day, created_at, updated_at
) VALUES (
  'card-carol-001'::uuid,
  'carol-test-uuid-0003-000000000003'::uuid,
  'Business Gold',
  '3001',
  'Mastercard',
  25000.00,
  25000.00,
  0.00,
  0.00,
  10,
  'paid',
  1,
  '2025-12-01 09:10:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Card 2 (Upcoming payment)
INSERT INTO credit_cards (
  id, user_id, card_name, last_four, card_network,
  credit_limit, available_balance, outstanding_debt, minimum_payment,
  due_date, payment_status, billing_cycle_day, created_at, updated_at
) VALUES (
  'card-carol-002'::uuid,
  'carol-test-uuid-0003-000000000003'::uuid,
  'Corporate Platinum',
  '3002',
  'Visa',
  50000.00,
  45000.00,
  5000.00,
  750.00,
  15,
  'pending',
  5,
  '2025-12-01 09:11:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Card 3 (Overdue)
INSERT INTO credit_cards (
  id, user_id, card_name, last_four, card_network,
  credit_limit, available_balance, outstanding_debt, minimum_payment,
  due_date, payment_status, billing_cycle_day, created_at, updated_at
) VALUES (
  'card-carol-003'::uuid,
  'carol-test-uuid-0003-000000000003'::uuid,
  'Business Rewards',
  '3003',
  'American Express',
  30000.00,
  27500.00,
  2500.00,
  300.00,
  5,
  'overdue',
  15,
  '2025-12-01 09:12:00',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Reminder for Card 1 (already sent and paid)
INSERT INTO payment_reminders (
  id, user_id, card_id, payment_amount, payment_due_date, payment_status,
  card_last_four, card_name, reminder_scheduled_date, reminder_scheduled_time,
  reminder_sent, reminder_sent_at, delivery_status, whatsapp_message_id,
  created_at, updated_at
) VALUES (
  'reminder-carol-001'::uuid,
  'carol-test-uuid-0003-000000000003'::uuid,
  'card-carol-001'::uuid,
  500.00,
  CURRENT_DATE - INTERVAL '20 days',
  'paid',
  '3001',
  'Business Gold',
  CURRENT_DATE - INTERVAL '20 days',
  '08:00:00',
  TRUE,
  CURRENT_TIMESTAMP - INTERVAL '20 days',
  'delivered',
  'mock-whatsapp-msg-carol-001',
  CURRENT_TIMESTAMP - INTERVAL '21 days',
  CURRENT_TIMESTAMP
) ON CONFLICT (card_id, payment_due_date, user_id) DO NOTHING;

-- Reminder for Card 2 (due in 5 days)
INSERT INTO payment_reminders (
  id, user_id, card_id, payment_amount, payment_due_date, payment_status,
  card_last_four, card_name, reminder_scheduled_date, reminder_scheduled_time,
  reminder_sent, delivery_status, created_at, updated_at
) VALUES (
  'reminder-carol-002'::uuid,
  'carol-test-uuid-0003-000000000003'::uuid,
  'card-carol-002'::uuid,
  750.00,
  CURRENT_DATE + INTERVAL '5 days',
  'pending',
  '3002',
  'Corporate Platinum',
  CURRENT_DATE + INTERVAL '5 days',
  '08:00:00',
  FALSE,
  'pending',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (card_id, payment_due_date, user_id) DO NOTHING;

-- Reminder for Card 3 (overdue - should have been sent)
INSERT INTO payment_reminders (
  id, user_id, card_id, payment_amount, payment_due_date, payment_status,
  card_last_four, card_name, reminder_scheduled_date, reminder_scheduled_time,
  reminder_sent, reminder_sent_at, delivery_status, attempt_count,
  whatsapp_message_id, created_at, updated_at
) VALUES (
  'reminder-carol-003'::uuid,
  'carol-test-uuid-0003-000000000003'::uuid,
  'card-carol-003'::uuid,
  300.00,
  CURRENT_DATE - INTERVAL '3 days', -- Overdue
  'overdue',
  '3003',
  'Business Rewards',
  CURRENT_DATE - INTERVAL '3 days',
  '08:00:00',
  TRUE,
  CURRENT_TIMESTAMP - INTERVAL '3 days',
  'sent',
  1,
  'mock-whatsapp-msg-carol-003',
  CURRENT_TIMESTAMP - INTERVAL '4 days',
  CURRENT_TIMESTAMP
) ON CONFLICT (card_id, payment_due_date, user_id) DO NOTHING;

COMMIT;

-- ============================================================
-- SUMMARY
-- ============================================================

SELECT
  '✓ Test users created' AS status,
  COUNT(*) AS user_count
FROM users
WHERE email LIKE '%@test.aurex.com';

SELECT
  '✓ Test cards created' AS status,
  COUNT(*) AS card_count
FROM credit_cards
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.aurex.com'
);

SELECT
  '✓ Test reminders created' AS status,
  COUNT(*) AS reminder_count
FROM payment_reminders
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.aurex.com'
);

-- ============================================================
-- NEXT STEPS
-- ============================================================

-- 1. Encrypt phone numbers via API:
--    POST /api/reminders/preferences
--    Body: { phoneNumber: "+12025551001", ... }

-- 2. Test reminder sending:
--    POST /api/reminders/process-due
--    (Will send reminders for due dates)

-- 3. View user's upcoming reminders:
--    GET /api/reminders/upcoming?limit=10
--    (Requires authentication as test user)

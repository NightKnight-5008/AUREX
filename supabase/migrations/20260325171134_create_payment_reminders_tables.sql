-- User reminder preferences
CREATE TABLE user_reminder_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number_encrypted TEXT NOT NULL,
  phone_country_code VARCHAR(10) DEFAULT '+1',
  reminders_enabled BOOLEAN DEFAULT true,
  reminder_time_hour INTEGER DEFAULT 9 CHECK (reminder_time_hour >= 0 AND reminder_time_hour <= 23),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  whatsapp_consent_given BOOLEAN DEFAULT false,
  whatsapp_consent_date TIMESTAMPTZ,
  privacy_notice_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_prefs_user_id ON user_reminder_preferences(user_id);

-- Payment reminders
CREATE TABLE payment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
  payment_amount DECIMAL(15, 2) NOT NULL,
  payment_due_date DATE NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  card_last_four VARCHAR(4) NOT NULL,
  card_name VARCHAR(100),
  reminder_scheduled_date DATE NOT NULL,
  reminder_scheduled_time TIME DEFAULT '09:00:00',
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
  delivery_error TEXT,
  whatsapp_message_id VARCHAR(255),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_reminders_user_id ON payment_reminders(user_id);
CREATE INDEX idx_payment_reminders_card_id ON payment_reminders(card_id);
CREATE INDEX idx_payment_reminders_due_date ON payment_reminders(payment_due_date);;

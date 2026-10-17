-- Encryption keys table
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_encryption_keys_user_id ON encryption_keys(user_id);

-- Card field change history (audit trail)
CREATE TABLE card_field_change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_history_card_id ON card_field_change_history(card_id);

-- Card reliability metadata
CREATE TABLE card_reliability_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID UNIQUE NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  reliability_score DECIMAL(5, 2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_reliability_card_id ON card_reliability_metadata(card_id);;

-- Credit cards table
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alias_name VARCHAR(100) NOT NULL,
  last_four_digits VARCHAR(4) NOT NULL,
  card_network VARCHAR(20),
  limit_amount DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  outstanding_debt DECIMAL(15, 2) DEFAULT 0,
  minimum_payment DECIMAL(15, 2) DEFAULT 0,
  due_date INTEGER,
  payment_status VARCHAR(50),
  billing_cycle_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_last_four ON credit_cards(last_four_digits);;

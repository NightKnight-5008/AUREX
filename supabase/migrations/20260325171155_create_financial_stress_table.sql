-- Financial stress index
CREATE TABLE financial_stress_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stress_score DECIMAL(5, 2) CHECK (stress_score >= 0 AND stress_score <= 100),
  debt_to_limit_ratio DECIMAL(5, 4),
  payment_history_score DECIMAL(5, 2),
  utilization_rate DECIMAL(5, 4),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_stress_user_id ON financial_stress_index(user_id);
CREATE INDEX idx_financial_stress_calculated_at ON financial_stress_index(calculated_at);;

-- RLS Policies for credit_cards
CREATE POLICY "Users can view own cards"
  ON credit_cards FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own cards"
  ON credit_cards FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid()::text = user_id::text);;

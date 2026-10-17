-- RLS Policies for sms_logs
CREATE POLICY "Users can view own SMS logs"
  ON sms_logs FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for user_settings
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for semi_accounts
CREATE POLICY "Users can manage own semi accounts"
  ON semi_accounts FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for security_credentials
CREATE POLICY "Users can manage own security credentials"
  ON security_credentials FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for encryption_keys
CREATE POLICY "Users can manage own encryption keys"
  ON encryption_keys FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for card_field_change_history
CREATE POLICY "Users can view own card history"
  ON card_field_change_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM credit_cards
    WHERE credit_cards.id = card_field_change_history.card_id
    AND credit_cards.user_id::text = auth.uid()::text
  ));

-- RLS Policies for card_reliability_metadata
CREATE POLICY "Users can view own card reliability"
  ON card_reliability_metadata FOR ALL
  USING (EXISTS (
    SELECT 1 FROM credit_cards
    WHERE credit_cards.id = card_reliability_metadata.card_id
    AND credit_cards.user_id::text = auth.uid()::text
  ));;

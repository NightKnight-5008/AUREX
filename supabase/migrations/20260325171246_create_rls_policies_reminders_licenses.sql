-- RLS Policies for user_reminder_preferences
CREATE POLICY "Users can manage own reminder preferences"
  ON user_reminder_preferences FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for payment_reminders
CREATE POLICY "Users can manage own payment reminders"
  ON payment_reminders FOR ALL
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for licenses
CREATE POLICY "Users can view own licenses"
  ON licenses FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for license_activations
CREATE POLICY "Users can view own license activations"
  ON license_activations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM licenses
    WHERE licenses.id = license_activations.license_id
    AND licenses.user_id::text = auth.uid()::text
  ));

-- RLS Policies for financial_stress_index
CREATE POLICY "Users can view own financial stress"
  ON financial_stress_index FOR ALL
  USING (auth.uid()::text = user_id::text);;

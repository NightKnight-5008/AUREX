-- Add missing index for payment_reminders.transaction_id foreign key
CREATE INDEX IF NOT EXISTS idx_payment_reminders_transaction_id ON payment_reminders(transaction_id);;

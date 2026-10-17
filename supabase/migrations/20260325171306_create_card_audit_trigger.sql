-- Function to track card field changes
CREATE OR REPLACE FUNCTION track_card_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track limit_amount changes
  IF OLD.limit_amount IS DISTINCT FROM NEW.limit_amount THEN
    INSERT INTO card_field_change_history (card_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'limit_amount', OLD.limit_amount::text, NEW.limit_amount::text);
  END IF;
  
  -- Track current_balance changes
  IF OLD.current_balance IS DISTINCT FROM NEW.current_balance THEN
    INSERT INTO card_field_change_history (card_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'current_balance', OLD.current_balance::text, NEW.current_balance::text);
  END IF;
  
  -- Track outstanding_debt changes
  IF OLD.outstanding_debt IS DISTINCT FROM NEW.outstanding_debt THEN
    INSERT INTO card_field_change_history (card_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'outstanding_debt', OLD.outstanding_debt::text, NEW.outstanding_debt::text);
  END IF;
  
  -- Track payment_status changes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO card_field_change_history (card_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'payment_status', OLD.payment_status, NEW.payment_status);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_credit_card_changes
  AFTER UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION track_card_changes();;

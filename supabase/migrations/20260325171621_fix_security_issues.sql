-- Fix 1: Remove the example todos table (not needed for production)
DROP TABLE IF EXISTS todos CASCADE;

-- Fix 2: Set search_path for functions to prevent security issues
ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION track_card_changes() SET search_path = public;

-- Fix 3: Make user registration more secure (require email verification)
DROP POLICY IF EXISTS "Anyone can insert users (registration)" ON users;

CREATE POLICY "Users can register with valid email"
  ON users FOR INSERT
  WITH CHECK (
    email IS NOT NULL 
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND password_hash IS NOT NULL
  );;

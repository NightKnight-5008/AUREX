-- Semi accounts table (for Android SMS collection)
CREATE TABLE semi_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sim_slot INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semi_accounts_user_id ON semi_accounts(user_id);
CREATE INDEX idx_semi_accounts_phone ON semi_accounts(phone_number);

-- Security credentials table (for Android app)
CREATE TABLE security_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  device_token VARCHAR(255) NOT NULL,
  workspace_username VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_credentials_user_id ON security_credentials(user_id);
CREATE INDEX idx_security_credentials_device_id ON security_credentials(device_id);;

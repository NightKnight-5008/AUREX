-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  android_app_password VARCHAR(255),
  auth_token VARCHAR(500),
  token_expires_at TIMESTAMPTZ,
  language VARCHAR(10) DEFAULT 'en',
  email_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(10),
  verification_code_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_token ON users(auth_token);
CREATE INDEX idx_users_phone ON users(phone_number);;

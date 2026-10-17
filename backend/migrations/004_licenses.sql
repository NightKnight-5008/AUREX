/**
 * AUREX License System - Database Schema
 *
 * Stores issued licenses and device activations
 *
 * FEATURES:
 * - Atomic device activation tracking
 * - License revocation support
 * - Audit trail of all license operations
 * - Prevents over-activation via constraints
 */

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  license_id UUID PRIMARY KEY,
  customer_id VARCHAR(255),
  edition VARCHAR(50) NOT NULL CHECK (edition IN ('TRIAL', 'PRO', 'ENTERPRISE')),
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  max_devices INTEGER NOT NULL DEFAULT 1,
  activated_devices INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT max_devices_positive CHECK (max_devices > 0),
  CONSTRAINT activated_within_max CHECK (activated_devices <= max_devices)
);

-- Device activations table
CREATE TABLE IF NOT EXISTS license_activations (
  id SERIAL PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(license_id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  activated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  UNIQUE(license_id, device_fingerprint)
);

-- License audit log
CREATE TABLE IF NOT EXISTS license_audit_log (
  id SERIAL PRIMARY KEY,
  license_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  device_fingerprint VARCHAR(255),
  details JSONB,
  ip_address INET,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_license_audit_license (license_id),
  INDEX idx_license_audit_timestamp (timestamp)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_licenses_customer ON licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_edition ON licenses(edition);
CREATE INDEX IF NOT EXISTS idx_licenses_expires ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_licenses_revoked ON licenses(revoked);
CREATE INDEX IF NOT EXISTS idx_activations_license ON license_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_activations_device ON license_activations(device_fingerprint);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE licenses IS 'Stores all issued AUREX licenses';
COMMENT ON COLUMN licenses.license_id IS 'UUID v4 license identifier';
COMMENT ON COLUMN licenses.customer_id IS 'Customer/organization identifier';
COMMENT ON COLUMN licenses.edition IS 'License tier: TRIAL, PRO, or ENTERPRISE';
COMMENT ON COLUMN licenses.max_devices IS 'Maximum number of devices that can activate this license';
COMMENT ON COLUMN licenses.activated_devices IS 'Current number of activated devices (atomic counter)';
COMMENT ON COLUMN licenses.features IS 'JSON array of enabled features';
COMMENT ON COLUMN licenses.signature IS 'Ed25519 signature (base64)';
COMMENT ON COLUMN licenses.revoked IS 'Whether license has been revoked';

COMMENT ON TABLE license_activations IS 'Tracks which devices have activated each license';
COMMENT ON COLUMN license_activations.device_fingerprint IS 'Unique device identifier (privacy-safe hash)';
COMMENT ON COLUMN license_activations.last_verified_at IS 'Last successful verification timestamp';

COMMENT ON TABLE license_audit_log IS 'Audit trail of all license operations';

-- ============================================================================
-- AUREX Multi-Tenant RBAC Database Schema
-- SOC-2 / ISO-Ready Access Control System
-- ============================================================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TENANT ISOLATION
-- ============================================================================

-- Workspaces (Companies/Tenants)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  company_username VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,

  -- Metadata
  owner_user_id UUID NOT NULL, -- First user who created workspace
  settings JSONB DEFAULT '{}',

  -- Indexes
  CONSTRAINT company_username_format CHECK (company_username ~ '^[a-z0-9_-]+$')
);

CREATE INDEX idx_workspaces_username ON workspaces(company_username) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

-- Users (Global - across all workspaces)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,

  -- Security
  email_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,

  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created ON users(created_at);

-- ============================================================================
-- WORKSPACE MEMBERSHIP & ROLES
-- ============================================================================

-- Roles (predefined + custom)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  role_key VARCHAR(50) NOT NULL, -- OWNER, CFO, MANAGER, etc.
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(workspace_id, role_key)
);

CREATE INDEX idx_roles_workspace ON roles(workspace_id);
CREATE INDEX idx_roles_key ON roles(role_key);

-- Workspace Members (User-Workspace-Role mapping)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  permission_template_id UUID NULL REFERENCES permission_templates(id) ON DELETE SET NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, revoked
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_by UUID NULL REFERENCES users(id),
  approved_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  revoked_by UUID NULL REFERENCES users(id),

  -- Ensure one role per user per workspace
  UNIQUE(workspace_id, user_id),

  CONSTRAINT status_check CHECK (status IN ('active', 'suspended', 'revoked'))
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_status ON workspace_members(status);

-- ============================================================================
-- PERMISSION SYSTEM
-- ============================================================================

-- Permission Templates (Predefined access patterns)
CREATE TABLE permission_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_key VARCHAR(50) NOT NULL, -- EXECUTIVE, FINANCE, MANAGEMENT, etc.
  description TEXT,
  is_system_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(workspace_id, template_key)
);

CREATE INDEX idx_permission_templates_workspace ON permission_templates(workspace_id);

-- Atomic Permissions (Granular capabilities)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key VARCHAR(100) UNIQUE NOT NULL, -- PAYROLL_VIEW, CARDS_EDIT, etc.
  permission_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- PAYROLL, CARDS, FINANCE, SETTINGS, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_key ON permissions(permission_key);

-- Template-Permission Mapping
CREATE TABLE template_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES permission_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE, -- TRUE = grant, FALSE = deny (for overrides)

  UNIQUE(template_id, permission_id)
);

CREATE INDEX idx_template_permissions_template ON template_permissions(template_id);
CREATE INDEX idx_template_permissions_permission ON template_permissions(permission_id);

-- User Permission Overrides (Individual exceptions)
CREATE TABLE user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_member_id UUID NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL, -- TRUE = add permission, FALSE = revoke permission
  override_reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(workspace_member_id, permission_id)
);

CREATE INDEX idx_user_overrides_member ON user_permission_overrides(workspace_member_id);
CREATE INDEX idx_user_overrides_created_by ON user_permission_overrides(created_by);

-- ============================================================================
-- ACCESS REQUEST WORKFLOW
-- ============================================================================

-- Access Requests (Pending approvals)
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  full_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, denied
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Approval tracking
  reviewed_by UUID NULL REFERENCES users(id),
  reviewed_at TIMESTAMP NULL,
  denial_reason TEXT NULL,

  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'denied'))
);

CREATE INDEX idx_access_requests_workspace ON access_requests(workspace_id);
CREATE INDEX idx_access_requests_user ON access_requests(user_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_created ON access_requests(created_at DESC);

-- ============================================================================
-- DELEGATED APPROVERS
-- ============================================================================

-- Delegated Approvers (Users who can approve access requests)
CREATE TABLE delegated_approvers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  can_approve_requests BOOLEAN DEFAULT TRUE,
  can_modify_roles BOOLEAN DEFAULT FALSE,
  can_modify_permissions BOOLEAN DEFAULT FALSE,
  can_revoke_access BOOLEAN DEFAULT FALSE,

  delegated_by UUID NOT NULL REFERENCES users(id),
  delegated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP NULL,

  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_delegated_approvers_workspace ON delegated_approvers(workspace_id);
CREATE INDEX idx_delegated_approvers_user ON delegated_approvers(user_id);

-- ============================================================================
-- EVENT-SOURCED AUDIT LOG
-- ============================================================================

-- Audit Events (Immutable, append-only)
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id VARCHAR(100) UNIQUE NOT NULL, -- Globally unique event identifier

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- ACCESS_REQUEST_CREATED, ACCESS_APPROVED, etc.

  -- Actor & Target
  actor_user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NULL REFERENCES users(id),

  -- Event payload
  before_state JSONB NULL,
  after_state JSONB NULL,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  -- IP & Security
  ip_address INET NULL,
  user_agent TEXT NULL
);

CREATE INDEX idx_audit_events_workspace ON audit_events(workspace_id);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_target ON audit_events(target_user_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);

-- Prevent updates and deletes on audit_events
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_immutable_update
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_events_immutable_delete
BEFORE DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- DEFAULT DATA (System Roles & Permissions)
-- ============================================================================

-- Insert default system permissions
INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
  -- Payroll
  ('PAYROLL_VIEW', 'View Payroll', 'View payroll data and reports', 'PAYROLL'),
  ('PAYROLL_EDIT', 'Edit Payroll', 'Modify payroll transactions', 'PAYROLL'),
  ('PAYROLL_APPROVE', 'Approve Payroll', 'Approve payroll disbursements', 'PAYROLL'),

  -- Cards
  ('CARDS_VIEW', 'View Cards', 'View company card details', 'CARDS'),
  ('CARDS_EDIT', 'Edit Cards', 'Modify card settings and limits', 'CARDS'),
  ('CARDS_CREATE', 'Create Cards', 'Issue new company cards', 'CARDS'),

  -- Finance
  ('FINANCE_VIEW', 'View Finance', 'View financial metrics and reports', 'FINANCE'),
  ('FINANCE_EDIT', 'Edit Finance', 'Modify financial transactions', 'FINANCE'),
  ('FINANCE_APPROVE', 'Approve Finance', 'Approve financial operations', 'FINANCE'),

  -- Metrics
  ('METRICS_VIEW', 'View Metrics', 'View business metrics and analytics', 'METRICS'),

  -- SMS
  ('SMS_VIEW', 'View SMS', 'View SMS logs and messages', 'SMS'),

  -- Tax
  ('TAX_VIEW', 'View Tax', 'View tax calculations and reports', 'TAX'),
  ('TAX_EDIT', 'Edit Tax', 'Modify tax settings', 'TAX'),

  -- Files
  ('FILES_VIEW', 'View Files', 'View uploaded files', 'FILES'),
  ('FILES_UPLOAD', 'Upload Files', 'Upload new files', 'FILES'),

  -- Settings
  ('SETTINGS_VIEW', 'View Settings', 'View workspace settings', 'SETTINGS'),
  ('SETTINGS_EDIT', 'Edit Settings', 'Modify workspace settings', 'SETTINGS'),

  -- User Management
  ('USERS_VIEW', 'View Users', 'View workspace members', 'USERS'),
  ('USERS_MANAGE', 'Manage Users', 'Manage user roles and permissions', 'USERS'),
  ('USERS_APPROVE', 'Approve Users', 'Approve access requests', 'USERS'),

  -- Audit
  ('AUDIT_VIEW', 'View Audit Logs', 'View audit logs and security events', 'AUDIT');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_workspace_id UUID,
  p_permission_key VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
  v_member_id UUID;
  v_template_id UUID;
BEGIN
  -- Get workspace member record
  SELECT id, permission_template_id INTO v_member_id, v_template_id
  FROM workspace_members
  WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id
    AND status = 'active';

  IF v_member_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for explicit override first
  SELECT granted INTO v_has_permission
  FROM user_permission_overrides upo
  JOIN permissions p ON p.id = upo.permission_id
  WHERE upo.workspace_member_id = v_member_id
    AND p.permission_key = p_permission_key;

  IF FOUND THEN
    RETURN v_has_permission;
  END IF;

  -- Check template permissions
  SELECT tp.granted INTO v_has_permission
  FROM template_permissions tp
  JOIN permissions p ON p.id = tp.permission_id
  WHERE tp.template_id = v_template_id
    AND p.permission_key = p_permission_key;

  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own workspace data
-- (Policies need to be customized based on your auth implementation)
CREATE POLICY workspace_members_isolation ON workspace_members
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = current_setting('app.current_user_id')::UUID
  ));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role_id);
CREATE INDEX idx_access_requests_workspace_status ON access_requests(workspace_id, status);
CREATE INDEX idx_audit_events_workspace_timestamp ON audit_events(workspace_id, timestamp DESC);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE workspaces IS 'Multi-tenant workspaces (one per company)';
COMMENT ON TABLE users IS 'Global user accounts';
COMMENT ON TABLE workspace_members IS 'User-workspace-role associations';
COMMENT ON TABLE roles IS 'Workspace-specific roles';
COMMENT ON TABLE permission_templates IS 'Reusable permission sets';
COMMENT ON TABLE permissions IS 'Atomic permission capabilities';
COMMENT ON TABLE template_permissions IS 'Template-to-permission mappings';
COMMENT ON TABLE user_permission_overrides IS 'Individual permission exceptions';
COMMENT ON TABLE access_requests IS 'Pending workspace access requests';
COMMENT ON TABLE delegated_approvers IS 'Users with approval authority';
COMMENT ON TABLE audit_events IS 'Immutable event log for compliance';

COMMENT ON FUNCTION user_has_permission IS 'Resolves effective permissions for a user in a workspace';

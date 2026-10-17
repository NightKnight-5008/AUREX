-- AUREX Financial Operating System - RBAC Seed Data
-- Default roles and permissions for financial management system
-- Created: 2026-02-07

-- ============================================================================
-- SEED PERMISSIONS
-- ============================================================================

INSERT INTO permissions (resource, action, description) VALUES
-- User Management Permissions
('users', 'create', 'Create new user accounts'),
('users', 'read', 'View user details'),
('users', 'update', 'Update user profile and settings'),
('users', 'delete', 'Delete user accounts'),
('users', 'manage_roles', 'Assign and revoke user roles'),
('users', 'manage_sessions', 'View and terminate user sessions'),

-- Ledger Permissions
('ledger', 'create', 'Create new ledger entries'),
('ledger', 'read', 'View ledger entries and transaction history'),
('ledger', 'update', 'Update ledger entries'),
('ledger', 'delete', 'Delete ledger entries'),
('ledger', 'reverse', 'Reverse transactions'),
('ledger', 'audit', 'View complete audit trail'),

-- Account Permissions
('accounts', 'create', 'Create new accounts'),
('accounts', 'read', 'View chart of accounts'),
('accounts', 'update', 'Modify account settings'),
('accounts', 'delete', 'Delete accounts'),
('accounts', 'reconcile', 'Perform account reconciliation'),

-- SMS & Trust Permissions
('sms', 'read', 'View SMS messages'),
('sms', 'review', 'Review and approve/reject SMS'),
('sms', 'trust_management', 'Manage trust levels and scoring'),

-- FX & Multi-Currency Permissions
('fx', 'read', 'View exchange rates'),
('fx', 'manage_rates', 'Update and manage FX rates'),
('fx', 'view_history', 'View FX rate history'),

-- Insights & Analytics Permissions
('insights', 'create', 'Generate new insights'),
('insights', 'read', 'View AI-generated insights'),
('insights', 'edit', 'Edit insight explanations'),
('insights', 'delete', 'Delete insights'),

-- OAuth & Secrets Permissions
('oauth', 'manage', 'Manage OAuth token connections'),
('secrets', 'manage', 'Store and retrieve encrypted secrets'),

-- Admin Permissions
('admin', 'system_config', 'Modify system configuration'),
('admin', 'database', 'Direct database access (dangerous)'),
('admin', 'user_impersonate', 'Impersonate other users for support'),

-- Audit & Compliance Permissions
('audit', 'read', 'View audit logs'),
('audit', 'export', 'Export audit data for compliance'),

ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED ROLES
-- ============================================================================

-- Owner/Administrator Role - Full system access
INSERT INTO roles (name, description, permissions) VALUES (
  'Owner',
  'Owner with full system access - typically company founder/CEO',
  json_build_array(
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:manage_roles', 'users:manage_sessions',
    'ledger:create', 'ledger:read', 'ledger:update', 'ledger:delete', 'ledger:reverse', 'ledger:audit',
    'accounts:create', 'accounts:read', 'accounts:update', 'accounts:delete', 'accounts:reconcile',
    'sms:read', 'sms:review', 'sms:trust_management',
    'fx:read', 'fx:manage_rates', 'fx:view_history',
    'insights:create', 'insights:read', 'insights:edit', 'insights:delete',
    'oauth:manage', 'secrets:manage',
    'admin:system_config', 'admin:database', 'admin:user_impersonate',
    'audit:read', 'audit:export'
  )
) ON CONFLICT DO NOTHING;

-- CFO Role - Chief Financial Officer
INSERT INTO roles (name, description, permissions) VALUES (
  'CFO',
  'Chief Financial Officer - strategic financial decisions and full reporting',
  json_build_array(
    'users:read', 'users:manage_roles',
    'ledger:create', 'ledger:read', 'ledger:update', 'ledger:reverse', 'ledger:audit',
    'accounts:create', 'accounts:read', 'accounts:update', 'accounts:reconcile',
    'sms:read', 'sms:review', 'sms:trust_management',
    'fx:read', 'fx:manage_rates', 'fx:view_history',
    'insights:create', 'insights:read', 'insights:edit',
    'oauth:manage', 'secrets:manage',
    'audit:read', 'audit:export'
  )
) ON CONFLICT DO NOTHING;

-- Finance Manager Role - Day-to-day accounting and operations
INSERT INTO roles (name, description, permissions) VALUES (
  'Finance',
  'Finance Manager - handles day-to-day transactions and bookkeeping',
  json_build_array(
    'users:read',
    'ledger:create', 'ledger:read', 'ledger:update', 'ledger:reverse',
    'accounts:read', 'accounts:update', 'accounts:reconcile',
    'sms:read', 'sms:review',
    'fx:read', 'fx:view_history',
    'insights:read',
    'oauth:manage',
    'audit:read'
  )
) ON CONFLICT DO NOTHING;

-- HR Role - Human Resources employee information
INSERT INTO roles (name, description, permissions) VALUES (
  'HR',
  'Human Resources Manager - employee data and payroll related accounts',
  json_build_array(
    'users:read',
    'ledger:read',
    'accounts:read',
    'sms:read',
    'insights:read',
    'audit:read'
  )
) ON CONFLICT DO NOTHING;

-- Auditor Role - Compliance and audit trail review
INSERT INTO roles (name, description, permissions) VALUES (
  'Auditor',
  'Internal/External Auditor - read-only access to audit trail and transactions',
  json_build_array(
    'users:read',
    'ledger:read',
    'accounts:read',
    'sms:read',
    'insights:read',
    'audit:read', 'audit:export'
  )
) ON CONFLICT DO NOTHING;

-- Read-Only Role - Stakeholder view access
INSERT INTO roles (name, description, permissions) VALUES (
  'ReadOnly',
  'Read-only stakeholder - view reports and insights without modification',
  json_build_array(
    'ledger:read',
    'accounts:read',
    'insights:read',
    'audit:read'
  )
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTES ON ROLE HIERARCHY AND PERMISSIONS
-- ============================================================================

-- Role Hierarchy (from least to most privileged):
-- 1. ReadOnly - Can only view reports and insights
-- 2. Auditor - Can view transaction history and audit logs, export for compliance
-- 3. HR - Can view employee and payroll data
-- 4. Finance - Can create and manage daily transactions
-- 5. CFO - Can approve reversals and make strategic decisions
-- 6. Owner - Full system access including user management and configuration

-- Permission Naming Convention:
-- {resource}:{action}
-- Where resource is the entity (users, ledger, accounts, etc.)
-- And action is the operation (create, read, update, delete, etc.)

-- Granular Permission Examples:
-- ledger:create - Can create new ledger entries
-- ledger:reverse - Can only reverse (not delete) entries
-- sms:review - Can review SMS but not create
-- admin:user_impersonate - Dangerous permission for support purposes
-- admin:database - Direct DB access (rarely used)

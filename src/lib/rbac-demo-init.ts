/**
 * RBAC Demo Initialization
 * Sets up sample data for testing the multi-tenant RBAC system
 */

import type { User } from '@/types/rbac';

export function initializeRBACDemo() {
  // Check if already initialized
  if (localStorage.getItem('rbac_demo_initialized') === 'true') {
    console.log('RBAC demo already initialized');
    return;
  }

  console.log('Initializing RBAC demo data...');

  // Create sample user (simulating current logged-in user)
  const demoUser: User = {
    id: crypto.randomUUID(),
    email: 'ceo@example.com',
    fullName: 'Jane Doe',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    deletedAt: null,
    emailVerified: true,
    twoFactorEnabled: false,
  };

  // Save user
  localStorage.setItem('rbac_user', JSON.stringify(demoUser));

  // Initialize empty arrays for other entities
  localStorage.setItem('rbac_workspaces', JSON.stringify([]));
  localStorage.setItem('rbac_roles', JSON.stringify([]));
  localStorage.setItem('rbac_workspace_members', JSON.stringify([]));
  localStorage.setItem('rbac_access_requests', JSON.stringify([]));
  localStorage.setItem('rbac_audit_log', JSON.stringify([]));
  localStorage.setItem('rbac_delegated_approvers', JSON.stringify([]));

  // Mark as initialized
  localStorage.setItem('rbac_demo_initialized', 'true');

  console.log('RBAC demo initialized successfully');
  console.log('Demo user:', demoUser);
}

export function resetRBACDemo() {
  localStorage.removeItem('rbac_demo_initialized');
  localStorage.removeItem('rbac_user');
  localStorage.removeItem('rbac_context');
  localStorage.removeItem('rbac_workspaces');
  localStorage.removeItem('rbac_roles');
  localStorage.removeItem('rbac_workspace_members');
  localStorage.removeItem('rbac_access_requests');
  localStorage.removeItem('rbac_audit_log');
  localStorage.removeItem('rbac_delegated_approvers');
  localStorage.removeItem('rbac_pending_request');

  console.log('RBAC demo reset complete');
}

// Helper to get current user context
export function getCurrentUserContext() {
  const user = localStorage.getItem('rbac_user');
  const context = localStorage.getItem('rbac_context');

  return {
    user: user ? JSON.parse(user) : null,
    context: context ? JSON.parse(context) : null,
  };
}

/**
 * Permission Enforcement Utilities
 *
 * CRITICAL: This module provides hard permission enforcement for RBAC.
 * Frontend guards prevent unauthorized route access.
 * Backend validation (to be implemented) must mirror these checks.
 */

import type { PermissionSet, WorkspaceMembership } from '@/hooks/use-workspace';
import { getUserPermissions } from '@/hooks/use-workspace';

/**
 * Tab definitions with permission requirements
 */
export interface TabDefinition {
  value: string;
  label: string;
  icon: string;
  requiredPermission: keyof PermissionSet;
  description: string;
}

export const TAB_DEFINITIONS: TabDefinition[] = [
  {
    value: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    requiredPermission: 'canViewOverview',
    description: 'Financial overview and dashboard',
  },
  {
    value: 'metrics',
    label: 'Metrics',
    icon: 'BarChart3',
    requiredPermission: 'canViewMetrics',
    description: 'Business metrics and analytics',
  },
  {
    value: 'cards',
    label: 'Cards',
    icon: 'CreditCard',
    requiredPermission: 'canViewCards',
    description: 'Company card management',
  },
  {
    value: 'payroll',
    label: 'Payroll',
    icon: 'Users',
    requiredPermission: 'canViewPayroll',
    description: 'Employee payroll management',
  },
  {
    value: 'assistant',
    label: 'Assistant',
    icon: 'Sparkles',
    requiredPermission: 'canViewAssistant',
    description: 'AI financial assistant',
  },
  {
    value: 'sms',
    label: 'SMS Log',
    icon: 'MessageSquare',
    requiredPermission: 'canViewSmsLog',
    description: 'SMS transaction monitoring',
  },
  {
    value: 'tax',
    label: 'Tax',
    icon: 'Calculator',
    requiredPermission: 'canViewTax',
    description: 'Tax calculation and filing',
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'Settings',
    requiredPermission: 'canViewSettings',
    description: 'User and workspace settings',
  },
];

/**
 * Check if user has permission to access a specific tab
 *
 * CRITICAL: This is the frontend permission gate.
 * Returns false if:
 * - User is not approved
 * - User lacks the required permission
 */
export function canAccessTab(
  tabValue: string,
  membership: WorkspaceMembership | null
): boolean {
  // User must be approved
  if (!membership || membership.status !== 'approved') {
    return false;
  }

  // Get effective permissions
  const permissions = getUserPermissions(membership);
  if (!permissions) {
    return false;
  }

  // Find tab definition
  const tabDef = TAB_DEFINITIONS.find(t => t.value === tabValue);
  if (!tabDef) {
    return false;
  }

  // Check permission
  return permissions[tabDef.requiredPermission] === true;
}

/**
 * Get list of accessible tabs for a user
 *
 * Returns only tabs the user is permitted to view.
 * Tabs not in this list should be completely hidden.
 */
export function getAccessibleTabs(
  membership: WorkspaceMembership | null
): TabDefinition[] {
  if (!membership || membership.status !== 'approved') {
    return [];
  }

  return TAB_DEFINITIONS.filter(tab => canAccessTab(tab.value, membership));
}

/**
 * Get the first accessible tab (for default routing)
 *
 * Returns 'overview' if accessible, otherwise the first available tab.
 * Returns null if user has no accessible tabs.
 */
export function getDefaultTab(
  membership: WorkspaceMembership | null
): string | null {
  const accessible = getAccessibleTabs(membership);

  if (accessible.length === 0) {
    return null;
  }

  // Prefer overview if accessible
  if (accessible.some(t => t.value === 'overview')) {
    return 'overview';
  }

  // Otherwise return first accessible tab
  return accessible[0].value;
}

/**
 * Check if user can perform a specific action
 *
 * Used for action-level permissions (create, edit, delete, etc.)
 */
export function canPerformAction(
  action: keyof PermissionSet,
  membership: WorkspaceMembership | null
): boolean {
  if (!membership || membership.status !== 'approved') {
    return false;
  }

  const permissions = getUserPermissions(membership);
  if (!permissions) {
    return false;
  }

  return permissions[action] === true;
}

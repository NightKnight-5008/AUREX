/**
 * Permission Guard for API Requests
 *
 * This module provides client-side permission validation before API calls.
 * IMPORTANT: This is NOT sufficient for security - backend validation is MANDATORY.
 *
 * Purpose:
 * - Provide early UX feedback (prevent unnecessary API calls)
 * - Client-side audit logging
 * - Type-safe permission checking
 *
 * Security Model:
 * - Frontend checks are UX optimization only
 * - Backend MUST validate all permissions
 * - Assume malicious clients can bypass frontend checks
 */

import type { WorkspaceMembership, PermissionSet } from '@/hooks/use-workspace';
import { getUserPermissions, logAuditEvent, type AuditEventType } from '@/hooks/use-workspace';

/**
 * Permission requirement for an API action
 */
export interface PermissionRequirement {
  permission: keyof PermissionSet;
  action: string; // Human-readable description
  resourceType?: string; // 'card', 'transaction', 'payroll', etc.
}

/**
 * Result of permission check
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: string[];
}

/**
 * Check if user has required permission
 *
 * @param membership - User's workspace membership
 * @param requirement - Permission requirement to check
 * @returns Permission check result
 */
export function checkPermission(
  membership: WorkspaceMembership | null,
  requirement: PermissionRequirement
): PermissionCheckResult {
  // No membership = no access
  if (!membership) {
    return {
      allowed: false,
      reason: 'No workspace membership found',
    };
  }

  // Only approved members can perform actions
  if (membership.status !== 'approved') {
    return {
      allowed: false,
      reason: `Membership status is ${membership.status}, must be approved`,
    };
  }

  // Get effective permissions
  const permissions = getUserPermissions(membership);

  if (!permissions) {
    return {
      allowed: false,
      reason: 'Could not resolve user permissions',
    };
  }

  // Check specific permission
  const hasPermission = permissions[requirement.permission];

  if (!hasPermission) {
    return {
      allowed: false,
      reason: `Missing required permission: ${requirement.permission}`,
      missingPermissions: [requirement.permission],
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Check multiple permissions (all must be satisfied)
 *
 * @param membership - User's workspace membership
 * @param requirements - Array of permission requirements
 * @returns Permission check result
 */
export function checkPermissions(
  membership: WorkspaceMembership | null,
  requirements: PermissionRequirement[]
): PermissionCheckResult {
  const missingPermissions: string[] = [];

  for (const req of requirements) {
    const result = checkPermission(membership, req);
    if (!result.allowed) {
      if (result.missingPermissions) {
        missingPermissions.push(...result.missingPermissions);
      }
    }
  }

  if (missingPermissions.length > 0) {
    return {
      allowed: false,
      reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
      missingPermissions,
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Guard a function call with permission check
 * Throws error if permission denied
 *
 * @param membership - User's workspace membership
 * @param requirement - Permission requirement
 * @param fn - Function to execute if permitted
 * @returns Result of function
 */
export async function withPermission<T>(
  membership: WorkspaceMembership | null,
  requirement: PermissionRequirement,
  fn: () => Promise<T>
): Promise<T> {
  const check = checkPermission(membership, requirement);

  if (!check.allowed) {
    // Log access denial
    if (membership) {
      logAuditEvent({
        workspaceId: membership.workspaceId,
        eventType: determineAuditEventType(requirement),
        performedBy: membership.userId,
        performedByName: membership.userName,
        targetUserId: null,
        targetUserName: null,
        targetResource: requirement.resourceType || null,
        action: `DENIED: ${requirement.action}`,
        metadata: {
          reason: check.reason,
          missingPermissions: check.missingPermissions,
        },
      });
    }

    throw new PermissionDeniedError(check.reason || 'Permission denied', requirement.permission);
  }

  // Execute the function
  return await fn();
}

/**
 * Custom error for permission denials
 */
export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public permission: string
  ) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Determine appropriate audit event type based on permission requirement
 */
function determineAuditEventType(requirement: PermissionRequirement): AuditEventType {
  const permission = requirement.permission;

  // Map permissions to audit event types
  if (permission.includes('Card')) {
    if (permission.includes('Create')) return 'card.created';
    if (permission.includes('Edit')) return 'card.updated';
    if (permission.includes('Delete')) return 'card.deleted';
  }

  if (permission.includes('Transaction')) {
    if (permission.includes('Create')) return 'transaction.created';
    if (permission.includes('Edit')) return 'transaction.updated';
    if (permission.includes('Delete')) return 'transaction.deleted';
  }

  if (permission.includes('Payroll')) {
    return 'payroll.updated';
  }

  if (permission.includes('ExportData')) {
    return 'data.exported';
  }

  if (permission.includes('ManageUsers')) {
    return 'user.permissions_changed';
  }

  if (permission.includes('ManagePermissions')) {
    return 'permission_template.updated';
  }

  // Default fallback
  return 'user.permissions_changed';
}

/**
 * Generate backend authorization header with workspace context
 *
 * Backend should validate:
 * 1. Token is valid
 * 2. User has membership in workspace
 * 3. Membership status is 'approved'
 * 4. User has required permission for the endpoint
 *
 * @param membership - User's workspace membership
 * @returns Headers to include in API requests
 */
export function getPermissionHeaders(membership: WorkspaceMembership | null): HeadersInit {
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Authorization': token ? `Bearer ${token}` : '',
  };

  // Include workspace context for backend validation
  if (membership) {
    headers['X-Workspace-Id'] = membership.workspaceId;
    headers['X-Membership-Id'] = membership.id;
  }

  return headers;
}

/**
 * Handle API permission errors with user-friendly messaging
 *
 * @param error - Error from API call
 * @returns User-friendly error message
 */
export function handlePermissionError(error: unknown): string {
  if (error instanceof PermissionDeniedError) {
    return `You don't have permission to perform this action. Required permission: ${error.permission}`;
  }

  if (error instanceof Error) {
    // Check for HTTP 403 Forbidden from backend
    if (error.message.includes('403') || error.message.toLowerCase().includes('forbidden')) {
      return 'Access denied. You don\'t have permission to access this resource. Please contact your workspace administrator.';
    }

    // Check for HTTP 401 Unauthorized
    if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
      return 'Your session has expired. Please sign in again.';
    }

    return error.message;
  }

  return 'An unknown error occurred. Please try again.';
}

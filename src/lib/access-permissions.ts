import type { WorkspaceMembership } from '@/hooks/use-workspace';

/**
 * Check if a user has permission to approve access requests
 *
 * Approvers include:
 * - OWNER (CEO)
 * - Delegated approvers with canManageUsers permission
 */
export function canApproveAccessRequests(membership: WorkspaceMembership | null): boolean {
  if (!membership || membership.status !== 'approved') {
    return false;
  }

  // Owner always has approval authority
  if (membership.role === 'owner') {
    return true;
  }

  // Check if user has delegated approval permission
  // This would come from custom permissions or their template
  const permissions = membership.customPermissions;
  if (permissions && permissions.canManageUsers) {
    return true;
  }

  return false;
}

/**
 * Get pending access requests for a workspace
 */
export function getPendingAccessRequests(workspaceId: string): WorkspaceMembership[] {
  const membershipsData = localStorage.getItem('workspace_memberships');
  const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

  return memberships.filter(
    m => m.workspaceId === workspaceId && m.status === 'pending'
  ).sort((a, b) =>
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

/**
 * Get approved memberships for a workspace
 */
export function getApprovedMemberships(workspaceId: string): WorkspaceMembership[] {
  const membershipsData = localStorage.getItem('workspace_memberships');
  const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

  return memberships.filter(
    m => m.workspaceId === workspaceId && m.status === 'approved'
  ).sort((a, b) =>
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

/**
 * Get denied access requests for a workspace
 */
export function getDeniedAccessRequests(workspaceId: string): WorkspaceMembership[] {
  const membershipsData = localStorage.getItem('workspace_memberships');
  const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

  return memberships.filter(
    m => m.workspaceId === workspaceId && m.status === 'denied'
  ).sort((a, b) =>
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

/**
 * Approve an access request with role and permissions configuration
 */
export function approveAccessRequestWithConfig(
  membershipId: string,
  approverId: string,
  approverName: string,
  config: {
    role: 'owner' | 'admin' | 'member' | 'viewer';
    permissionTemplateId: string;
    customPermissions?: import('@/hooks/use-workspace').PermissionSet | null;
  }
): boolean {
  try {
    const membershipsData = localStorage.getItem('workspace_memberships');
    const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

    const updatedMemberships = memberships.map(m => {
      if (m.id === membershipId && m.status === 'pending') {
        return {
          ...m,
          status: 'approved' as const,
          role: config.role,
          permissionTemplateId: config.permissionTemplateId,
          customPermissions: config.customPermissions || null,
          approvedAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
          respondedBy: approverId,
        };
      }
      return m;
    });

    localStorage.setItem('workspace_memberships', JSON.stringify(updatedMemberships));

    // Log audit event
    const membership = memberships.find(m => m.id === membershipId);
    if (membership) {
      const { logAuditEvent } = require('@/hooks/use-workspace');
      logAuditEvent({
        workspaceId: membership.workspaceId,
        eventType: 'user.access_approved',
        performedBy: approverId,
        performedByName: approverName,
        targetUserId: membership.userId,
        targetUserName: membership.userName,
        targetResource: null,
        action: `Approved access request for ${membership.userName} as ${config.role}`,
        metadata: {
          role: config.role,
          permissionTemplateId: config.permissionTemplateId,
          customPermissions: config.customPermissions,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to approve access request:', error);
    return false;
  }
}

/**
 * Approve an access request (simple version, kept for compatibility)
 */
export function approveAccessRequest(membershipId: string): boolean {
  try {
    const membershipsData = localStorage.getItem('workspace_memberships');
    const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

    const updatedMemberships = memberships.map(m => {
      if (m.id === membershipId && m.status === 'pending') {
        return {
          ...m,
          status: 'approved' as const,
          approvedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    localStorage.setItem('workspace_memberships', JSON.stringify(updatedMemberships));
    return true;
  } catch (error) {
    console.error('Failed to approve access request:', error);
    return false;
  }
}

/**
 * Deny an access request
 */
export function denyAccessRequest(membershipId: string): boolean {
  try {
    const membershipsData = localStorage.getItem('workspace_memberships');
    const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

    const updatedMemberships = memberships.map(m => {
      if (m.id === membershipId && m.status === 'pending') {
        return {
          ...m,
          status: 'denied' as const,
          deniedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    localStorage.setItem('workspace_memberships', JSON.stringify(updatedMemberships));
    return true;
  } catch (error) {
    console.error('Failed to deny access request:', error);
    return false;
  }
}

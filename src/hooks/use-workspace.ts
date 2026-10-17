import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
// supabase is imported dynamically to avoid Rolldown circular dependency crashes

// Permission Template Definitions
export type PermissionTemplateType = 'executive' | 'finance' | 'management' | 'operations' | 'read_only' | 'custom';

export interface PermissionTemplate {
  id: string;
  name: string;
  type: PermissionTemplateType;
  description: string;
  permissions: PermissionSet;
}

export interface PermissionSet {
  // Tab Visibility
  canViewOverview: boolean;
  canViewMetrics: boolean;
  canViewCards: boolean;
  canViewPayroll: boolean;
  canViewAssistant: boolean;
  canViewSmsLog: boolean;
  canViewTax: boolean;
  canViewFiles: boolean;
  canViewSettings: boolean;

  // Action Permissions
  canCreateCards: boolean;
  canEditCards: boolean;
  canDeleteCards: boolean;
  canCreateTransactions: boolean;
  canEditTransactions: boolean;
  canDeleteTransactions: boolean;
  canEditPayroll: boolean;
  canViewSensitiveData: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canManagePermissions: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  username: string; // Unique company username for access requests
  creatorUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissionTemplateId: string;
  customPermissions: PermissionSet | null; // Override template if needed
  status: 'approved' | 'pending' | 'denied';
  requestedAt: string;
  requestedRole: string; // User-provided role description
  requestJustification: string; // Why they need access
  respondedAt: string | null;
  respondedBy: string | null;
  denialReason: string | null;
}

// Audit Log Event Types
export type AuditEventType =
  | 'workspace.created'
  | 'user.access_requested'
  | 'user.access_approved'
  | 'user.access_denied'
  | 'user.role_changed'
  | 'user.permissions_changed'
  | 'user.access_revoked'
  | 'permission_template.created'
  | 'permission_template.updated'
  | 'permission_template.deleted'
  | 'card.created'
  | 'card.updated'
  | 'card.deleted'
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.deleted'
  | 'payroll.updated'
  | 'data.exported';

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  eventType: AuditEventType;
  performedBy: string; // User ID
  performedByName: string; // User display name
  targetUserId: string | null; // User affected (if applicable)
  targetUserName: string | null;
  targetResource: string | null; // Resource ID (card, transaction, etc.)
  action: string; // Human-readable action
  metadata: Record<string, any>; // Additional context
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface WorkspaceState {
  workspace: Workspace | null;
  membership: WorkspaceMembership | null;
  isCreator: boolean;
  hasWorkspace: boolean;
  hasPendingRequest: boolean;
  isDenied: boolean;
  isApproved: boolean;
  isLoading: boolean;
}

/**
 * Hook to manage workspace state for authoritative UX routing
 *
 * Returns the current workspace state which determines which screen to render:
 * - No workspace + isCreator → Create Workspace Screen
 * - No workspace + !isCreator → Request Access Screen
 * - Pending request → Pending Approval Screen
 * - Denied request → Denied Access Screen
 * - Approved membership → Dashboard
 */
export function useWorkspace(): WorkspaceState {
  const { user, isAuthenticated } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [membership, setMembership] = useState<WorkspaceMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    const loadWorkspaceState = async () => {
      try {
        // Try API first (source of truth)
        const response = await apiClient.getMyWorkspace() as {
          workspace: Workspace | null;
          membership: WorkspaceMembership | null;
        };

        setWorkspace(response.workspace);
        setMembership(response.membership);

        // Sync to localStorage as cache
        if (response.workspace) {
          const workspaces = [response.workspace];
          localStorage.setItem('workspaces', JSON.stringify(workspaces));
        }
        if (response.membership) {
          const memberships = [response.membership];
          localStorage.setItem('workspace_memberships', JSON.stringify(memberships));
        }
      } catch {
        // Fallback: Load from localStorage cache when API unavailable
        console.warn('Workspace API unavailable, using localStorage cache');

        const workspacesData = localStorage.getItem('workspaces');
        const membershipsData = localStorage.getItem('workspace_memberships');

        let userWorkspace: Workspace | null = null;
        let userMembership: WorkspaceMembership | null = null;

        const workspaces: Workspace[] = workspacesData ? JSON.parse(workspacesData) : [];
        const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

        userMembership = memberships.find(m => m.userId === user.id) || null;

        if (userMembership) {
          userWorkspace = workspaces.find(w => w.id === userMembership!.workspaceId) || null;
        } else {
          userWorkspace = workspaces.find(w => w.creatorUserId === user.id) || null;

          if (userWorkspace) {
            userMembership = memberships.find(
              m => m.workspaceId === userWorkspace!.id && m.userId === user.id
            ) || null;
          }
        }

        setWorkspace(userWorkspace);
        setMembership(userMembership);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaceState();
  }, [user, isAuthenticated]);

  // Determine user state flags
  const isCreator = !!workspace && workspace.creatorUserId === user?.id;
  const hasWorkspace = !!workspace;
  const hasPendingRequest = !!membership && membership.status === 'pending';
  const isDenied = !!membership && membership.status === 'denied';
  const isApproved = !!membership && membership.status === 'approved';

  return {
    workspace,
    membership,
    isCreator,
    hasWorkspace,
    hasPendingRequest,
    isDenied,
    isApproved,
    isLoading,
  };
}

export async function createWorkspace(
  userId: string,
  userName: string,
  userEmail: string,
  workspaceName: string,
  workspaceUsername: string
): Promise<Workspace> {
  const { supabase } = await import('@/lib/supabase');
  let companyData: any = null;

  try {
    // First, insert into Supabase companies table
    const result = await (supabase as any)
      .from('companies')
      .insert({
        name: workspaceName,
        username: workspaceUsername,
        creator_user_id: userId,
      })
      .select()
      .single();

    if (result.error) {
      console.warn('Failed to create company in Supabase (falling back to local):', result.error);
    } else {
      companyData = result.data;
    }
  } catch (error) {
    console.warn('Supabase company creation error (falling back to local):', error);
  }

  // If Supabase creation failed or was bypassed, generate local fallback data
  if (!companyData) {
    companyData = {
      id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: workspaceName,
      username: workspaceUsername,
      creator_user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Next, insert into company_members
  try {
    const { error: memberError } = await (supabase as any)
      .from('company_members')
      .insert({
        company_id: companyData.id,
        user_id: userId,
        role: 'owner',
        status: 'approved',
      });

    if (memberError) {
      console.warn('Failed to add creator as member in Supabase (falling back to local):', memberError);
    }
  } catch (error) {
    console.warn('Supabase member addition error (falling back to local):', error);
  }

  // Also maintain the localStorage fallback/cache behavior for the rest of the app
  const workspacesData = localStorage.getItem('workspaces');
  const membershipsData = localStorage.getItem('workspace_memberships');
  const templatesData = localStorage.getItem('permission_templates');

  const workspaces: Workspace[] = workspacesData ? JSON.parse(workspacesData) : [];
  const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];
  let templates: PermissionTemplate[] = templatesData ? JSON.parse(templatesData) : [];

  if (templates.length === 0) {
    templates = getDefaultPermissionTemplates();
    localStorage.setItem('permission_templates', JSON.stringify(templates));
  }

  const executiveTemplate = templates.find(t => t.type === 'executive')!;

  const newWorkspace: Workspace = {
    id: companyData.id,
    name: companyData.name,
    username: companyData.username,
    creatorUserId: companyData.creator_user_id,
    createdAt: companyData.created_at || new Date().toISOString(),
    updatedAt: companyData.updated_at || new Date().toISOString(),
  };

  const newMembership: WorkspaceMembership = {
    id: `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workspaceId: companyData.id,
    userId: userId,
    userEmail: userEmail,
    userName: userName,
    role: 'owner',
    permissionTemplateId: executiveTemplate.id,
    customPermissions: null,
    status: 'approved',
    requestedAt: new Date().toISOString(),
    requestedRole: 'Owner',
    requestJustification: 'Workspace creator',
    respondedAt: new Date().toISOString(),
    respondedBy: userId,
    denialReason: null,
  };

  workspaces.push(newWorkspace);
  memberships.push(newMembership);

  localStorage.setItem('workspaces', JSON.stringify(workspaces));
  localStorage.setItem('workspace_memberships', JSON.stringify(memberships));

  logAuditEvent({
    workspaceId: companyData.id,
    eventType: 'workspace.created',
    performedBy: userId,
    performedByName: userName,
    targetUserId: null,
    targetUserName: null,
    targetResource: companyData.id,
    action: `Created workspace "${workspaceName}"`,
    metadata: { workspaceName, workspaceUsername },
  });

  return newWorkspace;
}

export async function requestWorkspaceAccess(
  userId: string,
  userName: string,
  userEmail: string,
  workspaceId: string,
  requestedRole: string,
  requestJustification: string
): Promise<WorkspaceMembership> {
  const { supabase } = await import('@/lib/supabase');
  let company: any = null;
  let memberData: any = null;

  try {
    // Try Supabase first to find the company by username
    const result = await (supabase as any)
      .from('companies')
      .select('id')
      .eq('username', workspaceId)
      .single();

    if (result.error) {
      console.warn('Failed to find company in Supabase (falling back to local):', result.error);
    } else {
      company = result.data;
    }
  } catch (error) {
    console.warn('Supabase company search error (falling back to local):', error);
  }

  // Try to request access in Supabase if company exists
  if (company) {
    try {
      const result = await (supabase as any)
        .from('company_members')
        .insert({
          company_id: company.id,
          user_id: userId,
          role: requestedRole,
          status: 'pending',
        })
        .select()
        .single();
      
      if (result.error) {
        console.warn('Failed to request access in Supabase (falling back to local):', result.error);
      } else {
        memberData = result.data;
      }
    } catch (error) {
      console.warn('Supabase access request error (falling back to local):', error);
    }
  }

  // Fallback to local access request if Supabase failed or was bypassed
  const finalCompanyId = company?.id || `company_${workspaceId}`;
  
  if (!memberData) {
    memberData = {
      id: `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
  }

  // Fallback: localStorage-based caching
  const membershipsData = localStorage.getItem('workspace_memberships');
  const templatesData = localStorage.getItem('permission_templates');

  const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];
  let templates: PermissionTemplate[] = templatesData ? JSON.parse(templatesData) : [];

  if (templates.length === 0) {
    templates = getDefaultPermissionTemplates();
  }

  const readOnlyTemplate = templates.find(t => t.type === 'read_only')!;

  const newMembership: WorkspaceMembership = {
    id: memberData.id,
    workspaceId: finalCompanyId,
    userId: userId,
    userEmail: userEmail,
    userName: userName,
    role: 'member',
    permissionTemplateId: readOnlyTemplate.id,
    customPermissions: null,
    status: 'pending',
    requestedAt: memberData.created_at || new Date().toISOString(),
    requestedRole: requestedRole,
    requestJustification: requestJustification,
    respondedAt: null,
    respondedBy: null,
    denialReason: null,
  };

  memberships.push(newMembership);
  localStorage.setItem('workspace_memberships', JSON.stringify(memberships));

  logAuditEvent({
    workspaceId: finalCompanyId,
    eventType: 'user.access_requested',
    performedBy: userId,
    performedByName: userName,
    targetUserId: userId,
    targetUserName: userName,
    targetResource: null,
    action: `Requested access as ${requestedRole}`,
    metadata: { requestedRole, requestJustification },
  });

  return newMembership;
}

/**
 * Get all available workspaces
 */
export function getAllWorkspaces(): Workspace[] {
  const workspacesData = localStorage.getItem('workspaces');
  return workspacesData ? JSON.parse(workspacesData) : [];
}

/**
 * Get default permission templates
 */
export function getDefaultPermissionTemplates(): PermissionTemplate[] {
  return [
    {
      id: 'template_executive',
      name: 'Executive',
      type: 'executive',
      description: 'Full access to all features and data. Can manage users and permissions.',
      permissions: {
        canViewOverview: true,
        canViewMetrics: true,
        canViewCards: true,
        canViewPayroll: true,
        canViewAssistant: true,
        canViewSmsLog: true,
        canViewTax: true,
        canViewFiles: true,
        canViewSettings: true,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canCreateTransactions: true,
        canEditTransactions: true,
        canDeleteTransactions: true,
        canEditPayroll: true,
        canViewSensitiveData: true,
        canExportData: true,
        canManageUsers: true,
        canViewAuditLogs: true,
        canManagePermissions: true,
      },
    },
    {
      id: 'template_finance',
      name: 'Finance',
      type: 'finance',
      description: 'Full financial access. Can manage cards, transactions, and view all financial data.',
      permissions: {
        canViewOverview: true,
        canViewMetrics: true,
        canViewCards: true,
        canViewPayroll: true,
        canViewAssistant: true,
        canViewSmsLog: true,
        canViewTax: true,
        canViewFiles: true,
        canViewSettings: false,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canCreateTransactions: true,
        canEditTransactions: true,
        canDeleteTransactions: false,
        canEditPayroll: false,
        canViewSensitiveData: true,
        canExportData: true,
        canManageUsers: false,
        canViewAuditLogs: false,
        canManagePermissions: false,
      },
    },
    {
      id: 'template_management',
      name: 'Management',
      type: 'management',
      description: 'Access to overview, metrics, and reporting. Can view most data but cannot modify financial records.',
      permissions: {
        canViewOverview: true,
        canViewMetrics: true,
        canViewCards: true,
        canViewPayroll: true,
        canViewAssistant: true,
        canViewSmsLog: false,
        canViewTax: true,
        canViewFiles: true,
        canViewSettings: false,
        canCreateCards: false,
        canEditCards: false,
        canDeleteCards: false,
        canCreateTransactions: false,
        canEditTransactions: false,
        canDeleteTransactions: false,
        canEditPayroll: false,
        canViewSensitiveData: true,
        canExportData: true,
        canManageUsers: false,
        canViewAuditLogs: false,
        canManagePermissions: false,
      },
    },
    {
      id: 'template_operations',
      name: 'Operations',
      type: 'operations',
      description: 'Operational access. Can create and edit records but cannot delete or manage sensitive data.',
      permissions: {
        canViewOverview: true,
        canViewMetrics: true,
        canViewCards: true,
        canViewPayroll: false,
        canViewAssistant: true,
        canViewSmsLog: true,
        canViewTax: false,
        canViewFiles: true,
        canViewSettings: false,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canCreateTransactions: true,
        canEditTransactions: true,
        canDeleteTransactions: false,
        canEditPayroll: false,
        canViewSensitiveData: false,
        canExportData: false,
        canManageUsers: false,
        canViewAuditLogs: false,
        canManagePermissions: false,
      },
    },
    {
      id: 'template_read_only',
      name: 'Read-Only',
      type: 'read_only',
      description: 'View-only access to basic features. Cannot modify any data.',
      permissions: {
        canViewOverview: true,
        canViewMetrics: true,
        canViewCards: true,
        canViewPayroll: false,
        canViewAssistant: false,
        canViewSmsLog: false,
        canViewTax: false,
        canViewFiles: true,
        canViewSettings: false,
        canCreateCards: false,
        canEditCards: false,
        canDeleteCards: false,
        canCreateTransactions: false,
        canEditTransactions: false,
        canDeleteTransactions: false,
        canEditPayroll: false,
        canViewSensitiveData: false,
        canExportData: false,
        canManageUsers: false,
        canViewAuditLogs: false,
        canManagePermissions: false,
      },
    },
  ];
}

/**
 * Log an audit event
 */
export function logAuditEvent(params: {
  workspaceId: string;
  eventType: AuditEventType;
  performedBy: string;
  performedByName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  targetResource: string | null;
  action: string;
  metadata: Record<string, any>;
}): void {
  const auditLogsData = localStorage.getItem('audit_logs');
  const auditLogs: AuditLogEntry[] = auditLogsData ? JSON.parse(auditLogsData) : [];

  const newEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workspaceId: params.workspaceId,
    eventType: params.eventType,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    targetUserId: params.targetUserId,
    targetUserName: params.targetUserName,
    targetResource: params.targetResource,
    action: params.action,
    metadata: params.metadata,
    timestamp: new Date().toISOString(),
    ipAddress: null, // Would be populated by backend in production
    userAgent: navigator.userAgent,
  };

  auditLogs.push(newEntry);
  localStorage.setItem('audit_logs', JSON.stringify(auditLogs));
}

/**
 * Get audit logs for a workspace
 */
export function getAuditLogs(workspaceId: string): AuditLogEntry[] {
  const auditLogsData = localStorage.getItem('audit_logs');
  const auditLogs: AuditLogEntry[] = auditLogsData ? JSON.parse(auditLogsData) : [];
  return auditLogs.filter(log => log.workspaceId === workspaceId).sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get permission templates
 */
export function getPermissionTemplates(): PermissionTemplate[] {
  const templatesData = localStorage.getItem('permission_templates');
  let templates: PermissionTemplate[] = templatesData ? JSON.parse(templatesData) : [];

  if (templates.length === 0) {
    templates = getDefaultPermissionTemplates();
    localStorage.setItem('permission_templates', JSON.stringify(templates));
  }

  return templates;
}

/**
 * Get effective permissions for a user
 */
export function getUserPermissions(membership: WorkspaceMembership | null): PermissionSet | null {
  if (!membership || membership.status !== 'approved') {
    return null;
  }

  // If custom permissions exist, use those
  if (membership.customPermissions) {
    return membership.customPermissions;
  }

  // Otherwise, get permissions from template
  const templates = getPermissionTemplates();
  const template = templates.find(t => t.id === membership.permissionTemplateId);

  return template ? template.permissions : null;
}

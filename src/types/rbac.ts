/**
 * Multi-Tenant RBAC Type Definitions
 * SOC-2 / ISO-Ready Access Control System
 */

// ============================================================================
// WORKSPACE (TENANT) TYPES
// ============================================================================

export interface Workspace {
  id: string;
  companyName: string;
  companyUsername: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ownerUserId: string;
  settings: Record<string, any>;
}

export interface CreateWorkspaceInput {
  companyName: string;
  companyUsername: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
}

// ============================================================================
// ROLE TYPES
// ============================================================================

export type RoleKey =
  | 'OWNER'
  | 'CFO'
  | 'COO'
  | 'MANAGER'
  | 'DIRECTOR'
  | 'ANALYST'
  | 'HR'
  | 'ADMIN'
  | 'READ_ONLY';

export interface Role {
  id: string;
  workspaceId: string;
  roleName: string;
  roleKey: RoleKey;
  description: string | null;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WORKSPACE MEMBERSHIP TYPES
// ============================================================================

export type MemberStatus = 'active' | 'suspended' | 'revoked';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  permissionTemplateId: string | null;
  status: MemberStatus;
  joinedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;

  // Joined data
  user?: User;
  role?: Role;
  permissionTemplate?: PermissionTemplate;
}

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export type PermissionCategory =
  | 'PAYROLL'
  | 'CARDS'
  | 'FINANCE'
  | 'METRICS'
  | 'SMS'
  | 'TAX'
  | 'FILES'
  | 'SETTINGS'
  | 'USERS'
  | 'AUDIT';

export type PermissionKey =
  // Payroll
  | 'PAYROLL_VIEW'
  | 'PAYROLL_EDIT'
  | 'PAYROLL_APPROVE'
  // Cards
  | 'CARDS_VIEW'
  | 'CARDS_EDIT'
  | 'CARDS_CREATE'
  // Finance
  | 'FINANCE_VIEW'
  | 'FINANCE_EDIT'
  | 'FINANCE_APPROVE'
  // Metrics
  | 'METRICS_VIEW'
  // SMS
  | 'SMS_VIEW'
  | 'SMS_DEVICE_VIEW'
  | 'SMS_DEVICE_ADMIN'
  // Tax
  | 'TAX_VIEW'
  | 'TAX_EDIT'
  // Files
  | 'FILES_VIEW'
  | 'FILES_UPLOAD'
  // Settings
  | 'SETTINGS_VIEW'
  | 'SETTINGS_EDIT'
  // Users
  | 'USERS_VIEW'
  | 'USERS_MANAGE'
  | 'USERS_APPROVE'
  // Audit
  | 'AUDIT_VIEW';

export interface Permission {
  id: string;
  permissionKey: PermissionKey;
  permissionName: string;
  description: string | null;
  category: PermissionCategory;
  createdAt: string;
}

// ============================================================================
// PERMISSION TEMPLATE TYPES
// ============================================================================

export type PermissionTemplateKey =
  | 'EXECUTIVE'
  | 'FINANCE'
  | 'MANAGEMENT'
  | 'OPERATIONS'
  | 'READ_ONLY';

export interface PermissionTemplate {
  id: string;
  workspaceId: string;
  templateName: string;
  templateKey: PermissionTemplateKey;
  description: string | null;
  isSystemTemplate: boolean;
  createdAt: string;
  updatedAt: string;

  // Joined data
  permissions?: Permission[];
}

export interface TemplatePermission {
  id: string;
  templateId: string;
  permissionId: string;
  granted: boolean;

  // Joined data
  permission?: Permission;
}

// ============================================================================
// USER PERMISSION OVERRIDE TYPES
// ============================================================================

export interface UserPermissionOverride {
  id: string;
  workspaceMemberId: string;
  permissionId: string;
  granted: boolean;
  overrideReason: string | null;
  createdBy: string;
  createdAt: string;

  // Joined data
  permission?: Permission;
  creator?: User;
}

// ============================================================================
// ACCESS REQUEST TYPES
// ============================================================================

export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export interface AccessRequest {
  id: string;
  workspaceId: string;
  userId: string;
  requestedRoleId: string;
  fullName: string;
  description: string;
  status: AccessRequestStatus;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  denialReason: string | null;

  // Joined data
  user?: User;
  requestedRole?: Role;
  reviewer?: User;
  workspace?: Workspace;
}

export interface CreateAccessRequestInput {
  companyUsername: string;
  fullName: string;
  requestedRoleKey: RoleKey;
  description: string;
}

export interface ReviewAccessRequestInput {
  accessRequestId: string;
  approved: boolean;
  denialReason?: string;
  permissionTemplateId?: string;
}

// ============================================================================
// DELEGATED APPROVER TYPES
// ============================================================================

export interface DelegatedApprover {
  id: string;
  workspaceId: string;
  userId: string;
  canApproveRequests: boolean;
  canModifyRoles: boolean;
  canModifyPermissions: boolean;
  canRevokeAccess: boolean;
  delegatedBy: string;
  delegatedAt: string;
  revokedAt: string | null;

  // Joined data
  user?: User;
  delegator?: User;
}

export interface CreateDelegatedApproverInput {
  userId: string;
  canApproveRequests: boolean;
  canModifyRoles: boolean;
  canModifyPermissions: boolean;
  canRevokeAccess: boolean;
}

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

export type AuditEventType =
  | 'ACCESS_REQUEST_CREATED'
  | 'ACCESS_REQUEST_APPROVED'
  | 'ACCESS_REQUEST_DENIED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_TEMPLATE_CHANGED'
  | 'PERMISSION_OVERRIDE_ADDED'
  | 'PERMISSION_OVERRIDE_REMOVED'
  | 'DELEGATION_ADDED'
  | 'DELEGATION_REVOKED'
  | 'ACCESS_REVOKED'
  | 'WORKSPACE_CREATED'
  | 'MEMBER_SUSPENDED'
  | 'MEMBER_REACTIVATED';

export interface AuditEvent {
  id: string;
  eventId: string;
  workspaceId: string;
  eventType: AuditEventType;
  actorUserId: string;
  targetUserId: string | null;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
  metadata: Record<string, any>;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;

  // Joined data
  actor?: User;
  target?: User;
}

export interface CreateAuditEventInput {
  eventType: AuditEventType;
  targetUserId?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ============================================================================
// PERMISSION RESOLUTION TYPES
// ============================================================================

export interface EffectivePermissions {
  permissions: Set<PermissionKey>;
  role: Role;
  template: PermissionTemplate | null;
  overrides: UserPermissionOverride[];
}

export interface PermissionCheck {
  hasPermission: boolean;
  source: 'template' | 'override' | 'none';
  permission?: Permission;
}

// ============================================================================
// USER CONTEXT TYPES (Frontend)
// ============================================================================

export interface UserContext {
  user: User;
  workspace: Workspace | null;
  member: WorkspaceMember | null;
  role: Role | null;
  permissions: Set<PermissionKey>;
  isOwner: boolean;
  isDelegatedApprover: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  context: UserContext | null;
  error: string | null;
}

// ============================================================================
// ACCESS MANAGEMENT UI TYPES
// ============================================================================

export type AccessManagementSection =
  | 'new_requests'
  | 'approved'
  | 'denied'
  | 'accounts_with_access';

export interface AccessManagementView {
  section: AccessManagementSection;
  selectedItem: AccessRequest | WorkspaceMember | null;
}

// ============================================================================
// WORKSPACE STATE TYPES
// ============================================================================

export type WorkspaceState =
  | 'not_created' // User needs to create workspace
  | 'not_member' // User needs to request access
  | 'pending' // Access request pending
  | 'denied' // Access request denied
  | 'active' // Active member
  | 'suspended' // Member suspended
  | 'revoked'; // Access revoked

export interface WorkspaceStatus {
  state: WorkspaceState;
  workspace?: Workspace;
  member?: WorkspaceMember;
  pendingRequest?: AccessRequest;
  message: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

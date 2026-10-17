# AUREX — Role-Based Access Control (RBAC)

## Overview

A production-ready, SOC-2/ISO-compliant RBAC system with multi-tenant workspace isolation, approval workflows, permission templates, delegated approvers, and event-sourced audit logging.

## Core Principles

1. **Multi-Tenant Isolation**: Each workspace (company) operates in complete isolation
2. **Deny by Default**: All access is denied until explicitly approved
3. **Explicit Approval**: No user can access data without workspace owner/approver consent
4. **Event Sourcing**: All access control changes are immutably logged
5. **Permission Templates**: Reusable permission sets for consistent access control
6. **Least Privilege**: Users receive only the minimum permissions needed

## Database Schema

- **workspaces**: Multi-tenant workspace (companies)
- **users**: Global user accounts
- **workspace_members**: User-workspace-role associations
- **roles**: Workspace-specific roles (OWNER, CFO, MANAGER, etc.)
- **permission_templates**: Reusable permission sets (EXECUTIVE, FINANCE, etc.)
- **permissions**: Atomic capabilities (PAYROLL_VIEW, CARDS_EDIT, etc.)
- **template_permissions**: Template-to-permission mappings
- **user_permission_overrides**: Individual permission exceptions
- **access_requests**: Pending workspace access requests
- **delegated_approvers**: Users with approval authority
- **audit_events**: Immutable event log (append-only, no updates/deletes)

## User Flows

### 1. Workspace Creation (CEO/Owner)

1. User sees "Create Your Company Workspace" page
2. Enters company name and username (unique identifier)
3. System creates: workspace record, OWNER role, EXECUTIVE permission template (full access), workspace member record, audit event
4. User gains immediate access to full dashboard

### 2. Access Request (Non-Owner Users)

1. User sees "Request Access to a Company" page
2. Enters company username, full name, requested role, description/justification
3. System creates: access request record (status: pending), audit event
4. User sees "Pending Approval" locked page
5. User cannot access dashboard until approved

### 3. Access Management (Owner/Approvers)

Gmail-style interface with left sidebar (New Requests, Approved, Denied, Accounts with Access) and right panel (clickable table rows, detail view, approve/deny actions, permission template selection, role management).

## Permission System

### Permission Templates

| Template | Description | Permissions |
|----------|-------------|-------------|
| **EXECUTIVE** | Full access | All permissions |
| **FINANCE** | Financial access | FINANCE_*, PAYROLL_VIEW, CARDS_VIEW, TAX_* |
| **MANAGEMENT** | Team oversight | PAYROLL_*, USERS_VIEW, METRICS_VIEW |
| **OPERATIONS** | Operational access | CARDS_*, SMS_VIEW, FILES_* |
| **READ_ONLY** | View-only | *_VIEW permissions only |

### Permission Categories

- **PAYROLL**: Payroll data and transactions
- **CARDS**: Company card management
- **FINANCE**: Financial metrics and operations
- **METRICS**: Business analytics
- **SMS**: SMS logs and messages
- **TAX**: Tax calculations
- **FILES**: File management
- **SETTINGS**: Workspace settings
- **USERS**: User and access management
- **AUDIT**: Audit log access

### Permission Keys

- PAYROLL_VIEW — View payroll data
- PAYROLL_EDIT — Modify payroll transactions
- CARDS_CREATE — Issue new company cards
- USERS_APPROVE — Approve access requests
- AUDIT_VIEW — View audit logs

## Delegated Approvers

Allow workspace owner to delegate approval authority to trusted users (COO, HR, Admin).

**Capabilities:**
- Approve/deny access requests
- Modify roles (within limits)
- Modify permissions (within limits)
- Revoke access

**Cannot:**
- Remove workspace owner
- Delete workspace
- Modify audit logs
- Grant themselves owner privileges

## Audit Logging

### Event Types

- ACCESS_REQUEST_CREATED, ACCESS_REQUEST_APPROVED, ACCESS_REQUEST_DENIED
- ROLE_ASSIGNED, ROLE_CHANGED
- PERMISSION_TEMPLATE_CHANGED, PERMISSION_OVERRIDE_ADDED, PERMISSION_OVERRIDE_REMOVED
- DELEGATION_ADDED, DELEGATION_REVOKED
- ACCESS_REVOKED, WORKSPACE_CREATED
- MEMBER_SUSPENDED, MEMBER_REACTIVATED

### Audit Event Structure

```typescript
{
  id: string;
  eventId: string;        // Unique global identifier
  workspaceId: string;
  eventType: AuditEventType;
  actorUserId: string;     // Who performed the action
  targetUserId: string | null;
  beforeState: object | null;
  afterState: object | null;
  metadata: object;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}
```

### Compliance Features

- **Immutable**: No updates or deletes allowed (enforced by DB triggers)
- **Append-Only**: Events can only be added
- **Tamper-Evident**: Event IDs are globally unique and cryptographically signed
- **SOC-2 Ready**: Meets audit trail requirements
- **ISO-Compliant**: Supports ISO 27001 access control standards

## Frontend Integration

### RBAC Context Provider

```typescript
import { RBACProvider, useRBAC } from '@/contexts/rbac-context';

function App() {
  return (
    <RBACProvider>
      {/* Your app */}
    </RBACProvider>
  );
}
```

### Permission Checks

```typescript
import { useRBAC, usePermission } from '@/contexts/rbac-context';

function PayrollTab() {
  const { hasPermission } = useRBAC();
  const canEdit = usePermission('PAYROLL_EDIT');

  if (!hasPermission('PAYROLL_VIEW')) {
    return <AccessDenied />;
  }

  return (
    <div>
      <PayrollData />
      {canEdit && <EditButton />}
    </div>
  );
}
```

## Security Best Practices

### Backend Requirements

1. **Validate Workspace Membership**: Every API request must verify user belongs to workspace
2. **Check Permissions**: Resolve effective permissions (template + overrides) before allowing operations
3. **Log Everything**: All access control changes must create audit events
4. **Enforce Isolation**: Use Row-Level Security (RLS) in database
5. **Rate Limit**: Prevent brute-force access request spam
6. **Secure Sessions**: Use short-lived JWTs with refresh tokens

### Frontend Best Practices

1. **Never Trust Frontend**: Frontend only hides UI, backend must enforce
2. **Show Only Allowed**: Hide tabs/buttons for unauthorized actions
3. **Fail Secure**: If permission check fails, deny access
4. **Audit User Actions**: Log user interactions for security monitoring
5. **Clear Error Messages**: Tell users why access was denied

## File Structure

```
src/
+-- types/
|   +-- rbac.ts                 # TypeScript type definitions
+-- contexts/
|   +-- rbac-context.tsx        # RBAC state provider
+-- components/
|   +-- rbac/
|       +-- CreateWorkspace.tsx # Workspace creation (CEO)
|       +-- RequestAccess.tsx   # Access request form
|       +-- PendingAccess.tsx   # Locked pending state
|       +-- AccessManagement.tsx# Gmail-style approval UI
|       +-- AuditLog.tsx        # Audit log viewer
|       +-- RBACRouter.tsx      # State-based routing
|       +-- index.ts            # Export index
+-- lib/
|   +-- rbac-demo-init.ts       # Demo initialization
+-- schema.sql                  # PostgreSQL database schema
```

## Testing

### Test Scenarios

1. **Workspace Creation**: Create workspace with unique username, verify owner role assigned, check audit event created
2. **Access Request**: Submit request to existing workspace, verify pending state locks UI, check no dashboard access
3. **Approval Flow**: Approve request with permission template, verify user gains access, check audit event created
4. **Permission Enforcement**: Test each permission category, verify UI hides unauthorized elements, check backend rejects unauthorized requests
5. **Audit Trail**: Verify all events logged, check immutability, validate event IDs are unique

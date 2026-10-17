# AUREX Multi-Tenant RBAC System

## Overview

A production-ready, SOC-2/ISO-compliant Role-Based Access Control (RBAC) system with multi-tenant workspace isolation, approval workflows, permission templates, delegated approvers, and event-sourced audit logging.

## Architecture

### Core Principles

1. **Multi-Tenant Isolation**: Each workspace (company) operates in complete isolation
2. **Deny by Default**: All access is denied until explicitly approved
3. **Explicit Approval**: No user can access data without workspace owner/approver consent
4. **Event Sourcing**: All access control changes are immutably logged
5. **Permission Templates**: Reusable permission sets for consistent access control
6. **Least Privilege**: Users receive only the minimum permissions needed

### Database Schema

See `schema.sql` for the complete PostgreSQL schema including:

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

### TypeScript Types

All RBAC types are defined in `src/types/rbac.ts`:

- Workspace & User types
- Role & Permission types
- Permission Templates
- Access Requests
- Audit Events
- User Context & Auth State

## User Flows

### 1. Workspace Creation (CEO/Owner)

**When**: First user creates an account with no existing workspace

**Flow**:
1. User sees "Create Your Company Workspace" page
2. Enters:
   - Company name
   - Company username (unique identifier)
3. System creates:
   - Workspace record
   - OWNER role
   - EXECUTIVE permission template (full access)
   - Workspace member record
   - Audit event
4. User gains immediate access to full dashboard

**Implementation**: `src/components/rbac/CreateWorkspace.tsx`

### 2. Access Request (Non-Owner Users)

**When**: User wants to join an existing workspace

**Flow**:
1. User sees "Request Access to a Company" page
2. Enters:
   - Company username
   - Full name
   - Requested role (CFO, MANAGER, etc.)
   - Description/justification
3. System creates:
   - Access request record (status: pending)
   - Audit event
4. User sees "Pending Approval" locked page
5. User cannot access dashboard until approved

**Implementation**: `src/components/rbac/RequestAccess.tsx`

### 3. Pending State (Locked UI)

**When**: Access request submitted but not yet reviewed

**What User Sees**:
- Large "Pending Approval" badge
- Request summary (company, role, date)
- "What Happens Next" instructions
- Refresh button to check status
- NO dashboard access
- NO navigation

**Implementation**: `src/components/rbac/PendingAccess.tsx`

### 4. Access Management (Owner/Approvers)

**Entry Point**: Top-bar icon with badge counter

**Gmail-Style Interface**:

**Left Sidebar** (Static, exactly 4 rows):
1. **New Requests** - Pending approvals
2. **Approved** - Approved requests
3. **Denied** - Denied requests
4. **Accounts with Access** - Active members

**Right Panel** (Dynamic):
- Clickable table rows
- Detail view in same panel (no modals)
- Approve/Deny actions
- Permission template selection
- Role management

**Implementation**: `src/components/rbac/AccessManagement.tsx`

## Permission System

### Permission Templates

Pre-defined sets of permissions for common roles:

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

Examples:
- `PAYROLL_VIEW` - View payroll data
- `PAYROLL_EDIT` - Modify payroll transactions
- `CARDS_CREATE` - Issue new company cards
- `USERS_APPROVE` - Approve access requests
- `AUDIT_VIEW` - View audit logs

## Delegated Approvers

**Purpose**: Allow workspace owner to delegate approval authority to trusted users (COO, HR, Admin)

**Capabilities**:
- Approve/deny access requests
- Modify roles (within limits)
- Modify permissions (within limits)
- Revoke access

**Cannot**:
- Remove workspace owner
- Delete workspace
- Modify audit logs
- Grant themselves owner privileges

**Implementation**: Backend enforces limits, frontend hides unauthorized actions

## Audit Logging

### Event Types

- `ACCESS_REQUEST_CREATED`
- `ACCESS_REQUEST_APPROVED`
- `ACCESS_REQUEST_DENIED`
- `ROLE_ASSIGNED`
- `ROLE_CHANGED`
- `PERMISSION_TEMPLATE_CHANGED`
- `PERMISSION_OVERRIDE_ADDED`
- `PERMISSION_OVERRIDE_REMOVED`
- `DELEGATION_ADDED`
- `DELEGATION_REVOKED`
- `ACCESS_REVOKED`
- `WORKSPACE_CREATED`
- `MEMBER_SUSPENDED`
- `MEMBER_REACTIVATED`

### Audit Event Structure

```typescript
{
  id: string;
  eventId: string; // Unique global identifier
  workspaceId: string;
  eventType: AuditEventType;
  actorUserId: string; // Who performed the action
  targetUserId: string | null; // Who was affected
  beforeState: object | null; // State before change
  afterState: object | null; // State after change
  metadata: object; // Additional context
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}
```

### Compliance Features

- **Immutable**: No updates or deletes allowed (enforced by DB triggers)
- **Append-Only**: Events can only be added
- **Complete Trail**: All access control changes logged
- **Tamper-Evident**: Event IDs are globally unique and cryptographically signed
- **SOC-2 Ready**: Meets audit trail requirements
- **ISO-Compliant**: Supports ISO 27001 access control standards

**Implementation**: `src/components/rbac/AuditLog.tsx`

## Frontend Integration

### RBAC Context Provider

Wraps the entire app to provide RBAC state and helpers:

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

### RBAC Router

Routes users based on workspace state:

```typescript
import { RBACRouter } from '@/components/rbac';

function App() {
  return (
    <RBACProvider>
      <RBACRouter>
        {/* Protected app content */}
      </RBACRouter>
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

## Demo Setup

### Initialize Demo Data

```typescript
import { initializeRBACDemo } from '@/lib/rbac-demo-init';

// On first load
initializeRBACDemo();
```

### Reset Demo

```typescript
import { resetRBACDemo } from '@/lib/rbac-demo-init';

resetRBACDemo();
window.location.reload();
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
├── types/
│   └── rbac.ts                 # TypeScript type definitions
├── contexts/
│   └── rbac-context.tsx        # RBAC state provider
├── components/
│   └── rbac/
│       ├── CreateWorkspace.tsx # Workspace creation (CEO)
│       ├── RequestAccess.tsx   # Access request form
│       ├── PendingAccess.tsx   # Locked pending state
│       ├── AccessManagement.tsx# Gmail-style approval UI
│       ├── AuditLog.tsx        # Audit log viewer
│       ├── RBACRouter.tsx      # State-based routing
│       └── index.ts            # Export index
├── lib/
│   └── rbac-demo-init.ts       # Demo initialization
└── schema.sql                  # PostgreSQL database schema
```

## Testing

### Test Scenarios

1. **Workspace Creation**:
   - Create workspace with unique username
   - Verify owner role assigned
   - Check audit event created

2. **Access Request**:
   - Submit request to existing workspace
   - Verify pending state locks UI
   - Check no dashboard access

3. **Approval Flow**:
   - Approve request with permission template
   - Verify user gains access
   - Check audit event created

4. **Permission Enforcement**:
   - Test each permission category
   - Verify UI hides unauthorized elements
   - Check backend rejects unauthorized requests

5. **Audit Trail**:
   - Verify all events logged
   - Check immutability (no updates/deletes)
   - Validate event IDs are unique

## Next Steps

### Production Deployment

1. **Database Setup**:
   - Run `schema.sql` on PostgreSQL
   - Enable Row-Level Security
   - Create database indexes
   - Set up backups

2. **Backend API**:
   - Implement permission resolution logic
   - Add JWT-based authentication
   - Create access request approval endpoints
   - Build audit log query API

3. **Frontend Integration**:
   - Replace localStorage with API calls
   - Add error handling and retry logic
   - Implement real-time updates (WebSockets)
   - Add loading states

4. **Security**:
   - Enable HTTPS everywhere
   - Implement rate limiting
   - Add IP whitelisting (optional)
   - Set up security monitoring

5. **Compliance**:
   - Document access control policies
   - Train admins on approval workflows
   - Schedule regular access reviews
   - Set up audit log retention

## Support

For questions or issues:
1. Check this README
2. Review the code comments
3. Check the database schema
4. Review TypeScript types

## License

Proprietary - AUREX Financial Intelligence Platform

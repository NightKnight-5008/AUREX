# Backend Permission Enforcement Specification

## Executive Summary

**CRITICAL SECURITY REQUIREMENT**: Frontend permission checks are UX optimizations only. The backend MUST independently validate ALL permissions for EVERY API request.

**Threat Model**: Assume attackers can:
- Bypass frontend JavaScript
- Modify HTTP headers
- Forge JWTs (if secret is compromised)
- Directly call API endpoints

**Security Principle**: Trust nothing from the client. Validate everything on the server.

---

## Backend Architecture

### 1. Authentication Middleware

**Purpose**: Validate user identity and extract user ID from JWT.

**Implementation**:

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user ID to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = { authenticateUser };
```

---

### 2. Workspace Membership Middleware

**Purpose**: Verify user has approved membership in the workspace.

**Implementation**:

```javascript
// middleware/workspace.js
const { db } = require('../db');

async function requireWorkspaceMembership(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id'];

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID header missing' });
    }

    // Query database for membership
    const membership = await db.query(
      `SELECT * FROM workspace_memberships
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.userId]
    );

    if (!membership.rows.length) {
      return res.status(403).json({
        error: 'No workspace membership found',
        code: 'NO_MEMBERSHIP'
      });
    }

    const membershipData = membership.rows[0];

    // Check if membership is approved
    if (membershipData.status !== 'approved') {
      return res.status(403).json({
        error: `Membership status is ${membershipData.status}, must be approved`,
        code: 'MEMBERSHIP_NOT_APPROVED',
        status: membershipData.status
      });
    }

    // Attach membership to request for permission checks
    req.workspace = {
      id: workspaceId,
      membership: membershipData
    };

    next();
  } catch (error) {
    console.error('Workspace membership check failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireWorkspaceMembership };
```

---

### 3. Permission Check Middleware

**Purpose**: Validate user has specific permission for the action.

**Implementation**:

```javascript
// middleware/permissions.js
const { db } = require('../db');

/**
 * Get effective permissions for a membership
 */
async function getEffectivePermissions(membership) {
  // If custom permissions exist, use those
  if (membership.custom_permissions) {
    return membership.custom_permissions;
  }

  // Otherwise, fetch from template
  const template = await db.query(
    `SELECT permissions FROM permission_templates WHERE id = $1`,
    [membership.permission_template_id]
  );

  if (!template.rows.length) {
    throw new Error('Permission template not found');
  }

  return template.rows[0].permissions;
}

/**
 * Create permission middleware factory
 */
function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      if (!req.workspace || !req.workspace.membership) {
        return res.status(403).json({
          error: 'Workspace membership required',
          code: 'NO_WORKSPACE_CONTEXT'
        });
      }

      const permissions = await getEffectivePermissions(req.workspace.membership);

      if (!permissions[permissionName]) {
        // Log access denial to audit log
        await db.query(
          `INSERT INTO audit_logs (workspace_id, event_type, performed_by, action, metadata, timestamp)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            req.workspace.id,
            'access_denied',
            req.userId,
            `DENIED: ${req.method} ${req.path}`,
            JSON.stringify({
              requiredPermission: permissionName,
              reason: 'Missing permission'
            })
          ]
        );

        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermission: permissionName
        });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check multiple permissions (all required)
 */
function requirePermissions(...permissionNames) {
  return async (req, res, next) => {
    try {
      if (!req.workspace || !req.workspace.membership) {
        return res.status(403).json({
          error: 'Workspace membership required',
          code: 'NO_WORKSPACE_CONTEXT'
        });
      }

      const permissions = await getEffectivePermissions(req.workspace.membership);
      const missingPermissions = [];

      for (const permissionName of permissionNames) {
        if (!permissions[permissionName]) {
          missingPermissions.push(permissionName);
        }
      }

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          missingPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requirePermission, requirePermissions };
```

---

## API Endpoint Protection

### 4. Apply Middleware to Routes

**Critical Routes to Protect**:

```javascript
// routes/api.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { requireWorkspaceMembership } = require('../middleware/workspace');
const { requirePermission } = require('../middleware/permissions');

// === ALL API routes require authentication ===
router.use(authenticateUser);

// === Workspace-scoped routes require membership ===
router.use('/cards', requireWorkspaceMembership);
router.use('/transactions', requireWorkspaceMembership);
router.use('/payroll', requireWorkspaceMembership);
router.use('/sms', requireWorkspaceMembership);
router.use('/files', requireWorkspaceMembership);

// === CARDS API ===

// GET /api/cards - View cards
router.get('/cards',
  requirePermission('canViewCards'),
  async (req, res) => {
    // Implementation
  }
);

// POST /api/cards - Create card
router.post('/cards',
  requirePermission('canCreateCards'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'card.created', req.userId, ...);
    // Implementation
  }
);

// PUT /api/cards/:id - Update card
router.put('/cards/:id',
  requirePermission('canEditCards'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'card.updated', req.userId, ...);
    // Implementation
  }
);

// DELETE /api/cards/:id - Delete card
router.delete('/cards/:id',
  requirePermission('canDeleteCards'),
  async (req, res) => {
    // Additional check: Verify card belongs to workspace
    const card = await db.query(
      'SELECT * FROM cards WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.workspace.id]
    );

    if (!card.rows.length) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Log to audit
    await logAuditEvent(req.workspace.id, 'card.deleted', req.userId, ...);
    // Implementation
  }
);

// === TRANSACTIONS API ===

// GET /api/transactions
router.get('/transactions',
  requirePermission('canViewCards'), // Transactions tied to cards
  async (req, res) => {
    // Implementation
  }
);

// POST /api/transactions
router.post('/transactions',
  requirePermission('canCreateTransactions'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'transaction.created', req.userId, ...);
    // Implementation
  }
);

// PUT /api/transactions/:id
router.put('/transactions/:id',
  requirePermission('canEditTransactions'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'transaction.updated', req.userId, ...);
    // Implementation
  }
);

// DELETE /api/transactions/:id
router.delete('/transactions/:id',
  requirePermission('canDeleteTransactions'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'transaction.deleted', req.userId, ...);
    // Implementation
  }
);

// === PAYROLL API ===

// GET /api/payroll
router.get('/payroll',
  requirePermission('canViewPayroll'),
  async (req, res) => {
    // Implementation
  }
);

// PUT /api/payroll/:id
router.put('/payroll/:id',
  requirePermission('canEditPayroll'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'payroll.updated', req.userId, ...);
    // Implementation
  }
);

// === SMS LOG API ===

// GET /api/sms
router.get('/sms',
  requirePermission('canViewSmsLog'),
  async (req, res) => {
    // Implementation
  }
);

// === FILES API ===

// GET /api/files
router.get('/files',
  requirePermission('canViewFiles'),
  async (req, res) => {
    // Implementation
  }
);

// POST /api/files/export
router.post('/files/export',
  requirePermission('canExportData'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'data.exported', req.userId, ...);
    // Implementation
  }
);

// === USER MANAGEMENT API ===

// GET /api/workspace/members
router.get('/workspace/members',
  requirePermission('canManageUsers'),
  async (req, res) => {
    // Implementation
  }
);

// PUT /api/workspace/members/:id/permissions
router.put('/workspace/members/:id/permissions',
  requirePermission('canManagePermissions'),
  async (req, res) => {
    // Log to audit
    await logAuditEvent(req.workspace.id, 'user.permissions_changed', req.userId, ...);
    // Implementation
  }
);

// === AUDIT LOGS API ===

// GET /api/audit-logs
router.get('/audit-logs',
  requirePermission('canViewAuditLogs'),
  async (req, res) => {
    // Implementation
  }
);

module.exports = router;
```

---

## Permission Matrix

### Complete Endpoint → Permission Mapping

| HTTP Method | Endpoint | Required Permission | Additional Checks |
|-------------|----------|---------------------|-------------------|
| GET | `/api/cards` | `canViewCards` | Workspace scoped |
| POST | `/api/cards` | `canCreateCards` | Workspace scoped |
| PUT | `/api/cards/:id` | `canEditCards` | Card belongs to workspace |
| DELETE | `/api/cards/:id` | `canDeleteCards` | Card belongs to workspace |
| GET | `/api/transactions` | `canViewCards` | Workspace scoped |
| POST | `/api/transactions` | `canCreateTransactions` | Workspace scoped |
| PUT | `/api/transactions/:id` | `canEditTransactions` | Transaction belongs to workspace |
| DELETE | `/api/transactions/:id` | `canDeleteTransactions` | Transaction belongs to workspace |
| GET | `/api/payroll` | `canViewPayroll` | Workspace scoped |
| PUT | `/api/payroll/:id` | `canEditPayroll` | Workspace scoped |
| GET | `/api/sms` | `canViewSmsLog` | Workspace scoped |
| GET | `/api/files` | `canViewFiles` | Workspace scoped |
| POST | `/api/files/export` | `canExportData` | Workspace scoped + audit |
| GET | `/api/workspace/members` | `canManageUsers` | Workspace scoped |
| PUT | `/api/workspace/members/:id` | `canManagePermissions` | Workspace scoped + audit |
| GET | `/api/audit-logs` | `canViewAuditLogs` | Workspace scoped |

---

## Database Schema Requirements

### Tables Needed

```sql
-- Permission Templates
CREATE TABLE permission_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workspace Memberships
CREATE TABLE workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permission_template_id TEXT NOT NULL REFERENCES permission_templates(id),
  custom_permissions JSONB, -- Override template if set
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'denied')),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  requested_role TEXT NOT NULL,
  request_justification TEXT NOT NULL,
  responded_at TIMESTAMP,
  responded_by TEXT REFERENCES users(id),
  denial_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  performed_by TEXT NOT NULL REFERENCES users(id),
  performed_by_name TEXT NOT NULL,
  target_user_id TEXT REFERENCES users(id),
  target_user_name TEXT,
  target_resource TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_memberships_workspace ON workspace_memberships(workspace_id);
CREATE INDEX idx_memberships_user ON workspace_memberships(user_id);
CREATE INDEX idx_memberships_status ON workspace_memberships(status);
CREATE INDEX idx_audit_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

---

## Testing Requirements

### Security Test Cases

**1. Unauthorized Access Tests**

```bash
# Test 1: No token
curl -X GET http://localhost:3000/api/cards
# Expected: 401 Unauthorized

# Test 2: Invalid token
curl -X GET http://localhost:3000/api/cards \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized

# Test 3: Expired token
curl -X GET http://localhost:3000/api/cards \
  -H "Authorization: Bearer <expired_token>"
# Expected: 401 Unauthorized (Token has expired)
```

**2. Workspace Membership Tests**

```bash
# Test 4: No workspace header
curl -X GET http://localhost:3000/api/cards \
  -H "Authorization: Bearer <valid_token>"
# Expected: 400 Bad Request (Workspace ID missing)

# Test 5: Not a member of workspace
curl -X GET http://localhost:3000/api/cards \
  -H "Authorization: Bearer <valid_token>" \
  -H "X-Workspace-Id: workspace_other"
# Expected: 403 Forbidden (NO_MEMBERSHIP)

# Test 6: Pending membership
curl -X GET http://localhost:3000/api/cards \
  -H "Authorization: Bearer <valid_token>" \
  -H "X-Workspace-Id: workspace_pending"
# Expected: 403 Forbidden (MEMBERSHIP_NOT_APPROVED)
```

**3. Permission Validation Tests**

```bash
# Test 7: Read-only user tries to create card
curl -X POST http://localhost:3000/api/cards \
  -H "Authorization: Bearer <readonly_user_token>" \
  -H "X-Workspace-Id: workspace_123" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Card"}'
# Expected: 403 Forbidden (PERMISSION_DENIED: canCreateCards)

# Test 8: Operations user tries to access payroll
curl -X GET http://localhost:3000/api/payroll \
  -H "Authorization: Bearer <operations_user_token>" \
  -H "X-Workspace-Id: workspace_123"
# Expected: 403 Forbidden (PERMISSION_DENIED: canViewPayroll)

# Test 9: Finance user tries to delete transaction
curl -X DELETE http://localhost:3000/api/transactions/txn_123 \
  -H "Authorization: Bearer <finance_user_token>" \
  -H "X-Workspace-Id: workspace_123"
# Expected: 403 Forbidden (PERMISSION_DENIED: canDeleteTransactions)
```

**4. Resource Isolation Tests**

```bash
# Test 10: User tries to access card from different workspace
curl -X GET http://localhost:3000/api/cards/card_from_other_workspace \
  -H "Authorization: Bearer <valid_token>" \
  -H "X-Workspace-Id: workspace_123"
# Expected: 404 Not Found (card doesn't exist in this workspace)
```

---

## Implementation Checklist

### Backend Tasks

- [ ] **Database Setup**
  - [ ] Create `permission_templates` table
  - [ ] Create `workspace_memberships` table with proper constraints
  - [ ] Create `audit_logs` table
  - [ ] Add indexes for performance
  - [ ] Seed default permission templates

- [ ] **Middleware Implementation**
  - [ ] Create `auth.js` - JWT validation
  - [ ] Create `workspace.js` - Membership validation
  - [ ] Create `permissions.js` - Permission checking
  - [ ] Add error handling and logging

- [ ] **Route Protection**
  - [ ] Apply auth middleware to all API routes
  - [ ] Apply workspace middleware to scoped routes
  - [ ] Add permission checks to each endpoint
  - [ ] Add resource ownership validation

- [ ] **Audit Logging**
  - [ ] Log successful actions
  - [ ] Log permission denials
  - [ ] Log authentication failures
  - [ ] Include IP address and user agent

- [ ] **Testing**
  - [ ] Write integration tests for each permission
  - [ ] Test all unauthorized access scenarios
  - [ ] Test workspace isolation
  - [ ] Test audit log generation
  - [ ] Performance test with large permission sets

### Frontend Tasks

- [ ] **Error Handling**
  - [ ] Display user-friendly 403 errors
  - [ ] Redirect to login on 401
  - [ ] Show contact admin message for permission errors

- [ ] **Optimistic UI**
  - [ ] Check permissions before API calls
  - [ ] Disable buttons for unpermitted actions
  - [ ] Show permission errors inline

---

## Security Best Practices

### 1. Never Trust the Client

❌ **DON'T** rely on frontend to enforce security
✅ **DO** validate every request on backend

### 2. Fail Closed

❌ **DON'T** allow access if permission check errors
✅ **DO** deny access on errors/edge cases

### 3. Audit Everything

❌ **DON'T** log only successful actions
✅ **DO** log denials, failures, and anomalies

### 4. Validate Resource Ownership

❌ **DON'T** trust resource IDs from client
✅ **DO** verify resources belong to user's workspace

### 5. Use Prepared Statements

❌ **DON'T** concatenate SQL strings
✅ **DO** use parameterized queries

---

## Production Deployment Checklist

- [ ] Environment variables configured (`JWT_SECRET`, `DATABASE_URL`)
- [ ] Database migrations applied
- [ ] Permission templates seeded
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Logging infrastructure set up
- [ ] Monitoring alerts configured
- [ ] Security audit completed
- [ ] Penetration test passed
- [ ] Load testing passed

---

## Support & Escalation

**Critical Security Issues**: Bypass of permission checks, unauthorized data access
**High Priority**: Permission errors blocking legitimate users
**Medium Priority**: Audit log gaps, performance degradation
**Low Priority**: UI improvements, logging enhancements

---

**Document Version**: 1.0
**Last Updated**: 2025-02-11
**Next Review**: Before production deployment

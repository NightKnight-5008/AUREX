/**
 * RBAC Router - Routes users based on workspace state
 * Enforces access control at the UI level
 */

import { useEffect, useState } from 'react';
import { useRBAC } from '@/contexts/rbac-context';
import { CreateWorkspace } from './CreateWorkspace';
import { RequestAccess } from './RequestAccess';
import { PendingAccess } from './PendingAccess';
import { Loader2 } from 'lucide-react';
import type { AccessRequest } from '@/types/rbac';

interface RBACRouterProps {
  children: React.ReactNode;
}

export function RBACRouter({ children }: RBACRouterProps) {
  const { isLoading, workspaceStatus, refreshContext } = useRBAC();
  const [pendingRequest, setPendingRequest] = useState<AccessRequest | null>(null);

  useEffect(() => {
    // Check for pending request on mount
    const stored = localStorage.getItem('rbac_pending_request');
    if (stored) {
      try {
        setPendingRequest(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse pending request:', e);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // User needs to create workspace (CEO flow)
  if (workspaceStatus?.state === 'not_created') {
    return (
      <CreateWorkspace
        onWorkspaceCreated={async () => {
          await refreshContext();
        }}
      />
    );
  }

  // User needs to request access (non-owner flow)
  if (workspaceStatus?.state === 'not_member' && !pendingRequest) {
    return (
      <RequestAccess
        onRequestSubmitted={async () => {
          await refreshContext();
          // Reload to show pending state
          window.location.reload();
        }}
      />
    );
  }

  // Access request is pending
  if (pendingRequest) {
    return (
      <PendingAccess
        accessRequest={pendingRequest}
        onRequestAnother={() => {
          localStorage.removeItem('rbac_pending_request');
          setPendingRequest(null);
        }}
      />
    );
  }

  // User is suspended
  if (workspaceStatus?.state === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Suspended</h1>
          <p className="text-muted-foreground">
            Your access to this workspace has been suspended. Please contact your workspace
            administrator.
          </p>
        </div>
      </div>
    );
  }

  // User access was revoked
  if (workspaceStatus?.state === 'revoked') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Revoked</h1>
          <p className="text-muted-foreground">
            Your access to this workspace has been revoked. Please contact your workspace
            administrator or request access to a different workspace.
          </p>
        </div>
      </div>
    );
  }

  // User is active - show main app
  return <>{children}</>;
}

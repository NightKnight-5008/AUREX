/**
 * RBAC Context Provider
 * Multi-tenant role-based access control with permission resolution
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type {
  UserContext,
  AuthState,
  PermissionKey,
  WorkspaceState,
  WorkspaceStatus,
} from '@/types/rbac';

interface RBACContextValue extends AuthState {
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  workspaceStatus: WorkspaceStatus | null;
  refreshContext: () => Promise<void>;
}

const RBACContext = createContext<RBACContextValue | null>(null);

interface RBACProviderProps {
  children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    context: null,
    error: null,
  });

  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      // In a real implementation, this would call your backend API
      // For now, we'll use localStorage to simulate auth state
      const storedUser = localStorage.getItem('rbac_user');
      const storedContext = localStorage.getItem('rbac_context');

      if (storedUser && storedContext) {
        const user = JSON.parse(storedUser);
        const context: UserContext = JSON.parse(storedContext);

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user,
          context,
          error: null,
        });

        // Determine workspace status
        updateWorkspaceStatus(context);
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          context: null,
          error: null,
        });

        setWorkspaceStatus({
          state: 'not_created',
          message: 'No workspace found. Create your company workspace to get started.',
        });
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        context: null,
        error: 'Failed to load authentication state',
      });
    }
  };

  const updateWorkspaceStatus = (context: UserContext) => {
    if (!context.workspace) {
      setWorkspaceStatus({
        state: 'not_member',
        message: 'Request access to a company workspace',
      });
      return;
    }

    if (context.member?.status === 'suspended') {
      setWorkspaceStatus({
        state: 'suspended',
        workspace: context.workspace,
        member: context.member ?? undefined,
        message: 'Your access has been suspended',
      });
      return;
    }

    if (context.member?.status === 'revoked') {
      setWorkspaceStatus({
        state: 'revoked',
        workspace: context.workspace,
        member: context.member ?? undefined,
        message: 'Your access has been revoked',
      });
      return;
    }

    setWorkspaceStatus({
      state: 'active',
      workspace: context.workspace,
      member: context.member ?? undefined,
      message: 'Active workspace member',
    });
  };

  const refreshContext = async () => {
    await loadAuthState();
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!authState.context) return false;
    return authState.context.permissions.has(permission);
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    if (!authState.context) return false;
    return permissions.some((p) => authState.context!.permissions.has(p));
  };

  const hasAllPermissions = (permissions: PermissionKey[]): boolean => {
    if (!authState.context) return false;
    return permissions.every((p) => authState.context!.permissions.has(p));
  };

  const value: RBACContextValue = {
    ...authState,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    workspaceStatus,
    refreshContext,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
}

// Convenience hooks
export function usePermission(permission: PermissionKey): boolean {
  const { hasPermission } = useRBAC();
  return hasPermission(permission);
}

export function usePermissions(permissions: PermissionKey[]): boolean {
  const { hasAllPermissions } = useRBAC();
  return hasAllPermissions(permissions);
}

export function useAnyPermission(permissions: PermissionKey[]): boolean {
  const { hasAnyPermission } = useRBAC();
  return hasAnyPermission(permissions);
}

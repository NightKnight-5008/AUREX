/**
 * Workspace Creation Flow (CEO/Owner)
 * Full-screen form to create a company workspace
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CreateWorkspaceInput } from '@/types/rbac';

interface CreateWorkspaceProps {
  onWorkspaceCreated: () => void;
}

export function CreateWorkspace({ onWorkspaceCreated }: CreateWorkspaceProps) {
  const [formData, setFormData] = useState<CreateWorkspaceInput>({
    companyName: '',
    companyUsername: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Validate company username format
  const isValidUsername = (username: string): boolean => {
    return /^[a-z0-9_-]+$/.test(username);
  };

  // Check username availability (simulated - would call API in production)
  const checkUsernameAvailability = async (username: string) => {
    if (!username || !isValidUsername(username)) {
      setUsernameAvailable(null);
      return;
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // For demo: check against localStorage
    const existingWorkspaces = JSON.parse(localStorage.getItem('rbac_workspaces') || '[]');
    const available = !existingWorkspaces.some((w: any) => w.companyUsername === username);
    setUsernameAvailable(available);
  };

  const handleUsernameChange = (username: string) => {
    const lowercased = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setFormData({ ...formData, companyUsername: lowercased });
    checkUsernameAvailability(lowercased);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!formData.companyUsername.trim()) {
      setError('Company username is required');
      return;
    }

    if (!isValidUsername(formData.companyUsername)) {
      setError('Username can only contain lowercase letters, numbers, hyphens, and underscores');
      return;
    }

    if (!usernameAvailable) {
      setError('This username is already taken');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call to create workspace
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get current user
      const currentUser = JSON.parse(localStorage.getItem('rbac_user') || '{}');

      // Create workspace
      const workspace = {
        id: crypto.randomUUID(),
        companyName: formData.companyName,
        companyUsername: formData.companyUsername,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        ownerUserId: currentUser.id,
        settings: {},
      };

      // Create owner role
      const ownerRole = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        roleName: 'Owner',
        roleKey: 'OWNER',
        description: 'Workspace owner with full access',
        isSystemRole: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create executive permission template
      const executiveTemplate = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        templateName: 'Executive',
        templateKey: 'EXECUTIVE',
        description: 'Full access to all features',
        isSystemTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create workspace member (owner)
      const member = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        userId: currentUser.id,
        roleId: ownerRole.id,
        permissionTemplateId: executiveTemplate.id,
        status: 'active',
        joinedAt: new Date().toISOString(),
        approvedBy: currentUser.id,
        approvedAt: new Date().toISOString(),
        revokedAt: null,
        revokedBy: null,
      };

      // All permissions for executive template
      const allPermissions = [
        'PAYROLL_VIEW',
        'PAYROLL_EDIT',
        'PAYROLL_APPROVE',
        'CARDS_VIEW',
        'CARDS_EDIT',
        'CARDS_CREATE',
        'FINANCE_VIEW',
        'FINANCE_EDIT',
        'FINANCE_APPROVE',
        'METRICS_VIEW',
        'SMS_VIEW',
        'TAX_VIEW',
        'TAX_EDIT',
        'FILES_VIEW',
        'FILES_UPLOAD',
        'SETTINGS_VIEW',
        'SETTINGS_EDIT',
        'USERS_VIEW',
        'USERS_MANAGE',
        'USERS_APPROVE',
        'AUDIT_VIEW',
      ];

      // Save to localStorage (simulating backend)
      const workspaces = JSON.parse(localStorage.getItem('rbac_workspaces') || '[]');
      workspaces.push(workspace);
      localStorage.setItem('rbac_workspaces', JSON.stringify(workspaces));

      // Update user context
      const userContext = {
        user: currentUser,
        workspace,
        member,
        role: ownerRole,
        permissions: new Set(allPermissions),
        isOwner: true,
        isDelegatedApprover: false,
      };

      localStorage.setItem('rbac_context', JSON.stringify(userContext));

      // Create audit event
      const auditEvent = {
        id: crypto.randomUUID(),
        eventId: `evt_${Date.now()}_${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        eventType: 'WORKSPACE_CREATED',
        actorUserId: currentUser.id,
        targetUserId: null,
        beforeState: null,
        afterState: { workspace, role: ownerRole, member },
        metadata: { companyUsername: workspace.companyUsername },
        timestamp: new Date().toISOString(),
        ipAddress: null,
        userAgent: navigator.userAgent,
      };

      const auditLog = JSON.parse(localStorage.getItem('rbac_audit_log') || '[]');
      auditLog.push(auditEvent);
      localStorage.setItem('rbac_audit_log', JSON.stringify(auditLog));

      // Notify parent
      onWorkspaceCreated();
    } catch (err) {
      console.error('Failed to create workspace:', err);
      setError('Failed to create workspace. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create Your Company Workspace</CardTitle>
          <CardDescription className="text-base mt-3">
            Set up your company's workspace to get started with AUREX.
            <br />
            You'll be the workspace owner with full access.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-base font-semibold">
                Company Name
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Acme Corporation"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="text-base h-12"
                disabled={isSubmitting}
                required
              />
              <p className="text-sm text-muted-foreground">
                Your company's display name
              </p>
            </div>

            {/* Company Username */}
            <div className="space-y-2">
              <Label htmlFor="companyUsername" className="text-base font-semibold">
                Company Username
              </Label>
              <div className="relative">
                <Input
                  id="companyUsername"
                  type="text"
                  placeholder="acme-corp"
                  value={formData.companyUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="text-base h-12 pr-10"
                  disabled={isSubmitting}
                  required
                />
                {formData.companyUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameAvailable === true && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {usernameAvailable === false && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                This username is how your team will request access.
                <br />
                Only lowercase letters, numbers, hyphens, and underscores allowed.
              </p>
              {usernameAvailable === false && (
                <p className="text-sm text-red-600 font-medium">
                  This username is already taken
                </p>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isSubmitting || !usernameAvailable}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

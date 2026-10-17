/**
 * Access Request Flow (Non-Owner Users)
 * Locked page for requesting access to a company workspace
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2, AlertCircle, Building2 } from 'lucide-react';
import type { CreateAccessRequestInput, RoleKey } from '@/types/rbac';

interface RequestAccessProps {
  onRequestSubmitted: () => void;
}

const AVAILABLE_ROLES: Array<{ key: RoleKey; name: string; description: string }> = [
  { key: 'CFO', name: 'CFO', description: 'Chief Financial Officer - Full financial access' },
  { key: 'COO', name: 'COO', description: 'Chief Operating Officer - Operations management' },
  { key: 'MANAGER', name: 'Manager', description: 'Department manager - Team oversight' },
  { key: 'DIRECTOR', name: 'Director', description: 'Director - Strategic planning' },
  { key: 'ANALYST', name: 'Analyst', description: 'Analyst - Data analysis and reporting' },
  { key: 'HR', name: 'HR', description: 'Human Resources - People management' },
  { key: 'ADMIN', name: 'Admin', description: 'Administrator - System administration' },
  { key: 'READ_ONLY', name: 'Read-Only', description: 'View-only access' },
];

export function RequestAccess({ onRequestSubmitted }: RequestAccessProps) {
  const [formData, setFormData] = useState<CreateAccessRequestInput>({
    companyUsername: '',
    fullName: '',
    requestedRoleKey: 'READ_ONLY',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceFound, setWorkspaceFound] = useState<boolean | null>(null);

  // Check if workspace exists (simulated - would call API in production)
  const checkWorkspaceExists = async (username: string) => {
    if (!username) {
      setWorkspaceFound(null);
      return;
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Check against localStorage
    const workspaces = JSON.parse(localStorage.getItem('rbac_workspaces') || '[]');
    const found = workspaces.some((w: any) => w.companyUsername === username);
    setWorkspaceFound(found);
  };

  const handleUsernameChange = (username: string) => {
    const lowercased = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setFormData({ ...formData, companyUsername: lowercased });
    checkWorkspaceExists(lowercased);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.companyUsername.trim()) {
      setError('Company username is required');
      return;
    }

    if (!workspaceFound) {
      setError('Workspace not found. Please check the company username.');
      return;
    }

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please provide a brief description of why you need access');
      return;
    }

    if (formData.description.length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get workspace
      const workspaces = JSON.parse(localStorage.getItem('rbac_workspaces') || '[]');
      const workspace = workspaces.find(
        (w: any) => w.companyUsername === formData.companyUsername
      );

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Get current user
      const currentUser = JSON.parse(localStorage.getItem('rbac_user') || '{}');

      // Find requested role
      const roles = JSON.parse(localStorage.getItem('rbac_roles') || '[]');
      let requestedRole = roles.find(
        (r: any) => r.workspaceId === workspace.id && r.roleKey === formData.requestedRoleKey
      );

      // Create role if it doesn't exist
      if (!requestedRole) {
        const roleInfo = AVAILABLE_ROLES.find((r) => r.key === formData.requestedRoleKey);
        requestedRole = {
          id: crypto.randomUUID(),
          workspaceId: workspace.id,
          roleName: roleInfo?.name || formData.requestedRoleKey,
          roleKey: formData.requestedRoleKey,
          description: roleInfo?.description || '',
          isSystemRole: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        roles.push(requestedRole);
        localStorage.setItem('rbac_roles', JSON.stringify(roles));
      }

      // Create access request
      const accessRequest = {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        userId: currentUser.id,
        requestedRoleId: requestedRole.id,
        fullName: formData.fullName,
        description: formData.description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        denialReason: null,
      };

      // Save access request
      const accessRequests = JSON.parse(localStorage.getItem('rbac_access_requests') || '[]');
      accessRequests.push(accessRequest);
      localStorage.setItem('rbac_access_requests', JSON.stringify(accessRequests));

      // Create audit event
      const auditEvent = {
        id: crypto.randomUUID(),
        eventId: `evt_${Date.now()}_${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        eventType: 'ACCESS_REQUEST_CREATED',
        actorUserId: currentUser.id,
        targetUserId: currentUser.id,
        beforeState: null,
        afterState: { accessRequest },
        metadata: {
          requestedRoleKey: formData.requestedRoleKey,
          companyUsername: formData.companyUsername,
        },
        timestamp: new Date().toISOString(),
        ipAddress: null,
        userAgent: navigator.userAgent,
      };

      const auditLog = JSON.parse(localStorage.getItem('rbac_audit_log') || '[]');
      auditLog.push(auditEvent);
      localStorage.setItem('rbac_audit_log', JSON.stringify(auditLog));

      // Store pending request reference
      localStorage.setItem('rbac_pending_request', JSON.stringify(accessRequest));

      // Notify parent
      onRequestSubmitted();
    } catch (err) {
      console.error('Failed to submit access request:', err);
      setError('Failed to submit access request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Request Access to a Company</CardTitle>
          <CardDescription className="text-base mt-3">
            Enter the company username to request access to their workspace.
            <br />
            Your request will be reviewed by an authorized approver.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Username */}
            <div className="space-y-2">
              <Label htmlFor="companyUsername" className="text-base font-semibold">
                Company Username
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <Input
                  id="companyUsername"
                  type="text"
                  placeholder="acme-corp"
                  value={formData.companyUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="text-base h-12 pl-10"
                  disabled={isSubmitting}
                  required
                />
              </div>
              {workspaceFound === false && (
                <p className="text-sm text-red-600 font-medium">
                  Workspace not found. Please check the username.
                </p>
              )}
              {workspaceFound === true && (
                <p className="text-sm text-green-600 font-medium">Workspace found!</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base font-semibold">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="text-base h-12"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Requested Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-base font-semibold">
                Requested Role
              </Label>
              <Select
                value={formData.requestedRoleKey}
                onValueChange={(value: RoleKey) =>
                  setFormData({ ...formData, requestedRoleKey: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Description / Justification
              </Label>
              <Textarea
                id="description"
                placeholder="Please explain why you need access to this workspace..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-base min-h-[120px]"
                disabled={isSubmitting}
                required
              />
              <p className="text-sm text-muted-foreground">
                Minimum 20 characters. Be specific about your role and responsibilities.
              </p>
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
              disabled={isSubmitting || !workspaceFound}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

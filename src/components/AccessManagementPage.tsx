import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Inbox,
  CheckCircle,
  XCircle,
  Users,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { Workspace, WorkspaceMembership } from '@/hooks/use-workspace';
import { getPermissionTemplates, type PermissionSet, type PermissionTemplate } from '@/hooks/use-workspace';
import {
  canApproveAccessRequests,
  getPendingAccessRequests,
  getApprovedMemberships,
  getDeniedAccessRequests,
  approveAccessRequestWithConfig,
  denyAccessRequest,
} from '@/lib/access-permissions';

interface AccessManagementPageProps {
  workspace: Workspace | null;
  membership: WorkspaceMembership | null;
  onBack: () => void;
}

type SectionType = 'new' | 'approved' | 'denied' | 'accounts';

export function AccessManagementPage({ workspace, membership, onBack }: AccessManagementPageProps) {
  const [activeSection, setActiveSection] = useState<SectionType>('new');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Approval configuration state (inline panel)
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalRole, setApprovalRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>('member');
  const [approvalTemplateId, setApprovalTemplateId] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<PermissionSet | null>(null);

  // Permission check - CRITICAL: Only approvers can see this page
  const hasPermission = canApproveAccessRequests(membership);

  // Load data
  const newRequests = workspace ? getPendingAccessRequests(workspace.id) : [];
  const approvedRequests = workspace ? getApprovedMemberships(workspace.id) : [];
  const deniedRequests = workspace ? getDeniedAccessRequests(workspace.id) : [];
  const templates = getPermissionTemplates();

  // Permission Denied Screen - HARD ENFORCEMENT
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have permission to manage access requests.
          </p>
          <Button onClick={onBack} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  // Sidebar sections
  const sections = [
    {
      id: 'new' as SectionType,
      label: 'New Requests',
      icon: Inbox,
      count: newRequests.length,
      color: 'text-blue-600',
    },
    {
      id: 'approved' as SectionType,
      label: 'Approved',
      icon: CheckCircle,
      count: approvedRequests.length,
      color: 'text-green-600',
    },
    {
      id: 'denied' as SectionType,
      label: 'Denied',
      icon: XCircle,
      count: deniedRequests.length,
      color: 'text-red-600',
    },
    {
      id: 'accounts' as SectionType,
      label: 'Accounts with Access',
      icon: Users,
      count: approvedRequests.length,
      color: 'text-purple-600',
    },
  ];

  const getCurrentData = () => {
    switch (activeSection) {
      case 'new':
        return newRequests;
      case 'approved':
        return approvedRequests;
      case 'denied':
        return deniedRequests;
      case 'accounts':
        return approvedRequests;
      default:
        return [];
    }
  };

  const currentData = getCurrentData();

  // Handle approve button - expands inline configuration panel
  const handleApproveClick = (request: WorkspaceMembership) => {
    setApprovingId(request.id);

    // Set default values based on requested role
    const requestedRoleLower = request.requestedRole.toLowerCase();
    let defaultRole: 'owner' | 'admin' | 'member' | 'viewer' = 'member';
    let defaultTemplate = templates.find(t => t.type === 'read_only')!;

    if (requestedRoleLower.includes('executive') || requestedRoleLower.includes('ceo') || requestedRoleLower.includes('coo')) {
      defaultRole = 'admin';
      defaultTemplate = templates.find(t => t.type === 'executive')!;
    } else if (requestedRoleLower.includes('finance') || requestedRoleLower.includes('cfo')) {
      defaultRole = 'member';
      defaultTemplate = templates.find(t => t.type === 'finance')!;
    } else if (requestedRoleLower.includes('manager') || requestedRoleLower.includes('director')) {
      defaultRole = 'member';
      defaultTemplate = templates.find(t => t.type === 'management')!;
    } else if (requestedRoleLower.includes('operations') || requestedRoleLower.includes('ops')) {
      defaultRole = 'member';
      defaultTemplate = templates.find(t => t.type === 'operations')!;
    }

    setApprovalRole(defaultRole);
    setApprovalTemplateId(defaultTemplate.id);
    setCustomPermissions(null);
    setShowAdvanced(false);
  };

  // Handle final approval with configuration
  const handleFinalApprove = async (request: WorkspaceMembership) => {
    if (!membership) return;

    setProcessingId(request.id);

    // Smooth transition delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const success = approveAccessRequestWithConfig(
      request.id,
      membership.userId,
      membership.userName,
      {
        role: approvalRole,
        permissionTemplateId: approvalTemplateId,
        customPermissions: customPermissions,
      }
    );

    if (success) {
      setRefreshKey(prev => prev + 1);
      setApprovingId(null);
      setCustomPermissions(null);
    }

    setProcessingId(null);
  };

  // Handle deny
  const handleDeny = async (membershipId: string) => {
    setProcessingId(membershipId);
    await new Promise(resolve => setTimeout(resolve, 300));
    const success = denyAccessRequest(membershipId);
    if (success) {
      setRefreshKey(prev => prev + 1);
    }
    setProcessingId(null);
  };

  // Toggle advanced permissions
  const handleTogglePermission = (key: keyof PermissionSet) => {
    const selectedTemplate = templates.find(t => t.id === approvalTemplateId);
    if (!selectedTemplate) return;

    const basePermissions = customPermissions || selectedTemplate.permissions;
    setCustomPermissions({
      ...basePermissions,
      [key]: !basePermissions[key],
    });
  };

  // Get effective permissions for display
  const getEffectivePermissions = (): PermissionSet | null => {
    if (customPermissions) return customPermissions;
    const template = templates.find(t => t.id === approvalTemplateId);
    return template ? template.permissions : null;
  };

  // Render table content
  const renderTableContent = () => {
    if (currentData.length === 0) {
      return (
        <div className="text-center py-16">
          <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2">
            {activeSection === 'new' && "You're all caught up"}
            {activeSection === 'approved' && "No approved requests"}
            {activeSection === 'denied' && "No denied requests"}
            {activeSection === 'accounts' && "No accounts with access"}
          </h3>
          <p className="text-muted-foreground">
            {activeSection === 'new' && "New access requests will appear here."}
            {activeSection === 'approved' && "Approved access requests will appear here."}
            {activeSection === 'denied' && "Denied access requests will appear here."}
            {activeSection === 'accounts' && "User accounts will appear here."}
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[calc(100vh-250px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
            <TableRow>
              <TableHead className="w-[200px]">User</TableHead>
              <TableHead className="w-[150px]">Email</TableHead>
              <TableHead className="w-[150px]">Requested Role</TableHead>
              <TableHead>Justification</TableHead>
              <TableHead className="w-[150px]">Requested At</TableHead>
              {activeSection === 'new' && <TableHead className="w-[150px] text-center">Actions</TableHead>}
              {(activeSection === 'approved' || activeSection === 'denied') && (
                <TableHead className="w-[150px]">Status</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((request) => {
              const isExpanded = approvingId === request.id;

              return (
                <>
                  <TableRow
                    key={request.id}
                    className="transition-all duration-150 ease-in-out hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{request.userName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.requestedRole}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.requestJustification}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(request.requestedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    {activeSection === 'new' && (
                      <TableCell className="text-center">
                        {!isExpanded ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="transition-all duration-150 ease-in-out"
                              onClick={() => handleApproveClick(request)}
                              disabled={processingId === request.id}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="transition-all duration-150 ease-in-out"
                              onClick={() => handleDeny(request.id)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Deny
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Configuring...</span>
                        )}
                      </TableCell>
                    )}
                    {activeSection === 'approved' && (
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">Approved</span>
                        </Badge>
                      </TableCell>
                    )}
                    {activeSection === 'denied' && (
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 border-red-200">
                          <XCircle className="w-3 h-3 mr-1 text-red-600" />
                          <span className="text-red-700 dark:text-red-400">Denied</span>
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Inline Approval Configuration Panel */}
                  {isExpanded && activeSection === 'new' && (
                    <TableRow key={`${request.id}-config`} className="bg-blue-50/50 dark:bg-blue-950/10">
                      <TableCell colSpan={6} className="p-6">
                        <div className="space-y-6">
                          {/* Identity Summary */}
                          <div className="border-b pb-4">
                            <h3 className="text-sm font-semibold mb-3">Approval Configuration</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Full Name:</span>
                                <span className="ml-2 font-medium">{request.userName}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Email:</span>
                                <span className="ml-2 font-medium">{request.userEmail}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Requested Role:</span>
                                <span className="ml-2 font-medium">{request.requestedRole}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Justification:</span>
                                <span className="ml-2 font-medium">{request.requestJustification}</span>
                              </div>
                            </div>
                          </div>

                          {/* Configuration Inputs */}
                          <div className="grid grid-cols-2 gap-6">
                            {/* Role Assignment */}
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                                Role Assignment
                              </label>
                              <Select value={approvalRole} onValueChange={(v) => setApprovalRole(v as any)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {membership?.role === 'owner' && (
                                    <SelectItem value="owner">Owner (CEO)</SelectItem>
                                  )}
                                  <SelectItem value="admin">Admin (Executive)</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Permission Template */}
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                                Access Level
                              </label>
                              <Select value={approvalTemplateId} onValueChange={setApprovalTemplateId}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {approvalTemplateId && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {templates.find(t => t.id === approvalTemplateId)?.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Advanced Permission Overrides */}
                          {membership?.role === 'owner' && (
                            <div>
                              <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                Advanced Access Controls
                              </button>

                              {showAdvanced && (
                                <div className="mt-4 p-4 border rounded-lg bg-white dark:bg-gray-900">
                                  <div className="grid grid-cols-3 gap-4">
                                    {Object.entries(getEffectivePermissions() || {}).map(([key, value]) => (
                                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={value}
                                          onChange={() => handleTogglePermission(key as keyof PermissionSet)}
                                          className="w-4 h-4"
                                        />
                                        <span className={value ? 'font-medium' : 'text-muted-foreground'}>
                                          {key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Final Actions */}
                          <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setApprovingId(null);
                                setCustomPermissions(null);
                              }}
                              disabled={processingId === request.id}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="default"
                              onClick={() => handleFinalApprove(request)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve & Grant Access
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <div className="bg-card border-b transition-all duration-150 ease-in-out">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="pl-4 border-l border-border">
                <h1 className="text-2xl font-bold">Access Management</h1>
                <p className="text-sm text-muted-foreground">Manage workspace access requests</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout: Sidebar + Main Panel */}
      <div className="container mx-auto px-4 py-6" key={refreshKey}>
        <div className="flex gap-4">
          {/* Left Sidebar */}
          <Card className="w-64 flex-shrink-0 p-2 h-fit">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-150 ease-in-out ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? section.color : ''}`} />
                      <span className="text-sm">{section.label}</span>
                    </div>
                    {section.count > 0 && (
                      <Badge variant={isActive ? 'default' : 'secondary'} className="ml-2">
                        {section.count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Right Main Panel */}
          <Card className="flex-1 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-1">
                {sections.find(s => s.id === activeSection)?.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentData.length} {currentData.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {renderTableContent()}
          </Card>
        </div>
      </div>
    </div>
  );
}

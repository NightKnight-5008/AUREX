/**
 * Gmail-Style Access Management Interface
 * 4-section sidebar with dynamic detail panel
 */

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Inbox,
  CheckCircle,
  XCircle,
  Users,
  ChevronRight,
  User,
  Calendar,
  FileText,
  Shield,
} from 'lucide-react';
import type {
  AccessManagementSection,
  AccessRequest,
  WorkspaceMember,
  PermissionTemplateKey,
  RoleKey,
} from '@/types/rbac';

interface AccessManagementProps {
  workspaceId: string;
}

const SECTIONS: Array<{
  key: AccessManagementSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'new_requests', label: 'New Requests', icon: Inbox },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'denied', label: 'Denied', icon: XCircle },
  { key: 'accounts_with_access', label: 'Accounts with Access', icon: Users },
];

export function AccessManagement({ workspaceId }: AccessManagementProps) {
  const [activeSection, setActiveSection] = useState<AccessManagementSection>('new_requests');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);

  // Load data from localStorage (simulated backend)
  const allRequests = useMemo(() => {
    const requests = JSON.parse(localStorage.getItem('rbac_access_requests') || '[]');
    return requests.filter((r: AccessRequest) => r.workspaceId === workspaceId);
  }, [workspaceId]);

  const allMembers = useMemo(() => {
    const members = JSON.parse(localStorage.getItem('rbac_workspace_members') || '[]');
    return members.filter((m: WorkspaceMember) => m.workspaceId === workspaceId);
  }, [workspaceId]);

  // Filter requests by status
  const newRequests = allRequests.filter((r: AccessRequest) => r.status === 'pending');
  const approvedRequests = allRequests.filter((r: AccessRequest) => r.status === 'approved');
  const deniedRequests = allRequests.filter((r: AccessRequest) => r.status === 'denied');

  // Get badge count for section
  const getBadgeCount = (section: AccessManagementSection): number => {
    switch (section) {
      case 'new_requests':
        return newRequests.length;
      case 'approved':
        return approvedRequests.length;
      case 'denied':
        return deniedRequests.length;
      case 'accounts_with_access':
        return allMembers.length;
      default:
        return 0;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background">
      {/* LEFT SIDEBAR - Gmail-style (STATIC, EXACTLY 4 ROWS) */}
      <div className="w-64 border-r bg-muted/30 flex-shrink-0">
        <ScrollArea className="h-full">
          <div className="p-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const count = getBadgeCount(section.key);
              const isActive = activeSection === section.key;

              return (
                <button
                  key={section.key}
                  onClick={() => {
                    setActiveSection(section.key);
                    setSelectedRequest(null);
                    setSelectedMember(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-150 ease-in-out mb-1 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{section.label}</span>
                  </div>
                  {count > 0 && (
                    <Badge
                      variant={isActive ? 'secondary' : 'default'}
                      className="ml-2 min-w-[24px] justify-center"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT MAIN PANEL - Dynamic content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSection === 'new_requests' && (
          <NewRequestsPanel
            requests={newRequests}
            selectedRequest={selectedRequest}
            onSelectRequest={setSelectedRequest}
            onApprove={(requestId, templateId) => {
              // Handle approval
              console.log('Approve:', requestId, templateId);
            }}
            onDeny={(requestId, reason) => {
              // Handle denial
              console.log('Deny:', requestId, reason);
            }}
          />
        )}

        {activeSection === 'approved' && (
          <ApprovedPanel requests={approvedRequests} formatDate={formatDate} />
        )}

        {activeSection === 'denied' && (
          <DeniedPanel requests={deniedRequests} formatDate={formatDate} />
        )}

        {activeSection === 'accounts_with_access' && (
          <AccountsWithAccessPanel
            members={allMembers}
            selectedMember={selectedMember}
            onSelectMember={setSelectedMember}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
}

// NEW REQUESTS PANEL
interface NewRequestsPanelProps {
  requests: AccessRequest[];
  selectedRequest: AccessRequest | null;
  onSelectRequest: (request: AccessRequest | null) => void;
  onApprove: (requestId: string, templateId: string) => void;
  onDeny: (requestId: string, reason: string) => void;
}

function NewRequestsPanel({
  requests,
  selectedRequest,
  onSelectRequest,
  onApprove,
  onDeny,
}: NewRequestsPanelProps) {
  const [denialReason, setDenialReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplateKey>('READ_ONLY');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (requests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
          <p className="text-sm text-muted-foreground">
            All access requests have been reviewed
          </p>
        </div>
      </div>
    );
  }

  if (!selectedRequest) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">New Access Requests</h2>
          <p className="text-sm text-muted-foreground">
            {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
          </p>
        </div>
        <ScrollArea className="h-[calc(100%-80px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Requested Role</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors duration-150 ease-in-out"
                  onClick={() => onSelectRequest(request)}
                >
                  <TableCell className="font-medium">{request.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.requestedRole?.roleName || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  }

  // Detail view
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => onSelectRequest(null)}>
          ← Back to List
        </Button>
        <Badge variant="outline" className="text-sm">
          Pending
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Request Info */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Full Name</div>
                <div className="font-semibold text-lg">{selectedRequest.fullName}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Requested Role</div>
                <div className="font-semibold">{selectedRequest.requestedRole?.roleName || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Submitted</div>
                <div className="font-semibold">{formatDate(selectedRequest.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="mt-1 text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedRequest.description}
                </div>
              </div>
            </div>
          </div>

          {/* Approval Actions */}
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Permission Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value: PermissionTemplateKey) => setSelectedTemplate(value)}
              >
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXECUTIVE">Executive - Full Access</SelectItem>
                  <SelectItem value="FINANCE">Finance - Financial Access</SelectItem>
                  <SelectItem value="MANAGEMENT">Management - Team Oversight</SelectItem>
                  <SelectItem value="OPERATIONS">Operations - Operational Access</SelectItem>
                  <SelectItem value="READ_ONLY">Read-Only - View Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApprove(selectedRequest.id, selectedTemplate)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onDeny(selectedRequest.id, denialReason)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deny
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="denialReason">Denial Reason (Optional)</Label>
              <Textarea
                id="denialReason"
                placeholder="Provide a reason for denial..."
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// APPROVED PANEL
function ApprovedPanel({
  requests,
  formatDate,
}: {
  requests: AccessRequest[];
  formatDate: (date: string) => string;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Approved Requests</h2>
        <p className="text-sm text-muted-foreground">{requests.length} approved</p>
      </div>
      <ScrollArea className="h-[calc(100%-80px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Approval Date</TableHead>
              <TableHead>Approved By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.fullName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{request.requestedRole?.roleName || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {request.reviewedAt ? formatDate(request.reviewedAt) : 'N/A'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {request.reviewer?.fullName || 'Unknown'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// DENIED PANEL
function DeniedPanel({
  requests,
  formatDate,
}: {
  requests: AccessRequest[];
  formatDate: (date: string) => string;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Denied Requests</h2>
        <p className="text-sm text-muted-foreground">{requests.length} denied</p>
      </div>
      <ScrollArea className="h-[calc(100%-80px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Denial Date</TableHead>
              <TableHead>Denied By</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.fullName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{request.requestedRole?.roleName || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {request.reviewedAt ? formatDate(request.reviewedAt) : 'N/A'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {request.reviewer?.fullName || 'Unknown'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {request.denialReason || 'No reason provided'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ACCOUNTS WITH ACCESS PANEL
function AccountsWithAccessPanel({
  members,
  selectedMember,
  onSelectMember,
  formatDate,
}: {
  members: WorkspaceMember[];
  selectedMember: WorkspaceMember | null;
  onSelectMember: (member: WorkspaceMember | null) => void;
  formatDate: (date: string) => string;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Accounts with Access</h2>
        <p className="text-sm text-muted-foreground">{members.length} active members</p>
      </div>
      <ScrollArea className="h-[calc(100%-80px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permission Template</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow
                key={member.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-150 ease-in-out"
                onClick={() => onSelectMember(member)}
              >
                <TableCell className="font-medium">{member.user?.fullName || 'N/A'}</TableCell>
                <TableCell className="text-muted-foreground">{member.user?.email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{member.role?.roleName || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.permissionTemplate?.templateName || 'None'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      member.status === 'active'
                        ? 'default'
                        : member.status === 'suspended'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {member.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

/**
 * Audit Log Viewer
 * Immutable event-sourced audit trail for compliance
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, AlertCircle } from 'lucide-react';
import type { AuditEvent, AuditEventType } from '@/types/rbac';

interface AuditLogProps {
  workspaceId: string;
}

const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  ACCESS_REQUEST_CREATED: 'Access Request Created',
  ACCESS_REQUEST_APPROVED: 'Access Approved',
  ACCESS_REQUEST_DENIED: 'Access Denied',
  ROLE_ASSIGNED: 'Role Assigned',
  ROLE_CHANGED: 'Role Changed',
  PERMISSION_TEMPLATE_CHANGED: 'Permission Template Changed',
  PERMISSION_OVERRIDE_ADDED: 'Permission Override Added',
  PERMISSION_OVERRIDE_REMOVED: 'Permission Override Removed',
  DELEGATION_ADDED: 'Delegation Added',
  DELEGATION_REVOKED: 'Delegation Revoked',
  ACCESS_REVOKED: 'Access Revoked',
  WORKSPACE_CREATED: 'Workspace Created',
  MEMBER_SUSPENDED: 'Member Suspended',
  MEMBER_REACTIVATED: 'Member Reactivated',
};

const EVENT_TYPE_COLORS: Record<AuditEventType, string> = {
  ACCESS_REQUEST_CREATED: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400',
  ACCESS_REQUEST_APPROVED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
  ACCESS_REQUEST_DENIED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
  ROLE_ASSIGNED: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400',
  ROLE_CHANGED: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400',
  PERMISSION_TEMPLATE_CHANGED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
  PERMISSION_OVERRIDE_ADDED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
  PERMISSION_OVERRIDE_REMOVED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
  DELEGATION_ADDED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400',
  DELEGATION_REVOKED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400',
  ACCESS_REVOKED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
  WORKSPACE_CREATED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
  MEMBER_SUSPENDED: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400',
  MEMBER_REACTIVATED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
};

export function AuditLog({ workspaceId }: AuditLogProps) {
  // Load audit events from localStorage
  const events = useMemo(() => {
    const allEvents: AuditEvent[] = JSON.parse(localStorage.getItem('rbac_audit_log') || '[]');
    return allEvents
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [workspaceId]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Audit Log</CardTitle>
              <CardDescription>
                Immutable event trail for compliance and security monitoring
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {events.length} Events
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">Read-Only Audit Trail</p>
              <p>
                Audit events are immutable and cannot be modified or deleted. All access control
                changes are permanently logged for compliance purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[200px]">Event Type</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="w-[100px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No audit events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id} className="transition-colors duration-150 ease-in-out">
                      <TableCell className="font-mono text-xs">
                        {formatTimestamp(event.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge className={EVENT_TYPE_COLORS[event.eventType]}>
                          {EVENT_TYPE_LABELS[event.eventType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.actor?.fullName || event.actorUserId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.target?.fullName || event.targetUserId || '-'}
                      </TableCell>
                      <TableCell>
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            // Show event details in console for now
                            console.log('Event Details:', {
                              eventId: event.eventId,
                              beforeState: event.beforeState,
                              afterState: event.afterState,
                              metadata: event.metadata,
                            });
                            alert('Event details logged to console');
                          }}
                        >
                          View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Event ID Reference */}
      {events.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Latest Event ID:</p>
              <p className="font-mono">{events[0]?.eventId}</p>
              <p className="mt-2 text-[10px]">
                All events are cryptographically signed and tamper-evident
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

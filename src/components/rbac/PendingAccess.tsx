/**
 * Pending Access Locked UI
 * Shows status while access request is pending approval
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Building2, User, Calendar, FileText } from 'lucide-react';
import type { AccessRequest } from '@/types/rbac';

interface PendingAccessProps {
  accessRequest: AccessRequest;
  onRequestAnother: () => void;
}

export function PendingAccess({ accessRequest, onRequestAnother }: PendingAccessProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2">
        <CardHeader className="text-center pb-6">
          {/* Status Icon */}
          <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center mb-4 border-4 border-amber-200 dark:border-amber-900">
            <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-4">
            <Badge
              variant="outline"
              className="px-4 py-2 text-base font-semibold bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
            >
              Pending Approval
            </Badge>
          </div>

          <CardTitle className="text-3xl font-bold">Access Request Submitted</CardTitle>
          <CardDescription className="text-base mt-3">
            Your request is being reviewed by an authorized approver.
            <br />
            You'll be notified once a decision has been made.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Request Summary */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
              Request Summary
            </h3>

            {/* Company Username */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">Company</div>
                <div className="font-mono font-semibold text-lg">
                  {accessRequest.workspace?.companyUsername || 'N/A'}
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-semibold">{accessRequest.fullName}</div>
              </div>
            </div>

            {/* Requested Role */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">Requested Role</div>
                <div className="font-semibold">
                  {accessRequest.requestedRole?.roleName || 'N/A'}
                </div>
              </div>
            </div>

            {/* Submitted Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">Submitted</div>
                <div className="font-semibold">{formatDate(accessRequest.createdAt)}</div>
              </div>
            </div>

            {/* Description */}
            {accessRequest.description && (
              <div className="pt-3 border-t">
                <div className="text-sm text-muted-foreground mb-2">Your Message</div>
                <div className="text-sm bg-background rounded-lg p-3 whitespace-pre-wrap">
                  {accessRequest.description}
                </div>
              </div>
            )}
          </div>

          {/* What Happens Next */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              What Happens Next
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>Your request will be reviewed by the workspace owner or a delegated approver</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>If approved, you'll gain access to the workspace with your requested role</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>Refresh this page periodically to check for updates</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Refresh Status
            </Button>

            <Button variant="ghost" className="w-full" onClick={onRequestAnother}>
              Request Access to Another Company
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

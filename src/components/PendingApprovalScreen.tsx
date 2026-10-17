import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace, type Workspace, type WorkspaceMembership } from '@/hooks/use-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Building2, Mail, RefreshCw, Info, LogOut, Loader2 } from 'lucide-react';

interface PendingApprovalScreenProps {
  workspace: Workspace | null;
  membership: WorkspaceMembership;
}

export function PendingApprovalScreen({ workspace, membership }: PendingApprovalScreenProps) {
  const { user, signOut } = useAuth();
  const workspaceState = useWorkspace();

  // Async status check state
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleRefresh = async () => {
    setIsChecking(true);
    setStatusMessage('');

    // Simulate async check with smooth transition delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Re-fetch workspace state from localStorage (no page reload)
      const membershipsData = localStorage.getItem('workspace_memberships');
      const memberships: WorkspaceMembership[] = membershipsData ? JSON.parse(membershipsData) : [];

      const updatedMembership = memberships.find(m => m.id === membership.id);

      if (updatedMembership?.status === 'approved') {
        setStatusMessage('✓ Your request has been approved! Redirecting...');
        // Smooth redirect after showing success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      } else if (updatedMembership?.status === 'denied') {
        setStatusMessage('Your request was denied. Redirecting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      } else {
        setStatusMessage('Status: Still pending approval');
      }
    } catch (err) {
      setStatusMessage('Unable to check status. Please try again.');
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  };

  const handleSignOut = () => {
    signOut();
  };

  const requestDate = new Date(membership.requestedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-amber-200 dark:border-amber-800">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex-1" />
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
              <Clock className="w-9 h-9 text-white" />
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 ease-in-out"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Pending Approval
          </CardTitle>
          <CardDescription className="text-base">
            Your access request is being reviewed by the workspace owner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Workspace Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Requested Workspace</p>
                  <p className="font-semibold text-base truncate">
                    {workspace?.name || 'Unknown Workspace'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Pending</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">{requestDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-2">What's happening?</p>
                <ul className="space-y-1.5 text-xs">
                  <li>• The workspace owner has been notified of your request</li>
                  <li>• They will review your access request and make a decision</li>
                  <li>• You'll be automatically redirected once approved</li>
                  <li>• Check back periodically or contact your workspace administrator</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Contact Info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Need to expedite?
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Contact your workspace administrator or company IT department to speed up the approval process.
                    They can approve your request from their admin panel.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status message */}
          {statusMessage && (
            <div className="text-sm text-center text-muted-foreground animate-in fade-in duration-200 ease-in-out">
              {statusMessage}
            </div>
          )}

          {/* Last checked timestamp */}
          {lastChecked && (
            <div className="text-xs text-center text-muted-foreground animate-in fade-in duration-200 ease-in-out">
              Last checked: {lastChecked.toLocaleTimeString()}
            </div>
          )}

          {/* Refresh Button - Async with loading state */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="w-full h-12 text-base border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out"
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Checking Status...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Check Status
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

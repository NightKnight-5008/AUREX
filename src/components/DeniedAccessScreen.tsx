import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Workspace, WorkspaceMembership } from '@/hooks/use-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, Building2, Mail, AlertTriangle, LogOut } from 'lucide-react';

interface DeniedAccessScreenProps {
  workspace: Workspace | null;
  membership: WorkspaceMembership;
}

export function DeniedAccessScreen({ workspace, membership }: DeniedAccessScreenProps) {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const requestDate = new Date(membership.requestedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const deniedDate = membership.respondedAt
    ? new Date(membership.respondedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-red-200 dark:border-red-800">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
            <XCircle className="w-9 h-9 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            Access Denied
          </CardTitle>
          <CardDescription className="text-base">
            Your access request has been declined by the workspace owner
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
                  <span className="font-semibold text-red-600 dark:text-red-400">Denied</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">{requestDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Denied:</span>
                  <span className="font-medium">{deniedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="font-semibold mb-2">Why was my request denied?</p>
                <ul className="space-y-1.5 text-xs">
                  <li>• The workspace owner may have strict access policies</li>
                  <li>• Your email domain might not match company requirements</li>
                  <li>• The workspace may be at maximum capacity</li>
                  <li>• Additional verification may be required</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Contact Info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    What should I do?
                  </p>
                  <div className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
                    <p>
                      Contact the workspace administrator or your company's IT department to discuss your access needs.
                      They may be able to:
                    </p>
                    <ul className="space-y-1 ml-4">
                      <li>• Provide more information about the denial</li>
                      <li>• Guide you through additional verification steps</li>
                      <li>• Create a new workspace for your team</li>
                      <li>• Approve your request manually</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="space-y-2">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full h-12 text-base border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              disabled={isSigningOut}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You can sign in again or contact your administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

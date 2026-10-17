import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAllWorkspaces, requestWorkspaceAccess, type Workspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, AlertCircle, Users, Send, CheckCircle, ArrowLeft } from 'lucide-react';

interface RequestAccessScreenProps {
  onBack?: () => void;
}

export function RequestAccessScreen({ onBack }: RequestAccessScreenProps = {}) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [requestedRole, setRequestedRole] = useState('');
  const [requestJustification, setRequestJustification] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Privacy-first username lookup
  const [companyUsername, setCompanyUsername] = useState('');
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [foundWorkspace, setFoundWorkspace] = useState<Workspace | null>(null);
  const [showFields, setShowFields] = useState(false);

  useEffect(() => {
    // Load available workspaces (but don't display them - privacy-first)
    const loadWorkspaces = () => {
      try {
        const allWorkspaces = getAllWorkspaces();
        setWorkspaces(allWorkspaces);
      } catch (err) {
        console.error('Error loading workspaces:', err);
        setError('Failed to load available workspaces');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  // Privacy-first username validation
  const validateUsername = async () => {
    if (!companyUsername.trim()) {
      setUsernameError('Please enter a company username');
      return;
    }

    setUsernameError('');
    setIsValidatingUsername(true);

    // Simulate lookup delay for smooth UX
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // Find workspace by username
      const workspace = workspaces.find(
        w => w.username?.toLowerCase() === companyUsername.trim().toLowerCase()
      );

      if (!workspace) {
        setUsernameError('No company found with this username.');
        setFoundWorkspace(null);
        setShowFields(false);
      } else {
        // Success: unlock the form fields with smooth animation
        setFoundWorkspace(workspace);
        setSelectedWorkspace(workspace.id);
        setUsernameError('');
        // Delay to allow smooth transition
        setTimeout(() => setShowFields(true), 100);
      }
    } finally {
      setIsValidatingUsername(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!selectedWorkspace || !user) {
      return;
    }

    if (!requestedRole.trim()) {
      setError('Please enter your role in the company');
      return;
    }

    if (!requestJustification.trim()) {
      setError('Please provide a reason for requesting access');
      return;
    }

    setError('');
    setIsRequesting(true);

    try {
      await requestWorkspaceAccess(
        user.id,
        user.email || 'Unknown User',
        user.email || '',
        selectedWorkspace,
        requestedRole.trim(),
        requestJustification.trim()
      );
      // Reload to trigger routing logic
      window.location.reload();
    } catch (err) {
      console.error('Error requesting access:', err);
      setError('Failed to submit access request. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-3 pb-6">
          {/* Back button - top left */}
          {onBack && (
            <div className="flex items-center mb-2 animate-in slide-in-from-left-2 fade-in duration-200 ease-in-out">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="gap-2 text-muted-foreground hover:text-foreground transition-all duration-200 ease-in-out"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          )}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg mb-3">
              <Users className="w-9 h-9 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Find Company Workspace</CardTitle>
            <CardDescription className="text-base">
              Enter the company username to request access
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Privacy-First Username Lookup */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="company-username">
                Company Username
              </label>
              <div className="flex gap-2">
                <Input
                  id="company-username"
                  type="text"
                  placeholder="Enter company username"
                  className="h-11 flex-1"
                  value={companyUsername}
                  onChange={(e) => {
                    setCompanyUsername(e.target.value);
                    setUsernameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      validateUsername();
                    }
                  }}
                  disabled={isValidatingUsername || foundWorkspace !== null}
                />
                {foundWorkspace && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFoundWorkspace(null);
                      setShowFields(false);
                      setCompanyUsername('');
                      setSelectedWorkspace(null);
                      setRequestedRole('');
                      setRequestJustification('');
                    }}
                  >
                    Change
                  </Button>
                )}
                {!foundWorkspace && (
                  <Button
                    onClick={validateUsername}
                    disabled={!companyUsername.trim() || isValidatingUsername}
                    className="px-6"
                  >
                    {isValidatingUsername ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Find'
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                You must know the exact username to request access
              </p>
              {usernameError && (
                <p className="text-xs text-red-600 dark:text-red-400 transition-all duration-200 ease-in-out">
                  {usernameError}
                </p>
              )}
            </div>

            {/* Found workspace info - slides in smoothly */}
            {foundWorkspace && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300 ease-in-out">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                      {foundWorkspace.name}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Company found - complete the form below
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                </div>
              </div>
            )}
          </div>

          {/* Additional fields - slide in after username validation */}
          {showFields && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-400 ease-in-out">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="requested-role">
                  Your Role in the Company
                </label>
                <Input
                  id="requested-role"
                  type="text"
                  placeholder="e.g., Finance Manager, Accountant, CFO"
                  className="h-11"
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  disabled={isRequesting}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your job title or role within the company
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="justification">
                  Why do you need access?
                </label>
                <Textarea
                  id="justification"
                  placeholder="Explain why you need access to this workspace..."
                  className="min-h-[100px] resize-none"
                  value={requestJustification}
                  onChange={(e) => setRequestJustification(e.target.value)}
                  disabled={isRequesting}
                />
                <p className="text-xs text-muted-foreground">
                  Provide a brief explanation to help the owner review your request
                </p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedWorkspace && showFields && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 animate-in slide-in-from-bottom-2 duration-300 ease-in-out">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    What happens next?
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
                    <li>• Your request will be sent to the workspace owner</li>
                    <li>• You'll see a "Pending Approval" screen while waiting</li>
                    <li>• You'll be notified when your request is approved or denied</li>
                    <li>• Once approved, you'll have access to the company's financial data</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {selectedWorkspace && showFields && (
            <Button
              onClick={handleRequestAccess}
              className="w-full h-12 text-base"
              disabled={!selectedWorkspace || isRequesting}
            >
              {isRequesting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Request Access
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

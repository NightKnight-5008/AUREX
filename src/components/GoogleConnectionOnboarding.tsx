import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, ListTodo, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { startOAuthFlow, type GoogleServiceType } from '@/lib/google-oauth';

interface ConnectionState {
  status: 'idle' | 'loading' | 'connected' | 'error';
  errorMessage?: string;
}

interface GoogleConnectionOnboardingProps {
  onConnectionComplete: (services: {
    tasksConnected: boolean;
    calendarConnected: boolean;
    docsConnected: boolean;
  }) => void;
}

export function GoogleConnectionOnboarding({ onConnectionComplete }: GoogleConnectionOnboardingProps) {
  const [tasksState, setTasksState] = useState<ConnectionState>({ status: 'idle' });
  const [calendarState, setCalendarState] = useState<ConnectionState>({ status: 'idle' });
  const [docsState, setDocsState] = useState<ConnectionState>({ status: 'idle' });

  // Check if all services are connected
  const allServicesConnected =
    tasksState.status === 'connected' &&
    calendarState.status === 'connected' &&
    docsState.status === 'connected';

  // Real OAuth flow for a service
  const handleConnectService = async (
    serviceType: GoogleServiceType,
    setStateFunc: React.Dispatch<React.SetStateAction<ConnectionState>>
  ) => {
    // Set loading state
    setStateFunc({ status: 'loading' });

    try {
      // Start real OAuth flow
      // This will:
      // 1. Open OAuth popup window with Google's authorization page
      // 2. User authenticates with Google
      // 3. Google redirects to /auth-callback.html with authorization code
      // 4. Callback page exchanges code for access token using PKCE
      // 5. Token is stored in localStorage
      // 6. Popup closes and we get success/error via sessionStorage

      await startOAuthFlow(serviceType);

      // OAuth succeeded
      setStateFunc({ status: 'connected' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setStateFunc({
        status: 'error',
        errorMessage
      });
    }
  };

  // Handle retry after error
  const handleRetry = (
    serviceType: GoogleServiceType,
    setStateFunc: React.Dispatch<React.SetStateAction<ConnectionState>>
  ) => {
    setStateFunc({ status: 'idle' });
  };

  // Notify parent component when all services are connected
  useEffect(() => {
    if (allServicesConnected) {
      const timer = setTimeout(() => {
        onConnectionComplete({
          tasksConnected: true,
          calendarConnected: true,
          docsConnected: true,
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [allServicesConnected, onConnectionComplete]);

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6 px-4">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Connect your Google tools</CardTitle>
            <CardDescription className="text-base mt-3">
              Link your Google services so the assistant can understand your tasks, schedule, and documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Google Tasks Button */}
            <ConnectionButton
              icon={<ListTodo className="w-6 h-6" />}
              title="Connect Google Tasks"
              description="Read tasks • Read task lists"
              state={tasksState}
              onConnect={() => handleConnectService('tasks', setTasksState)}
              onRetry={() => handleRetry('tasks', setTasksState)}
            />

            {/* Google Calendar Button */}
            <ConnectionButton
              icon={<Calendar className="w-6 h-6" />}
              title="Connect Google Calendar"
              description="Read calendars • Read events"
              state={calendarState}
              onConnect={() => handleConnectService('calendar', setCalendarState)}
              onRetry={() => handleRetry('calendar', setCalendarState)}
            />

            {/* Google Docs Button */}
            <ConnectionButton
              icon={<FileText className="w-6 h-6" />}
              title="Connect Google Docs"
              description="Read document titles and content • Read document metadata"
              state={docsState}
              onConnect={() => handleConnectService('docs', setDocsState)}
              onRetry={() => handleRetry('docs', setDocsState)}
            />

            {/* Completion message */}
            {allServicesConnected && (
              <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900 dark:text-green-100 font-medium">
                  All set. Your assistant is now connected.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Privacy notice */}
        <div className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
          <p>
            We only request read permissions. Your data stays private and secure.
            You can disconnect any service at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ConnectionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: ConnectionState;
  onConnect: () => void;
  onRetry: () => void;
}

function ConnectionButton({
  icon,
  title,
  description,
  state,
  onConnect,
  onRetry,
}: ConnectionButtonProps) {
  const getButtonContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <Button
            size="lg"
            className="w-full h-auto py-6 px-6 text-left justify-start gap-4 bg-primary hover:bg-primary/90"
            onClick={onConnect}
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-2 bg-primary-foreground/10 rounded-lg">{icon}</div>
              <div className="flex-1">
                <div className="text-lg font-semibold">{title}</div>
                <div className="text-sm opacity-80 font-normal mt-1">{description}</div>
              </div>
            </div>
          </Button>
        );

      case 'loading':
        return (
          <Button
            size="lg"
            className="w-full h-auto py-6 px-6 text-left justify-start gap-4 bg-primary/70 cursor-not-allowed"
            disabled
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-2 bg-primary-foreground/10 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold">Connecting...</div>
                <div className="text-sm opacity-80 font-normal mt-1">Opening authentication window</div>
              </div>
            </div>
          </Button>
        );

      case 'connected':
        return (
          <Button
            size="lg"
            className="w-full h-auto py-6 px-6 text-left justify-start gap-4 bg-green-600 hover:bg-green-600 cursor-default"
            disabled
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold">{title.replace('Connect ', '')} Connected</div>
                <div className="text-sm opacity-80 font-normal mt-1">Successfully connected</div>
              </div>
            </div>
          </Button>
        );

      case 'error':
        return (
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-auto py-6 px-6 text-left justify-start gap-4 bg-red-600 hover:bg-red-600 cursor-default"
              disabled
            >
              <div className="flex items-center gap-4 w-full">
                <div className="p-2 bg-white/20 rounded-lg">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold">Connection Failed</div>
                  <div className="text-sm opacity-80 font-normal mt-1">
                    {state.errorMessage || 'Unable to connect'}
                  </div>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onRetry}
            >
              Try Again
            </Button>
          </div>
        );
    }
  };

  return <div>{getButtonContent()}</div>;
}

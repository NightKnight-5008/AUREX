import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessRestrictedScreenProps {
  onGoBack?: () => void;
}

/**
 * AccessRestrictedScreen - Shown when user attempts to access forbidden content
 *
 * CRITICAL: This screen is shown when permission enforcement blocks access.
 * Must be calm, professional, and non-technical.
 */
export function AccessRestrictedScreen({ onGoBack }: AccessRestrictedScreenProps) {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-amber-200 dark:border-amber-800">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">You don't have access to this section</CardTitle>
            <CardDescription className="text-base">
              Your current permissions don't include access to this feature.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              If you need access to this section, please contact your workspace administrator to request
              the necessary permissions.
            </p>
          </div>

          {onGoBack && (
            <Button
              onClick={onGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Copy,
  Check,
  Shield,
  AlertTriangle,
  RefreshCw,
  Lock,
  Download,
  Smartphone,
} from 'lucide-react';
import {
  generateSecurityPassword,
  createSecurityPasswordConfig,
  type SecurityPasswordConfig,
} from '@/lib/security-password';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SecuritySettingsProps {
  userId: string;
}

export function SecuritySettings({ userId }: SecuritySettingsProps) {
  const [securityPassword, setSecurityPassword] = useState<SecurityPasswordConfig | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [verificationPassword, setVerificationPassword] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize security password
  useEffect(() => {
    const initializeSecurity = async () => {
      const savedSecurityPassword = localStorage.getItem(`security-password-${userId}`);

      if (savedSecurityPassword) {
        setSecurityPassword(JSON.parse(savedSecurityPassword));
        setIsInitialized(true);
      } else {
        // Generate new 24-character security password
        const securityPasswordConfig = await createSecurityPasswordConfig();
        setSecurityPassword(securityPasswordConfig);

        // Save to localStorage
        localStorage.setItem(`security-password-${userId}`, JSON.stringify(securityPasswordConfig));
        setIsInitialized(true);
      }
    };

    initializeSecurity();
  }, [userId]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [key]: true });

      // Log security action
      console.log(`[SECURITY LOG] Credential copied: ${key} at ${new Date().toISOString()}`);

      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [key]: false });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRegenerateSecurityPassword = async () => {
    // Verify current security password first
    if (!securityPassword || verificationPassword !== securityPassword.password) {
      alert('❌ Invalid current security password. Cannot regenerate.');
      setVerificationPassword('');
      return;
    }

    const newPassword = generateSecurityPassword();
    const newConfig: SecurityPasswordConfig = {
      password: newPassword,
      passwordHash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newPassword))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')),
      createdAt: new Date().toISOString(),
      lastUsed: null,
      regenerationCount: (securityPassword?.regenerationCount || 0) + 1,
    };

    setSecurityPassword(newConfig);
    localStorage.setItem(`security-password-${userId}`, JSON.stringify(newConfig));

    // Log security action
    console.log(`[SECURITY LOG] Security password regenerated at ${new Date().toISOString()}`);

    setVerificationPassword('');
    alert('✅ Security password regenerated successfully! Make sure to save the new password securely.');
  };

  const handleDownloadAPK = async () => {
    try {
      // TODO: Replace with actual APK download endpoint
      const response = await fetch('/api/download-apk', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download APK');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aurex-android.apk';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`[SECURITY LOG] APK downloaded at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('APK download failed:', error);
      alert('❌ Failed to download APK. Please try again later.');
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <Shield className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Initializing security credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Warning */}
      <Alert variant="destructive" className="border-amber-500 dark:border-amber-600">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> Your 24-character security key is required to log into the Android app.
          Keep it secure and never share it with anyone.
        </AlertDescription>
      </Alert>

      {/* Security Password Section */}
      <Card className="border-2 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            24-Character Security Key
          </CardTitle>
          <CardDescription>
            Required for Android app login and sensitive operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-500 dark:border-amber-600">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> This security key is required for:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Logging into the Android app</li>
                <li>Authorizing sensitive operations</li>
                <li>Account security verification</li>
              </ul>
            </AlertDescription>
          </Alert>

          {securityPassword && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="security-password" className="text-sm font-semibold">
                  Your Security Key (24 characters)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="security-password"
                    type="text"
                    value={securityPassword.password}
                    readOnly
                    className="font-mono text-sm bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700"
                  />
                  <Button
                    onClick={() => handleCopy(securityPassword.password, 'security-password')}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    {copiedStates['security-password'] ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(securityPassword.createdAt).toLocaleString()} |
                  Regenerated {securityPassword.regenerationCount} time(s)
                </p>
              </div>

              {/* Regenerate Security Password */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Security Key
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate Security Key?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Warning:</strong> Regenerating your security key will invalidate the old key.
                            You will need to log in again on your Android app with the new key.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="verify-current-password">
                            Enter Current Security Key
                          </Label>
                          <Input
                            id="verify-current-password"
                            type="password"
                            placeholder="Enter your current 24-character security key"
                            value={verificationPassword}
                            onChange={(e) => setVerificationPassword(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setVerificationPassword('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerateSecurityPassword}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Android App Download Section */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            Android App
          </CardTitle>
          <CardDescription>
            Download and install the Android app to send SMS data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-500 dark:border-blue-600">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>How to use:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Download the APK file using the button below</li>
                <li>Install it on your Android device</li>
                <li>Log in using your email, password, and 24-character security key</li>
                <li>Create and manage semi-accounts to organize your SMS data</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleDownloadAPK}
            className="w-full"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Android APK
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

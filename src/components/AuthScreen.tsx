import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, Mail, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { isValidEmail, isValidPassword } from '@/lib/auth-utils';

export function AuthScreen() {
  const { signUp, signIn, verifyEmail, resendVerificationCode } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sign Up form state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Email verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Post-verification transition state
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');

    if (!isValidEmail(signInEmail)) {
      setSignInError('Please enter a valid email address');
      return;
    }

    if (!signInPassword) {
      setSignInError('Please enter your password');
      return;
    }

    setIsSigningIn(true);

    try {
      const result = await signIn(signInEmail, signInPassword);

      if (!result.success) {
        setSignInError(result.error || 'Sign in failed');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (!isValidEmail(signUpEmail)) {
      setSignUpError('Please enter a valid email address');
      return;
    }

    if (!isValidPassword(signUpPassword)) {
      setSignUpError('Password must be at least 8 characters long');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError('Passwords do not match');
      return;
    }

    setIsSigningUp(true);

    try {
      const result = await signUp(signUpEmail, signUpPassword);

      if (!result.success) {
        setSignUpError(result.error || 'Sign up failed');
      } else if (result.needsVerification) {
        // Show verification screen
        setVerificationEmail(signUpEmail);
        setShowVerification(true);
        setSignUpEmail('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError('');

    if (verificationCode.length !== 6) {
      setVerificationError('Please enter the 6-digit code');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyEmail(verificationEmail, verificationCode);

      if (!result.success) {
        setVerificationError(result.error || 'Verification failed');
      } else {
        // Smooth transition: Show success state briefly before routing
        setVerificationSuccess(true);
        // Auth context will update and trigger routing after transition
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationError('');
    setResendSuccess(false);
    setIsResending(true);

    try {
      const result = await resendVerificationCode(verificationEmail);

      if (!result.success) {
        setVerificationError(result.error || 'Failed to resend code');
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } finally {
      setIsResending(false);
    }
  };

  // Show success transition state after verification
  if (verificationSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900 p-4 transition-all duration-300 ease-in-out animate-in fade-in">
        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500 ease-in-out">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-90 duration-300 ease-in-out">
            <CheckCircle className="w-12 h-12 text-white animate-in zoom-in-75 duration-200 ease-in-out delay-100" />
          </div>
          <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 duration-400 ease-in-out delay-150">
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              Verification Complete
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Preparing your workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show email verification screen if needed
  if (showVerification) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4 transition-all duration-300 ease-in-out">
        <Card className="w-full max-w-md shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-400 ease-in-out">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              We sent a 6-digit code to <strong>{verificationEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyEmail} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="text-center block">
                  Enter Verification Code
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    disabled={isVerifying}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Code expires in 10 minutes
                </p>
              </div>

              {verificationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{verificationError}</AlertDescription>
                </Alert>
              )}

              {resendSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>Verification code resent successfully!</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-sm"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    "Didn't receive the code? Resend"
                  )}
                </Button>
                <div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setShowVerification(false);
                      setVerificationCode('');
                      setVerificationError('');
                    }}
                    className="text-sm"
                  >
                    Back to Sign Up
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Financial Dashboard</CardTitle>
          <CardDescription className="text-center">
            Sign in or create an account to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-9"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      disabled={isSigningIn}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-9"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      disabled={isSigningIn}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {signInError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signInError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isSigningIn}>
                  {isSigningIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-9"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      disabled={isSigningUp}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      className="pl-9"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      disabled={isSigningUp}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      className="pl-9"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      disabled={isSigningUp}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {signUpError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signUpError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isSigningUp}>
                  {isSigningUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            By signing in or creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

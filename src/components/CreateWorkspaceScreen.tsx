import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Building2, Loader2, AlertCircle, CheckCircle, Check, X, ArrowLeft } from 'lucide-react';
import {
  validateUsernameFormat,
  normalizeUsername,
  checkUsernameAvailability,
  checkNameAvailability,
  generateUsernameSuggestions,
  generateNameSuggestions,
  type UsernameSuggestion,
} from '@/lib/workspace-validation';

interface CreateWorkspaceScreenProps {
  onBack?: () => void;
}

export function CreateWorkspaceScreen({ onBack }: CreateWorkspaceScreenProps) {
  const { user } = useAuth();

  // Form state
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceUsername, setWorkspaceUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Company name validation state
  const [nameAvailability, setNameAvailability] = useState<'unknown' | 'available' | 'taken'>('unknown');
  const [nameError, setNameError] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Username validation state
  const [usernameFormatError, setUsernameFormatError] = useState('');
  const [usernameAvailability, setUsernameAvailability] = useState<'unknown' | 'available' | 'taken'>('unknown');
  const [usernameSuggestions, setUsernameSuggestions] = useState<UsernameSuggestion[]>([]);

  // Real-time username availability check (debounced)
  useEffect(() => {
    // Reset states when username changes
    setUsernameAvailability('unknown');
    setUsernameSuggestions([]);
    setUsernameFormatError('');

    if (!workspaceUsername) {
      return;
    }

    // Validate format first
    const formatValidation = validateUsernameFormat(workspaceUsername);

    if (!formatValidation.isValid) {
      setUsernameFormatError(formatValidation.error || '');
      return;
    }

    // Debounce availability check
    const timeoutId = setTimeout(() => {
      const availabilityCheck = checkUsernameAvailability(workspaceUsername);

      if (availabilityCheck.isAvailable) {
        setUsernameAvailability('available');
        setUsernameSuggestions([]);
      } else {
        setUsernameAvailability('taken');
        // Generate smart suggestions
        const suggestions = generateUsernameSuggestions(workspaceUsername);
        setUsernameSuggestions(suggestions);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [workspaceUsername]);

  // Company name availability check (on blur)
  const handleNameBlur = useCallback(() => {
    if (!workspaceName.trim()) {
      setNameAvailability('unknown');
      setNameError('');
      setNameSuggestions([]);
      return;
    }

    setIsCheckingName(true);

    // Simulate async check with smooth UX
    setTimeout(() => {
      const availabilityCheck = checkNameAvailability(workspaceName);

      if (availabilityCheck.isAvailable) {
        setNameAvailability('available');
        setNameError('');
        setNameSuggestions([]);
      } else {
        setNameAvailability('taken');
        setNameError('A company with this name already exists.');
        // Generate text suggestions
        const suggestions = generateNameSuggestions(workspaceName);
        setNameSuggestions(suggestions);
      }

      setIsCheckingName(false);
    }, 200);
  }, [workspaceName]);

  // Handle username input with auto-normalization
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeUsername(e.target.value);
    setWorkspaceUsername(normalized);
  };

  // Handle clicking a username suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setWorkspaceUsername(suggestion);
    // Focus back to input
    setTimeout(() => {
      document.getElementById('workspace-username')?.focus();
    }, 100);
  };

  // Determine if form can be submitted
  const canSubmit =
    workspaceName.trim() !== '' &&
    workspaceUsername.trim() !== '' &&
    nameAvailability === 'available' &&
    usernameAvailability === 'available' &&
    !usernameFormatError &&
    !isCreating;

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Final validation before submit
    if (!workspaceName.trim()) {
      setSubmitError('Please enter a company name');
      return;
    }

    if (!workspaceUsername.trim()) {
      setSubmitError('Please enter a company username');
      return;
    }

    if (nameAvailability !== 'available') {
      setSubmitError('Company name is not available');
      return;
    }

    if (usernameAvailability !== 'available') {
      setSubmitError('Username is not available');
      return;
    }

    if (!user) {
      setSubmitError('User not authenticated');
      return;
    }

    setIsCreating(true);

    try {
      await createWorkspace(
        user.id,
        user.email || 'Unknown User',
        user.email || '',
        workspaceName.trim(),
        workspaceUsername.trim().toLowerCase()
      );
      // Reload to trigger routing logic
      window.location.reload();
    } catch (err) {
      console.error('Error creating workspace:', err);
      setSubmitError('Failed to create company workspace. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-blue-200 dark:border-blue-800">
        {/* Back Button - CRITICAL UX FIX */}
        {onBack && (
          <div className="p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-150 ease-in-out"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        )}

        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create Company Workspace
          </CardTitle>
          <CardDescription className="text-base">
            Set up your company workspace to get started with financial management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateWorkspace} className="space-y-6">
            {/* Company Name Field */}
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-base font-semibold">
                Company Name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="workspace-name"
                  type="text"
                  placeholder="Enter your company name"
                  className="pl-11 h-12 text-base"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    setNameAvailability('unknown');
                    setNameError('');
                  }}
                  onBlur={handleNameBlur}
                  disabled={isCreating}
                  autoFocus
                />
              </div>

              {/* Company name availability feedback */}
              {isCheckingName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 transition-all duration-200 ease-in-out">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking availability...
                </p>
              )}

              {!isCheckingName && nameAvailability === 'available' && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 transition-all duration-200 ease-in-out">
                  <Check className="w-3 h-3" />
                  Company name available
                </p>
              )}

              {!isCheckingName && nameAvailability === 'taken' && (
                <div className="space-y-2 transition-all duration-200 ease-in-out">
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <X className="w-3 h-3" />
                    {nameError}
                  </p>
                  {nameSuggestions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="mb-1.5">Try adding:</p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {nameSuggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {nameAvailability === 'unknown' && workspaceName && (
                <p className="text-xs text-muted-foreground">
                  This will be the display name of your workspace
                </p>
              )}
            </div>

            {/* Company Username Field */}
            <div className="space-y-2">
              <Label htmlFor="workspace-username" className="text-base font-semibold">
                Company Username
              </Label>
              <Input
                id="workspace-username"
                type="text"
                placeholder="e.g., acme-corp"
                className="h-12 text-base font-mono"
                value={workspaceUsername}
                onChange={handleUsernameChange}
                disabled={isCreating}
              />

              {/* Username format validation */}
              {usernameFormatError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-all duration-200 ease-in-out">
                  <X className="w-3 h-3" />
                  {usernameFormatError}
                </p>
              )}

              {/* Username availability feedback - Real-time */}
              {!usernameFormatError && usernameAvailability === 'available' && workspaceUsername && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 transition-all duration-200 ease-in-out">
                  <Check className="w-3 h-3" />
                  Username available
                </p>
              )}

              {!usernameFormatError && usernameAvailability === 'taken' && (
                <div className="space-y-2 transition-all duration-200 ease-in-out">
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    This username is already taken
                  </p>

                  {/* Clickable suggestion chips */}
                  {usernameSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {usernameSuggestions.map((suggestion, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all duration-150 ease-in-out"
                            onClick={() => handleSuggestionClick(suggestion.value)}
                          >
                            {suggestion.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!usernameFormatError && usernameAvailability === 'unknown' && workspaceUsername && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 transition-all duration-200 ease-in-out">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking availability...
                </p>
              )}

              {/* Help text - always shown when no errors */}
              {!workspaceUsername && (
                <p className="text-xs text-muted-foreground mt-1">
                  This username is what your team will use to request access. Only lowercase letters, numbers, hyphens, and underscores allowed (3-32 characters).
                </p>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Info banner */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    What happens next?
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
                    <li>• You'll be set as the workspace owner</li>
                    <li>• You'll have full access to all features</li>
                    <li>• You can invite team members later</li>
                    <li>• Your financial data will be secure and encrypted</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit button - disabled when validation fails */}
            <Button
              type="submit"
              className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              disabled={!canSubmit}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-5 w-5" />
                  Create Workspace
                </>
              )}
            </Button>

            {/* Gating explanation when button is disabled */}
            {!canSubmit && !isCreating && workspaceName && workspaceUsername && (
              <p className="text-xs text-center text-muted-foreground">
                {nameAvailability !== 'available' && 'Company name must be available'}
                {nameAvailability === 'available' && usernameAvailability !== 'available' && 'Username must be available'}
                {nameAvailability === 'available' && usernameAvailability === 'available' && usernameFormatError && 'Fix username format errors'}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

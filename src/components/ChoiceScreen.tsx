import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, ArrowRight, CheckCircle } from 'lucide-react';

interface ChoiceScreenProps {
  onCreateWorkspace: () => void;
  onRequestAccess: () => void;
}

/**
 * ChoiceScreen - Explicit user onboarding choice
 *
 * NON-NEGOTIABLE: Every user must consciously choose their path
 * - No default selection
 * - No auto-redirect
 * - Two equal primary options
 */
export function ChoiceScreen({ onCreateWorkspace, onRequestAccess }: ChoiceScreenProps) {
  const [selectedOption, setSelectedOption] = useState<'create' | 'request' | null>(null);

  const handleContinue = () => {
    if (selectedOption === 'create') {
      onCreateWorkspace();
    } else if (selectedOption === 'request') {
      onRequestAccess();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <Building2 className="w-11 h-11 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome to AUREX
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise financial management platform. Choose how you'd like to continue:
            </p>
          </div>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Option A: Create Workspace */}
          <button
            onClick={() => setSelectedOption('create')}
            className={`text-left transition-all duration-200 ${
              selectedOption === 'create'
                ? 'scale-105'
                : selectedOption === 'request'
                  ? 'opacity-60 scale-95'
                  : 'hover:scale-102'
            }`}
          >
            <Card
              className={`h-full border-2 transition-all duration-200 ${
                selectedOption === 'create'
                  ? 'border-blue-500 shadow-xl shadow-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <CardHeader className="space-y-4 pb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">Create a Company Workspace</CardTitle>
                  <CardDescription className="text-base">
                    You'll be the owner and manage access for your organization
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    What you'll get:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Full administrative control as workspace owner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Manage team access requests and permissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Complete financial management for your company</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Enterprise-grade security and audit logs</span>
                    </li>
                  </ul>
                </div>
                {selectedOption === 'create' && (
                  <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Selected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </button>

          {/* Option B: Request Access */}
          <button
            onClick={() => setSelectedOption('request')}
            className={`text-left transition-all duration-200 ${
              selectedOption === 'request'
                ? 'scale-105'
                : selectedOption === 'create'
                  ? 'opacity-60 scale-95'
                  : 'hover:scale-102'
            }`}
          >
            <Card
              className={`h-full border-2 transition-all duration-200 ${
                selectedOption === 'request'
                  ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              <CardHeader className="space-y-4 pb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">Request Access to a Company</CardTitle>
                  <CardDescription className="text-base">
                    Join an existing company by requesting approval
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    How it works:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Select your company from available workspaces</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Submit access request with your role and details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Workspace owner reviews and approves your request</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>Get role-based access to company financials</span>
                    </li>
                  </ul>
                </div>
                {selectedOption === 'request' && (
                  <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Selected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </button>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedOption}
            size="lg"
            className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {selectedOption ? (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            ) : (
              'Select an option to continue'
            )}
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground">
          {!selectedOption ? (
            'Please select one of the options above to proceed'
          ) : selectedOption === 'create' ? (
            "You'll set up your company workspace and become the owner"
          ) : (
            "You'll request access to an existing company workspace"
          )}
        </p>
      </div>
    </div>
  );
}

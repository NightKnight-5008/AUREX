import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        // Check if Supabase is configured
        if (!supabase) {
          console.warn('Supabase is not configured, redirecting to home');
          window.location.href = '/';
          return;
        }

        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          // Redirect to home with error
          window.location.href = '/';
          return;
        }

        if (data.session) {
          // Successfully authenticated, redirect to home
          window.location.href = '/';
        } else {
          // No session, redirect to home
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        window.location.href = '/';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Completing sign in...</p>
      </div>
    </div>
  );
}

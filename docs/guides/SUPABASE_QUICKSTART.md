# Supabase Integration - Quick Start Guide

This guide provides a quick overview of the Supabase integration with Google OAuth authentication.

## What's Been Added

1. **Supabase Client** (`src/lib/supabase.ts`)
   - Configured Supabase client with auth settings
   - Auto-refresh tokens
   - Session persistence

2. **Supabase Auth Context** (`src/contexts/supabase-auth-context.tsx`)
   - React context for Supabase authentication
   - Hooks for sign in/up/out
   - Google OAuth integration

3. **Supabase Auth Screen** (`src/components/SupabaseAuthScreen.tsx`)
   - Beautiful login/signup UI
   - Google OAuth button
   - Email/password authentication
   - Form validation

4. **OAuth Callback Handler** (`src/routes/auth/callback.tsx`)
   - Handles Google OAuth redirects
   - Manages session creation

5. **Alternative Entry Point** (`src/main-supabase.tsx`)
   - Drop-in replacement for main.tsx
   - Uses Supabase auth instead of local auth

## Quick Setup (5 minutes)

### 1. Create Supabase Project

```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Name: AUREX
# Choose a region
# Set a database password
# Click "Create new project"
```

### 2. Get Credentials

```bash
# In Supabase Dashboard:
# Settings → API
# Copy:
# - Project URL
# - Anon/Public Key
```

### 3. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit .env and add:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set Up Google OAuth

#### 4.1 Google Cloud Console

```bash
# Go to: https://console.cloud.google.com/
# Create project or select existing
# APIs & Services → Credentials
# Create OAuth client ID
# Application type: Web application
# Authorized redirect URIs:
https://your-project.supabase.co/auth/v1/callback

# Copy Client ID and Client Secret
```

#### 4.2 Supabase Dashboard

```bash
# In Supabase: Authentication → Providers
# Enable Google
# Paste Client ID and Client Secret
# Save
```

### 5. Configure Redirect URLs

```bash
# In Supabase: Authentication → URL Configuration
# Add to Redirect URLs:
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

### 6. Switch to Supabase Auth (Optional)

**Option A: Update vite.config.ts**

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  build: {
    rollupOptions: {
      input: {
        main: './src/main-supabase.tsx', // Changed from main.tsx
      },
    },
  },
});
```

**Option B: Rename files**

```bash
mv src/main.tsx src/main-local.tsx.backup
mv src/main-supabase.tsx src/main.tsx
```

**Option C: Update manually**

Update `src/routes/index.tsx`:

```typescript
// Replace
import { useAuth } from '@/contexts/auth-context';
import { AuthScreen } from '@/components/AuthScreen';

// With
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';
import { SupabaseAuthScreen } from '@/components/SupabaseAuthScreen';

// Update in component
const { isAuthenticated, isLoading } = useSupabaseAuth();

if (!isAuthenticated) {
  return <SupabaseAuthScreen />;
}
```

### 7. Test It

```bash
npm run dev

# Open http://localhost:3000
# Click "Continue with Google"
# Authorize with your Google account
# You should be redirected back and logged in
```

## Features

### Google OAuth
- One-click sign in with Google
- No password required
- Secure OAuth 2.0 flow

### Email/Password
- Traditional email/password authentication
- Email verification
- Password reset (configure in Supabase)

### Session Management
- Auto-refresh tokens
- Persistent sessions across browser restarts
- Secure session storage

## API Reference

### useSupabaseAuth Hook

```typescript
const {
  user,          // Current user object
  session,       // Current session
  isAuthenticated, // Boolean: is user logged in
  isLoading,     // Boolean: is auth loading
  signInWithGoogle, // Function: Google OAuth
  signInWithEmail, // Function: Email/password sign in
  signUpWithEmail, // Function: Email/password sign up
  signOut,       // Function: Sign out
} = useSupabaseAuth();
```

### Example Usage

```typescript
// Sign in with Google
const handleGoogleSignIn = async () => {
  const { error } = await signInWithGoogle();
  if (error) {
    console.error('Google sign in failed:', error);
  }
};

// Sign in with email
const handleEmailSignIn = async (email: string, password: string) => {
  const { error } = await signInWithEmail(email, password);
  if (error) {
    console.error('Sign in failed:', error);
  }
};

// Sign out
const handleSignOut = async () => {
  const { error } = await signOut();
  if (error) {
    console.error('Sign out failed:', error);
  }
};
```

## Database Schema

### Auto-Created Tables

Supabase automatically creates:
- `auth.users` - User authentication data
- `auth.sessions` - Active sessions
- `auth.refresh_tokens` - Refresh tokens

### Extend with Custom Tables

```sql
-- Create a public users table for additional user data
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  full_name text,
  avatar_url text
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Allow users to read their own data
create policy "Users can view own data"
  on public.users for select
  using (auth.uid() = id);

-- Allow users to update their own data
create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);
```

## Security Best Practices

1. **Never commit .env files**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use Row Level Security**
   - Enable RLS on all tables
   - Create policies for data access

3. **Rotate secrets regularly**
   - Change Supabase keys periodically
   - Update OAuth credentials

4. **Use HTTPS in production**
   - Always use HTTPS for OAuth
   - Configure SSL certificates

5. **Validate user input**
   - Sanitize all user data
   - Use Supabase validation

## Troubleshooting

### "Invalid redirect URL"
- Check Google OAuth redirect URIs
- Verify Supabase URL configuration
- Ensure domains match exactly

### "Failed to sign in with Google"
- Verify Google OAuth credentials in Supabase
- Check OAuth consent screen is published
- Clear browser cache and try again

### "Session not found"
- Clear browser cookies
- Check browser console for errors
- Verify callback route is working

### Email verification not working
- Check Supabase email templates
- Look in spam folder
- Disable email confirmation for testing

## Next Steps

1. **Set up database tables** for your application data
2. **Configure Row Level Security** policies
3. **Add Supabase Storage** for file uploads
4. **Enable Realtime** for live updates
5. **Create Supabase Functions** for serverless backend

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Full Setup Guide](./SUPABASE_SETUP.md)

## Support

Need help? Check out:
- [Supabase Discord](https://discord.supabase.com/)
- [Supabase GitHub](https://github.com/supabase/supabase)
- Application documentation

---

**Status**: ✅ Integration Complete and Ready to Use

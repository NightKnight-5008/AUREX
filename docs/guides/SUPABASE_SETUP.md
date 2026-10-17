# Supabase Integration Setup Guide

This guide will help you integrate Supabase backend with Google OAuth authentication into your AUREX application.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Google Cloud Console project for OAuth
3. Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in your project details:
   - **Name**: AUREX (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://your-project.supabase.co`)
   - **Anon/Public Key** (starts with `your-anon-key-here`)

## Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Set Up Google OAuth

### 4.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: AUREX
   - User support email: Your email
   - Developer contact: Your email
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: AUREX Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
7. Click **Create** and copy your:
   - **Client ID**
   - **Client Secret**

### 4.2 Configure Google OAuth in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list and click to expand
3. Enable Google provider
4. Paste your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
5. Click **Save**

## Step 5: Configure Redirect URLs

### 5.1 In Supabase

1. Go to **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://your-production-domain.com/auth/callback` (for production)
3. Click **Save**

### 5.2 In Your Application

Update your `.env` file if you need a custom redirect URL:
```env
VITE_SUPABASE_REDIRECT_URL=http://localhost:3000
```

## Step 6: Set Up Database Schema

Supabase automatically creates an `auth.users` table for authentication. You can extend it with custom fields or create related tables.

### Optional: Create a Public Users Table

Run this SQL in the Supabase SQL Editor (**Database** → **SQL Editor**):

```sql
-- Create a public users table that mirrors auth.users
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email_verified boolean default false,
  language text default 'en'
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Create a policy that allows users to read their own data
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

-- Create a policy that allows users to update their own data
create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, email_verified)
  values (new.id, new.email, new.email_confirmed);
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to automatically create a public user when auth user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Step 7: Update Your Application Code

### 7.1 Use Supabase Authentication

Update your main route file to use Supabase authentication:

```tsx
// src/routes/index.tsx
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';
import { SupabaseAuthScreen } from '@/components/SupabaseAuthScreen';

function App() {
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <SupabaseAuthScreen />;
  }

  // Your main app code...
}
```

### 7.2 Wrap Your App with Supabase Auth Provider

Update your root component:

```tsx
// src/main.tsx or src/App.tsx
import { SupabaseAuthProvider } from '@/contexts/supabase-auth-context';

function Root() {
  return (
    <SupabaseAuthProvider>
      <App />
    </SupabaseAuthProvider>
  );
}
```

## Step 8: Test the Integration

### 8.1 Start Your Development Server

```bash
npm run dev
```

### 8.2 Test Google OAuth

1. Open http://localhost:3000
2. Click "Continue with Google"
3. You should be redirected to Google's OAuth consent screen
4. After authorizing, you should be redirected back to your app at `/auth/callback`
5. Then automatically redirected to the main app

### 8.3 Test Email/Password Authentication

1. Try creating an account with email/password
2. Check your email for the verification link
3. Click the verification link
4. You should be authenticated and redirected to the app

## Step 9: Production Deployment

### 9.1 Update Environment Variables

Set your production environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_SUPABASE_REDIRECT_URL=https://your-production-domain.com
```

### 9.2 Update Google OAuth Redirect URIs

Add your production domain to:
1. Google Cloud Console → OAuth client → Authorized redirect URIs
2. Supabase → Authentication → URL Configuration → Redirect URLs

### 9.3 Deploy Your Application

Build and deploy your application as usual:

```bash
npm run build
# Deploy the dist folder to your hosting provider
```

## Troubleshooting

### Issue: "Invalid redirect URL"

**Solution**: Make sure your redirect URL is added to both:
- Google Cloud Console → OAuth credentials → Authorized redirect URIs
- Supabase → Authentication → URL Configuration

### Issue: "Failed to sign in with Google"

**Solution**:
1. Check that your Google OAuth credentials are correctly configured in Supabase
2. Ensure your Google OAuth consent screen is published
3. Verify that the authorized JavaScript origins include your domain

### Issue: "Session not found after OAuth redirect"

**Solution**:
1. Clear your browser cache and cookies
2. Make sure cookies are enabled
3. Check browser console for errors
4. Verify that the callback route is working correctly

### Issue: Email verification not working

**Solution**:
1. Go to Supabase → Authentication → Email Templates
2. Make sure email confirmation is enabled
3. Check your spam folder
4. For development, you can disable email confirmation temporarily

## Security Best Practices

1. **Never commit `.env` to version control** - It contains sensitive keys
2. **Use Row Level Security (RLS)** - Enable RLS on all your tables
3. **Rotate secrets regularly** - Change your Supabase keys periodically
4. **Use HTTPS in production** - Always use HTTPS for OAuth redirects
5. **Validate user input** - Always validate and sanitize user data on the backend
6. **Set up rate limiting** - Configure rate limits in Supabase to prevent abuse

## Next Steps

1. **Set up database tables** for your application data (workspaces, cards, transactions, etc.)
2. **Configure Row Level Security policies** to protect user data
3. **Set up Supabase Storage** if you need file uploads
4. **Configure Supabase Realtime** for real-time features
5. **Set up Supabase Functions** for serverless backend logic

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React Query with Supabase](https://supabase.com/docs/guides/auth/auth-helpers/react)

## Support

If you encounter any issues:
1. Check the [Supabase Discord](https://discord.supabase.com/)
2. Review [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
3. Consult the application documentation

---

**Note**: This integration maintains compatibility with the existing local authentication system. You can gradually migrate users or run both systems in parallel during the transition period.

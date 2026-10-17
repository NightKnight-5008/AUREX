# Migration Guide: Local Auth → Supabase Auth

This guide helps you migrate from the existing local authentication system to Supabase authentication with Google OAuth.

## Overview

The integration supports three migration strategies:

1. **Clean Switch** - Replace local auth entirely (recommended for new projects)
2. **Gradual Migration** - Run both systems in parallel
3. **Hybrid Approach** - Keep local auth as fallback

## Strategy 1: Clean Switch (Recommended)

### Prerequisites
- [ ] Supabase project created
- [ ] Google OAuth configured
- [ ] Environment variables set
- [ ] No active users yet (or users can re-register)

### Steps

#### 1. Backup Current Auth
```bash
# Backup current entry point
cp src/main.tsx src/main-local-backup.tsx

# Backup current auth components (optional)
mkdir -p src/backup
cp src/contexts/auth-context.tsx src/backup/
cp src/components/AuthScreen.tsx src/backup/
```

#### 2. Switch Entry Points
```bash
# Replace main entry point
mv src/main.tsx src/main-local.tsx
mv src/main-supabase.tsx src/main.tsx
```

#### 3. Update Routes
Edit `src/routes/index.tsx`:

```typescript
// Remove
import { useAuth } from '@/contexts/auth-context';
import { AuthScreen } from '@/components/AuthScreen';

// Add
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';
import { SupabaseAuthScreen } from '@/components/SupabaseAuthScreen';

// Update in App component
function App() {
  const { isAuthenticated, isLoading, user } = useSupabaseAuth();

  // ... rest of your code

  if (!isAuthenticated) {
    return <SupabaseAuthScreen />;
  }

  // ... main app
}
```

#### 4. Test Thoroughly
```bash
# Clear browser storage
# Open Dev Tools → Application → Clear storage

# Restart dev server
npm run dev

# Test:
# - Google OAuth sign in
# - Email/password sign up
# - Email/password sign in
# - Sign out
# - Session persistence (refresh page)
```

#### 5. Deploy
```bash
# Build for production
npm run build

# Deploy to your hosting provider
# Set production environment variables
```

## Strategy 2: Gradual Migration

### Use Case
- Existing users that need to be migrated
- Need to maintain backward compatibility
- Testing Supabase before full commitment

### Implementation

#### 1. Keep Both Systems
Don't delete any existing auth files. Add Supabase alongside.

#### 2. Add Feature Flag
Create `src/lib/feature-flags.ts`:

```typescript
export const useSupabaseAuth =
  import.meta.env.VITE_USE_SUPABASE_AUTH === 'true';
```

Update `.env`:
```env
VITE_USE_SUPABASE_AUTH=false  # Use local auth
# VITE_USE_SUPABASE_AUTH=true  # Use Supabase auth
```

#### 3. Conditional Auth Provider
Update `src/main.tsx`:

```typescript
import { useSupabaseAuth as useSupabaseAuthFlag } from '@/lib/feature-flags';
import { AuthProvider } from '@/contexts/auth-context';
import { SupabaseAuthProvider } from '@/contexts/supabase-auth-context';

function Root() {
  const AuthProviderComponent = useSupabaseAuthFlag
    ? SupabaseAuthProvider
    : AuthProvider;

  return (
    <AuthProviderComponent>
      <App />
    </AuthProviderComponent>
  );
}
```

#### 4. Conditional Auth Screen
Update `src/routes/index.tsx`:

```typescript
import { useSupabaseAuth as useSupabaseAuthFlag } from '@/lib/feature-flags';
import { useAuth } from '@/contexts/auth-context';
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';
import { AuthScreen } from '@/components/AuthScreen';
import { SupabaseAuthScreen } from '@/components/SupabaseAuthScreen';

function App() {
  const useSupabase = useSupabaseAuthFlag;

  const localAuth = useAuth();
  const supabaseAuth = useSupabaseAuth();

  const { isAuthenticated, isLoading } = useSupabase
    ? supabaseAuth
    : localAuth;

  if (!isAuthenticated) {
    return useSupabase ? <SupabaseAuthScreen /> : <AuthScreen />;
  }

  // ... main app
}
```

#### 5. Migrate Users Gradually
```typescript
// Example migration function
async function migrateUserToSupabase(localUser) {
  // 1. Create Supabase account
  const { data, error } = await supabase.auth.signUp({
    email: localUser.email,
    password: generateTemporaryPassword(),
  });

  if (error) {
    console.error('Migration failed:', error);
    return;
  }

  // 2. Send password reset email
  await supabase.auth.resetPasswordForEmail(localUser.email);

  // 3. Copy user data to Supabase tables
  await supabase.from('users').insert({
    id: data.user.id,
    email: localUser.email,
    // ... other fields
  });

  // 4. Mark user as migrated in local storage
  markUserAsMigrated(localUser.id);
}
```

## Strategy 3: Hybrid Approach

### Use Case
- Want Supabase for new users only
- Keep local auth as fallback
- Maximum flexibility

### Implementation

#### 1. Create Unified Auth Hook
Create `src/hooks/use-unified-auth.ts`:

```typescript
import { useAuth } from '@/contexts/auth-context';
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';

export function useUnifiedAuth() {
  const localAuth = useAuth();
  const supabaseAuth = useSupabaseAuth();

  // Prefer Supabase if user is authenticated there
  if (supabaseAuth.isAuthenticated) {
    return {
      ...supabaseAuth,
      provider: 'supabase' as const,
    };
  }

  // Fall back to local auth
  return {
    ...localAuth,
    provider: 'local' as const,
  };
}
```

#### 2. Use Unified Hook
Update `src/routes/index.tsx`:

```typescript
import { useUnifiedAuth } from '@/hooks/use-unified-auth';

function App() {
  const { isAuthenticated, isLoading, provider } = useUnifiedAuth();

  console.log('Auth provider:', provider);

  if (!isAuthenticated) {
    // Show both auth options
    return <CombinedAuthScreen />;
  }

  // ... main app
}
```

#### 3. Create Combined Auth Screen
Create `src/components/CombinedAuthScreen.tsx`:

```typescript
export function CombinedAuthScreen() {
  const [mode, setMode] = useState<'supabase' | 'local'>('supabase');

  return (
    <div>
      <Tabs value={mode} onValueChange={setMode}>
        <TabsList>
          <TabsTrigger value="supabase">Supabase Auth</TabsTrigger>
          <TabsTrigger value="local">Local Auth</TabsTrigger>
        </TabsList>

        <TabsContent value="supabase">
          <SupabaseAuthScreen />
        </TabsContent>

        <TabsContent value="local">
          <AuthScreen />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Data Migration

### User Data
If you have existing user data in local storage, you'll need to migrate it to Supabase.

#### 1. Export Local Users
```typescript
// src/scripts/export-users.ts
import { getAllUsers } from '@/lib/local-user-storage';

function exportUsers() {
  const users = getAllUsers();
  const exportData = users.map(user => ({
    email: user.email,
    created_at: user.createdAt,
    email_verified: user.email_verified,
  }));

  console.log(JSON.stringify(exportData, null, 2));
  // Copy output to a file
}

exportUsers();
```

#### 2. Import to Supabase
Run this SQL in Supabase SQL Editor:

```sql
-- Prepare user data
INSERT INTO auth.users (email, email_confirmed_at, created_at)
SELECT
  email,
  CASE WHEN email_verified THEN NOW() ELSE NULL END,
  created_at::timestamp
FROM json_to_recordset('[
  {"email": "user1@example.com", "email_verified": true, "created_at": "2024-01-01"},
  {"email": "user2@example.com", "email_verified": true, "created_at": "2024-01-02"}
]'::json) AS t(email text, email_verified boolean, created_at text);
```

#### 3. Send Password Reset Emails
```typescript
// Send password reset to all migrated users
const users = await supabase.auth.admin.listUsers();

for (const user of users.data.users) {
  await supabase.auth.resetPasswordForEmail(user.email);
}
```

## Rollback Plan

If you need to roll back to local auth:

### Quick Rollback
```bash
# Restore backup entry point
mv src/main-local-backup.tsx src/main.tsx

# Restart dev server
npm run dev
```

### Full Rollback
```bash
# 1. Restore all backups
cp src/backup/* src/

# 2. Revert route changes
git checkout src/routes/index.tsx

# 3. Remove Supabase files (optional)
rm src/lib/supabase.ts
rm src/contexts/supabase-auth-context.tsx
rm src/components/SupabaseAuthScreen.tsx
rm src/routes/auth/callback.tsx

# 4. Uninstall Supabase (optional)
npm uninstall @supabase/supabase-js

# 5. Clear environment variables
# Remove VITE_SUPABASE_* from .env

# 6. Restart
npm run dev
```

## Testing Checklist

### Pre-Migration Testing
- [ ] Backup all data
- [ ] Document current auth flow
- [ ] Export user list
- [ ] Test local auth works
- [ ] Create rollback plan

### Post-Migration Testing
- [ ] Google OAuth sign in works
- [ ] Email sign up works
- [ ] Email sign in works
- [ ] Email verification works
- [ ] Sign out works
- [ ] Session persists on refresh
- [ ] Mobile responsive
- [ ] Error messages clear
- [ ] Loading states correct
- [ ] Production build works

### User Acceptance Testing
- [ ] Create new account
- [ ] Sign in with Google
- [ ] Sign in with email
- [ ] Access all features
- [ ] Sign out and back in
- [ ] Test on mobile
- [ ] Test on different browsers

## Common Issues

### Issue: "Users can't sign in after migration"
**Solution**: Make sure you've sent password reset emails to all migrated users.

### Issue: "Google OAuth redirects to wrong URL"
**Solution**: Check redirect URIs in both Google Console and Supabase match exactly.

### Issue: "Local storage not clearing"
**Solution**: Clear browser storage manually or add cleanup code:
```typescript
localStorage.clear();
sessionStorage.clear();
```

### Issue: "Session not persisting"
**Solution**: Check that cookies are enabled and localStorage is working.

## Timeline Estimation

### Clean Switch
- Setup: 30 minutes
- Testing: 1-2 hours
- Deployment: 30 minutes
- **Total: 2-3 hours**

### Gradual Migration
- Setup: 1-2 hours
- User migration: Varies
- Testing: 2-4 hours
- Deployment: 1 hour
- **Total: 1-2 days**

### Hybrid Approach
- Setup: 2-3 hours
- Implementation: 4-6 hours
- Testing: 2-4 hours
- Deployment: 1 hour
- **Total: 2-3 days**

## Success Criteria

✅ All users can authenticate
✅ No data loss
✅ Google OAuth works
✅ Email auth works
✅ Sessions persist
✅ No console errors
✅ Production build passes
✅ Rollback plan tested

## Support

Need help with migration?

1. Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for setup issues
2. Check [SUPABASE_QUICKSTART.md](./SUPABASE_QUICKSTART.md) for quick reference
3. Join [Supabase Discord](https://discord.supabase.com/)
4. Review [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

---

**Remember**: Always test in a development environment first, have a rollback plan, and communicate changes to your users.

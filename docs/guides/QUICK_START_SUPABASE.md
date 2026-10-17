# AUREX Supabase Quick Start Guide

## ✅ What's Already Done

Your Supabase database is fully configured and ready to use:
- 15 production tables created
- Row Level Security (RLS) enabled
- All indexes and triggers configured
- TypeScript types generated
- Environment files updated

## 🚀 Get Started in 3 Steps

### Step 1: Install Supabase Client

**Frontend (React)**:
```bash
npm install @supabase/supabase-js
```

**Android (Kotlin)** - Add to `and-app/app/build.gradle.kts`:
```kotlin
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:auth-kt:2.0.0")
}
```

### Step 2: Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/your-project-ref/settings/database
2. Click "Reset Database Password" or copy existing password
3. Update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Step 3: Test Connection

**Frontend Test**:
```typescript
import { supabase } from './lib/supabase';

// Test connection
const { data, error } = await supabase
  .from('users')
  .select('count');

console.log('Connected!', data);
```

**Backend Test**:
```bash
cd backend
npm start
# Check logs for "Database connected"
```

## 📱 Platform-Specific Setup

### Web Frontend (React/Vite)

**Already configured in `.env.local`**:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-herezI1NiIsInR5cCI6IkpXVCJ9...
```

**Usage** (`src/lib/supabase.ts` already created):
```typescript
import { supabase, supabaseHelpers } from './lib/supabase';

// Get user cards
const cards = await supabaseHelpers.getUserCards(userId);

// Create transaction
await supabase.from('transactions').insert({
  user_id: userId,
  amount: 100.50,
  description: 'Purchase',
});
```

### Android App (Kotlin)

**Already configured in `and-app/app/src/main/res/values/supabase_config.xml`**

**Initialize in `AurexApplication.kt`**:
```kotlin
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

class AurexApplication : Application() {
    companion object {
        lateinit var supabase: SupabaseClient
    }

    override fun onCreate() {
        super.onCreate()
        
        supabase = createSupabaseClient(
            supabaseUrl = getString(R.string.supabase_url),
            supabaseKey = getString(R.string.supabase_anon_key)
        ) {
            install(Postgrest)
            install(Realtime)
        }
    }
}
```

**Usage**:
```kotlin
// Insert SMS log
AurexApplication.supabase.from("sms_logs").insert(mapOf(
    "user_id" to userId,
    "sender" to sender,
    "content" to content,
    "sms_hash" to hash
))

// Query data
val cards = AurexApplication.supabase
    .from("credit_cards")
    .select()
    .eq("user_id", userId)
    .decodeList<CreditCard>()
```

### Desktop App (Electron)

**Create `desktop/src/lib/supabase-config.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/database.types';

export const supabase = createClient<Database>(
  'https://your-project-ref.supabase.co',
  'your-anon-key-herezI1NiIsInR5cCI6IkpXVCJ9...'
);
```

## 🔐 Authentication Flow

### User Registration
```typescript
// Frontend
const { data, error } = await supabase.from('users').insert({
  email: 'user@example.com',
  password_hash: await hashPassword(password),
  email_verified: false,
});
```

### User Login
```typescript
// Query user
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
  .single();

// Verify password (use bcrypt)
const isValid = await comparePassword(password, user.password_hash);

// Generate JWT token
const token = generateJWT(user.id);

// Update auth token
await supabase
  .from('users')
  .update({ 
    auth_token: token,
    token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })
  .eq('id', user.id);
```

### Android Device Authentication
```kotlin
// Device verification
val result = supabase.from("security_credentials").insert(mapOf(
    "user_id" to userId,
    "device_id" to deviceId,
    "device_token" to token,
    "workspace_username" to username,
    "is_verified" to true
))
```

## 📊 Common Operations

### Create Credit Card
```typescript
await supabase.from('credit_cards').insert({
  user_id: userId,
  alias_name: 'Chase Sapphire',
  last_four_digits: '1234',
  card_network: 'Visa',
  limit_amount: 10000,
  current_balance: 2500,
});
```

### Log SMS Message
```typescript
await supabase.from('sms_logs').insert({
  user_id: userId,
  sender: 'BANK',
  content: encryptedContent,
  sms_hash: sha256Hash,
  received_at: new Date().toISOString(),
  processed: false,
});
```

### Create Transaction
```typescript
await supabase.from('transactions').insert({
  user_id: userId,
  card_id: cardId,
  transaction_type: 'debit',
  amount: 45.99,
  description: 'Coffee Shop',
  category: 'Food & Dining',
  transaction_date: new Date().toISOString(),
});
```

### Real-time Subscriptions
```typescript
// Listen for new transactions
supabase
  .channel('transactions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'transactions',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    console.log('New transaction:', payload.new);
    // Update UI
  })
  .subscribe();
```

## 🔧 Development Commands

```bash
# Sync migrations from Supabase
npx supabase migration fetch --yes

# Generate TypeScript types
npx supabase gen types --linked > src/types/database.types.ts

# View local migrations
ls supabase/migrations/

# Start local Supabase (optional)
npx supabase start

# Stop local Supabase
npx supabase stop
```

## 📚 Database Schema Reference

### Core Tables
- `users` - User accounts and authentication
- `credit_cards` - Credit card portfolio
- `transactions` - Financial transactions
- `sms_logs` - Bank SMS messages
- `user_settings` - User preferences
- `semi_accounts` - Android SMS collection accounts
- `security_credentials` - Device authentication
- `payment_reminders` - Payment reminders
- `licenses` - Desktop app licensing
- `financial_stress_index` - Financial health metrics

### Key Relationships
- `credit_cards.user_id` → `users.id`
- `transactions.user_id` → `users.id`
- `transactions.card_id` → `credit_cards.id`
- `sms_logs.user_id` → `users.id`
- `payment_reminders.card_id` → `credit_cards.id`

## 🛡️ Security Features

- ✅ Row Level Security (RLS) on all tables
- ✅ Users can only access their own data
- ✅ Automatic audit logging for card changes
- ✅ Email validation on registration
- ✅ Encrypted phone numbers in reminders
- ✅ Device-based authentication for Android

## 📖 Full Documentation

See `SUPABASE_SETUP_COMPLETE.md` for complete documentation including:
- Detailed schema information
- Security best practices
- Troubleshooting guide
- API examples for all platforms

## 🆘 Need Help?

- **Supabase Dashboard**: https://supabase.com/dashboard/project/your-project-ref
- **Supabase Docs**: https://supabase.com/docs
- **TypeScript Types**: `src/types/database.types.ts`
- **Migrations**: `supabase/migrations/`

---

**Your database is production-ready!** Start building your app now. 🚀

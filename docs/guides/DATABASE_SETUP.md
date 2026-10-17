# Database Setup Guide

## Overview

This guide covers setting up the AUREX PostgreSQL database with Supabase (recommended), local PostgreSQL, or Docker.

---

## Option 1: Supabase (Recommended)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - Name: aurex-db (or your preferred name)
   - Database Password: Create a strong password (save it!)
   - Region: Choose closest to you
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

### Step 2: Get Database URL

1. In your Supabase dashboard, click Settings (gear icon on left)
2. Click Database
3. Scroll to Connection string
4. Select URI tab
5. Copy the connection string

It looks like:
```
postgresql://postgres.xxxxxxxxxxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### Step 3: Configure Backend

```bash
# Edit backend/.env
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=your_random_secret_here_change_this
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_character_key_here_12345
```

### Step 4: Initialize Database

```bash
cd backend
npm start
```

The server will automatically create all tables on first run!

### Step 5: Verify

- Open http://localhost:3001/health
- Should see: {"status":"ok","timestamp":"..."}

---

## Option 2: Local PostgreSQL

### Installation

1. Download PostgreSQL from https://www.postgresql.org/download/
2. Run the installer
3. Remember the password you set for postgres user
4. Default port: 5432 (keep it)
5. Install pgAdmin (recommended)

### Create Database

```bash
# Open Command Prompt or PowerShell
psql -U postgres
# Enter your password when prompted

# Create database
CREATE DATABASE aurex_db;

# Exit
\q
```

### Configure Backend

```bash
# Edit backend/.env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/aurex_db
JWT_SECRET=your_random_secret_here_change_this
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_character_key_here_12345
```

### Initialize Schema

```bash
# Option A: Let server create tables
cd backend
npm start

# Option B: Run migration manually
psql -U postgres -d aurex_db -f migrations/001_initial_schema.sql
```

---

## Option 3: Docker PostgreSQL

If you have Docker installed:

```bash
# Run PostgreSQL in Docker
docker run --name aurex-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=aurex_db \
  -p 5432:5432 \
  -d postgres:15

# Configure backend/.env
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/aurex_db
```

---

## Database Schema

The database contains 11 tables:

| Table | Description |
|-------|-------------|
| users | User accounts with email, phone, passwords |
| credit_cards | Credit/debit cards with limits and balances |
| transactions | Financial transactions linked to cards |
| sms_logs | Bank SMS messages |
| user_settings | User preferences (country, currency, language, theme) |
| semi_accounts | Phone number accounts for SMS collection |
| security_credentials | Security passwords |
| encryption_keys | Encryption keys |
| card_field_change_history | Card change tracking |
| card_reliability_metadata | Card reliability scores |
| financial_stress_index | Financial stress metrics |

---

## Verification Steps

### 1. Test Backend Health

```bash
curl http://localhost:3001/health
```

Expected: {"status":"ok","timestamp":"..."}

### 2. Test Database Connection

```bash
cd backend
npm start
```

Look for: "Database initialized successfully"

### 3. Create Test User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 4. Check Database

- Supabase: Go to Table Editor in dashboard
- Local: Use pgAdmin or `psql -U postgres -d aurex_db -c "SELECT * FROM users;"`

---

## Supabase Installation Note (Windows Node.js 24)

When installing @supabase/supabase-js on Windows with Node.js 24.11.0, the better-sqlite3 native module may fail to compile. Use --ignore-scripts:

```bash
npm install --ignore-scripts
```

This is safe because better-sqlite3 is only needed for local Supabase development (npx supabase start). Since you're using hosted Supabase, you don't need it.

---

## Quick Setup Script (Supabase)

After getting your Supabase URL:

```bash
# Windows
setup-supabase.bat

# Mac/Linux
chmod +x setup-supabase.sh
./setup-supabase.sh
```

The script will:
1. Create backend/.env with your database connection
2. Generate secure JWT secret automatically
3. Generate encryption key automatically
4. Create .env.local for frontend
5. Start the backend server
6. Initialize all 11 database tables automatically
7. Test the connection

---

## Troubleshooting

### "Connection refused"
- Check if PostgreSQL is running
- Verify DATABASE_URL is correct
- Check port 5432 is not blocked

### "Database does not exist"
- Create database: `CREATE DATABASE aurex_db;`
- Or use Supabase (auto-created)

### "Authentication failed"
- Check password in DATABASE_URL
- Verify user has permissions

### "Tables don't exist"
- Let backend create them (automatic on first run)
- Or run migration: `psql -U postgres -d aurex_db -f backend/migrations/001_initial_schema.sql`

### Windows: "Cannot find backend/.env"
- Make sure you saved the file in the backend folder
- Make sure it's named .env not .env.txt
- In Notepad, use "Save As" -> Change "Save as type" to "All Files"

### Windows: "Port 3001 already in use"
- Kill the process:
```bash
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F
```

---

## Recommendation

**For most users: Use Supabase (Option 1)**

Why?
- No installation needed
- Works immediately
- Free tier is generous (500MB database)
- Can switch to local later if needed
- 5-minute setup

---

## Migration Guide: Local Auth to Supabase Auth

### Clean Switch (Recommended)

1. Backup current auth:
```bash
cp src/main.tsx src/main-local-backup.tsx
mkdir -p src/backup
cp src/contexts/auth-context.tsx src/backup/
cp src/components/AuthScreen.tsx src/backup/
```

2. Switch entry points:
```bash
mv src/main.tsx src/main-local.tsx
mv src/main-supabase.tsx src/main.tsx
```

3. Update routes in src/routes/index.tsx:
```typescript
import { useSupabaseAuth } from '@/contexts/supabase-auth-context';
import { SupabaseAuthScreen } from '@/components/SupabaseAuthScreen';

function App() {
  const { isAuthenticated, isLoading, user } = useSupabaseAuth();
  if (!isAuthenticated) return <SupabaseAuthScreen />;
  // ... rest of your code
}
```

4. Test thoroughly:
```bash
npm run dev
# Test Google OAuth sign in
# Test email/password sign up
# Test email/password sign in
# Test sign out
# Test session persistence (refresh page)
```

### Gradual Migration

Use a feature flag to run both systems in parallel:

```typescript
// src/lib/feature-flags.ts
export const useSupabaseAuth = import.meta.env.VITE_USE_SUPABASE_AUTH === 'true';
```

### Rollback

```bash
mv src/main-local-backup.tsx src/main.tsx
npm run dev
```

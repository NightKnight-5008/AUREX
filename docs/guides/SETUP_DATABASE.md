# Database Setup Guide - Quick Start

## 🎯 Choose Your Database Option

### Option 1: Supabase (Recommended - Easiest) ⭐

**Pros:**
- ✅ No local installation needed
- ✅ Free tier available
- ✅ Cloud-hosted (accessible anywhere)
- ✅ Automatic backups
- ✅ Built-in dashboard
- ✅ 5-minute setup

**Steps:**

1. **Create Supabase Account**
   - Go to https://supabase.com
   - Sign up for free account
   - Create a new project

2. **Get Database URL**
   - In your Supabase project dashboard
   - Go to Settings → Database
   - Copy the "Connection string" (URI format)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **Configure Backend**
   ```bash
   # Edit backend/.env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   JWT_SECRET=your_random_secret_here_change_this
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ENCRYPTION_KEY=your_32_character_key_here_12345
   ```

4. **Initialize Database**
   ```bash
   cd backend
   npm start
   ```
   The server will automatically create all tables on first run!

5. **Verify**
   - Open http://localhost:3001/health
   - Should see: `{"status":"ok","timestamp":"..."}`

---

### Option 2: Local PostgreSQL (Advanced)

**Pros:**
- ✅ Full control
- ✅ No internet needed
- ✅ Faster for development

**Cons:**
- ❌ Requires installation
- ❌ Manual setup needed

**Windows Installation:**

1. **Download PostgreSQL**
   - Go to https://www.postgresql.org/download/windows/
   - Download the installer (latest version)
   - Run the installer

2. **During Installation:**
   - Remember the password you set for `postgres` user
   - Default port: 5432 (keep it)
   - Install pgAdmin (recommended)

3. **Create Database**
   ```bash
   # Open Command Prompt or PowerShell
   psql -U postgres
   # Enter your password when prompted
   
   # Create database
   CREATE DATABASE aurex_db;
   
   # Exit
   \q
   ```

4. **Configure Backend**
   ```bash
   # Edit backend/.env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/aurex_db
   JWT_SECRET=your_random_secret_here_change_this
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ENCRYPTION_KEY=your_32_character_key_here_12345
   ```

5. **Initialize Schema**
   ```bash
   # Option A: Let server create tables
   cd backend
   npm start
   
   # Option B: Run migration manually
   psql -U postgres -d aurex_db -f migrations/001_initial_schema.sql
   ```

---

### Option 3: Docker PostgreSQL (For Docker Users)

**If you have Docker installed:**

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

## 🚀 Quick Setup Script (Supabase)

I'll create a setup script for you. Just run it after getting your Supabase URL:

```bash
# Windows
.\setup-supabase.bat

# Mac/Linux
chmod +x setup-supabase.sh
./setup-supabase.sh
```

---

## ✅ Verification Steps

After setup, verify everything works:

1. **Test Backend Health**
   ```bash
   curl http://localhost:3001/health
   ```
   Expected: `{"status":"ok","timestamp":"..."}`

2. **Test Database Connection**
   ```bash
   cd backend
   npm start
   ```
   Look for: "Database initialized successfully"

3. **Create Test User**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

4. **Check Database**
   - Supabase: Go to Table Editor in dashboard
   - Local: Use pgAdmin or `psql -U postgres -d aurex_db -c "SELECT * FROM users;"`

---

## 🆘 Troubleshooting

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

---

## 📝 What I Recommend

**For you right now: Use Supabase (Option 1)**

Why?
- ✅ No installation needed
- ✅ Works immediately
- ✅ Free tier is generous
- ✅ Can switch to local later if needed
- ✅ 5-minute setup

**Next Steps:**
1. Go to https://supabase.com and create account
2. Create new project
3. Copy database URL
4. I'll help you configure it!

Let me know when you have your Supabase URL and I'll set everything up for you!

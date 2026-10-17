# 🚀 Quick Database Setup - 5 Minutes

## Step 1: Get Your Free Database (2 minutes)

### Go to Supabase
1. Open https://supabase.com in your browser
2. Click "Start your project"
3. Sign up with GitHub or email
4. Click "New Project"

### Create Project
- **Name**: `aurex-db` (or any name you like)
- **Database Password**: Create a strong password (save it!)
- **Region**: Choose closest to you
- Click "Create new project"

⏳ Wait 1-2 minutes for project to be created...

### Get Database URL
1. Once project is ready, go to **Settings** (gear icon on left)
2. Click **Database**
3. Scroll to **Connection string**
4. Select **URI** tab
5. Copy the connection string

It looks like:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual password!

---

## Step 2: Run Setup Script (1 minute)

### Windows:
```bash
setup-supabase.bat
```

### Mac/Linux:
```bash
chmod +x setup-supabase.sh
./setup-supabase.sh
```

When prompted, paste your Supabase DATABASE_URL.

The script will:
- ✅ Create `backend/.env` with your database URL
- ✅ Generate secure JWT secret
- ✅ Generate encryption key
- ✅ Create `.env.local` for frontend
- ✅ Start backend server
- ✅ Initialize database tables automatically

---

## Step 3: Verify It Works (1 minute)

### Test Backend Health
Open in browser: http://localhost:3001/health

Should see:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Test Database Connection
The backend console should show:
```
Database initialized successfully
Server running on port 3001
```

### Create Test User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Should see:
```json
{"message":"User registered successfully","user":{...}}
```

### Check in Supabase Dashboard
1. Go to your Supabase project
2. Click **Table Editor** (left sidebar)
3. You should see tables: `users`, `credit_cards`, `transactions`, etc.
4. Click `users` table - you should see your test user!

---

## Step 4: Start Frontend (30 seconds)

```bash
npm run dev
```

Open http://localhost:3000

You should see the AUREX login screen!

---

## ✅ You're Done!

Your database is connected and ready to use!

### What Just Happened?

1. ✅ Created free PostgreSQL database on Supabase
2. ✅ Configured backend to connect to database
3. ✅ Initialized 11 database tables automatically
4. ✅ Backend API running on port 3001
5. ✅ Frontend ready to connect

### Next Steps

1. **Sign up** in the app (http://localhost:3000)
2. **Create some cards** in the dashboard
3. **Add transactions**
4. **Explore the features**

### View Your Data

**In Supabase Dashboard:**
- Go to https://supabase.com
- Open your project
- Click **Table Editor**
- Browse your data in real-time!

**In the App:**
- All data you create is stored in your Supabase database
- Refresh the page - data persists!
- Sign out and sign in - data is still there!

---

## 🎉 Success!

You now have:
- ✅ Cloud PostgreSQL database (free)
- ✅ Backend API connected
- ✅ Frontend connected to backend
- ✅ Real data persistence
- ✅ Production-ready setup

**No more mock data - everything is real now!**

---

## 🆘 Troubleshooting

### "Connection refused"
- Check your DATABASE_URL is correct
- Make sure you replaced `[YOUR-PASSWORD]` with actual password
- Verify Supabase project is active

### "Authentication failed"
- Double-check your database password
- Copy the connection string again from Supabase
- Make sure there are no extra spaces

### "Tables don't exist"
- Backend creates tables automatically on first run
- Check backend console for "Database initialized successfully"
- If not, restart backend: `cd backend && npm start`

### Backend won't start
- Check `backend/.env` exists
- Verify DATABASE_URL is set
- Run `cd backend && npm install` to ensure dependencies

### Still stuck?
Check the detailed guide: `SETUP_DATABASE.md`

---

## 💡 Pro Tips

1. **Bookmark your Supabase dashboard** - You'll use it to view data
2. **Save your database password** - You'll need it if you recreate .env
3. **Free tier is generous** - 500MB database, 2GB bandwidth/month
4. **Automatic backups** - Supabase backs up your data daily
5. **Can upgrade later** - Start free, upgrade if you need more

---

**Total Time**: ~5 minutes
**Cost**: $0 (free tier)
**Result**: Production-ready database!

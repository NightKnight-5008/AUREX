# Windows Step-by-Step Setup (No Script Needed)

Follow these exact steps. Copy and paste everything.

---

## Step 1: Get Supabase Database URL

1. Open browser: https://supabase.com
2. Click "Start your project" → Sign up
3. Click "New Project"
4. Fill in:
   - Name: `aurex-db`
   - Password: (create a strong password - SAVE IT!)
   - Region: (choose closest to you)
5. Click "Create new project"
6. Wait 1-2 minutes...
7. When ready, click **Settings** (gear icon on left)
8. Click **Database**
9. Scroll to **Connection string**
10. Click **URI** tab
11. Copy the entire string

It looks like:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

12. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with your actual password!

Example after replacing:
```
postgresql://postgres.xxxxxxxxxxxxx:MyStrongPass123@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## Step 2: Create backend/.env File

### Method 1: Using Notepad

1. Open Notepad
2. Copy this ENTIRE text:

```
DATABASE_URL=PASTE_YOUR_URL_HERE
JWT_SECRET=my_super_secret_jwt_key_12345
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=my_32_character_encryption_key
```

3. Replace `PASTE_YOUR_URL_HERE` with your Supabase URL from Step 1
4. Click File → Save As
5. Navigate to your AUREX project folder
6. Open the `backend` folder
7. In "File name" type: `.env` (with the dot!)
8. In "Save as type" select: **All Files (*.*)**
9. Click Save

### Method 2: Using PowerShell (Easier)

1. Open PowerShell in your AUREX project folder
2. Run this command (replace YOUR_URL with your actual Supabase URL):

```powershell
@"
DATABASE_URL=YOUR_SUPABASE_URL_HERE
JWT_SECRET=my_super_secret_jwt_key_12345
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=my_32_character_encryption_key
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
```

Example with real URL:
```powershell
@"
DATABASE_URL=postgresql://postgres.xxxxx:MyPass123@aws-0-us-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=my_super_secret_jwt_key_12345
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=my_32_character_encryption_key
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
```

---

## Step 3: Create .env.local File (if not exists)

Check if `.env.local` exists in your project root. If not:

### Using PowerShell:

```powershell
@"
VITE_API_URL=http://localhost:3001
VITE_ENV=development
"@ | Out-File -FilePath ".env.local" -Encoding utf8
```

---

## Step 4: Install Dependencies (if not done)

```powershell
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## Step 5: Start Backend

Open PowerShell or Command Prompt in your project folder:

```powershell
cd backend
npm start
```

You should see:
```
Database initialized successfully
Server running on port 3001
```

**Leave this window open!**

---

## Step 6: Test Backend

Open a NEW PowerShell window and run:

```powershell
curl http://localhost:3001/health
```

Or open in browser: http://localhost:3001/health

Should see:
```json
{"status":"ok","timestamp":"..."}
```

---

## Step 7: Start Frontend

In a NEW PowerShell window (keep backend running):

```powershell
npm run dev
```

Should see:
```
VITE ready in XXX ms
Local: http://localhost:3000
```

---

## Step 8: Open the App

Open browser: http://localhost:3000

You should see the AUREX login screen!

---

## Step 9: Test It Works

1. Click "Sign Up"
2. Enter email: `test@example.com`
3. Enter password: `password123`
4. Click Sign Up
5. You should be logged in!

---

## ✅ Verify Database Connection

1. Go to your Supabase dashboard: https://supabase.com
2. Open your project
3. Click **Table Editor** (left sidebar)
4. You should see tables: `users`, `credit_cards`, `transactions`, etc.
5. Click `users` table
6. You should see your test user!

---

## 🎉 Success!

Your database is connected and working!

Now you can:
- Create cards
- Add transactions
- Refresh the page - data persists!
- Sign out and sign in - data is still there!

---

## 🆘 Troubleshooting

### "Cannot find backend/.env"
- Make sure you saved the file in the `backend` folder
- Make sure it's named `.env` not `.env.txt`
- Check with: `dir backend\.env` in PowerShell

### "Connection refused"
- Check your DATABASE_URL is correct
- Make sure you replaced `[YOUR-PASSWORD]`
- Copy the URL again from Supabase

### "Module not found"
- Run `npm install` in project root
- Run `npm install` in backend folder

### "Port 3001 already in use"
- Close any other backend processes
- Or change PORT in backend/.env to 3002

### Backend shows errors
- Check backend/.env file exists
- Check DATABASE_URL has no extra spaces
- Make sure Supabase project is active

---

## 📝 What You Created

✅ `backend/.env` - Backend configuration with database URL
✅ `.env.local` - Frontend configuration
✅ Database connection to Supabase
✅ 11 tables in your database
✅ Working backend API
✅ Working frontend app

---

## 💡 Tips

1. **Keep backend running** - Don't close that window
2. **Bookmark Supabase** - You'll use it to view data
3. **Save your password** - You'll need it if you recreate .env
4. **Free tier is generous** - 500MB database, plenty for development

---

**Need more help?** Tell me exactly what error you're seeing and I'll help you fix it!

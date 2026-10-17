# Windows Manual Database Setup

If the automated script isn't working, follow these manual steps:

## Step 1: Get Your Supabase Database URL

1. Go to https://supabase.com
2. Sign up and create a new project
3. Go to Settings → Database
4. Copy the Connection String (URI format)

Example:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual password!

---

## Step 2: Create backend/.env File Manually

1. Open Notepad or any text editor
2. Copy and paste this template:

```env
# AUREX Backend Environment Variables

# Database - PASTE YOUR SUPABASE URL HERE
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# JWT Secret - Change this to any random string
JWT_SECRET=my_super_secret_jwt_key_change_this_12345

# Server
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Encryption Key - Must be 32 characters
ENCRYPTION_KEY=my_32_character_encryption_key
```

3. **Replace** the `DATABASE_URL` with your actual Supabase URL
4. **Save** the file as `backend/.env` (make sure it's in the `backend` folder)
5. **Important**: Make sure the file is named `.env` not `.env.txt`

---

## Step 3: Create .env.local File (if not exists)

1. Open Notepad
2. Copy and paste:

```env
# AUREX Frontend Environment Variables

# Backend API URL
VITE_API_URL=http://localhost:3001

# Environment
VITE_ENV=development
```

3. **Save** as `.env.local` in the root folder (not in backend folder)

---

## Step 4: Start Backend

Open Command Prompt or PowerShell and run:

```bash
cd backend
npm start
```

You should see:
```
Database initialized successfully
Server running on port 3001
```

---

## Step 5: Test It Works

Open a new Command Prompt and run:

```bash
curl http://localhost:3001/health
```

Or open in browser: http://localhost:3001/health

Should see:
```json
{"status":"ok","timestamp":"..."}
```

---

## Step 6: Start Frontend

In a new Command Prompt:

```bash
npm run dev
```

Open http://localhost:3000

---

## ✅ You're Done!

Your database is connected!

---

## 🆘 Common Issues

### Issue: "Cannot find module"
**Solution**: Install dependencies
```bash
cd backend
npm install
cd ..
npm install
```

### Issue: "Connection refused"
**Solution**: Check your DATABASE_URL
- Make sure you replaced `[YOUR-PASSWORD]` with actual password
- No extra spaces at the end
- Copy it again from Supabase if needed

### Issue: ".env file not found"
**Solution**: Make sure file is named `.env` not `.env.txt`
- In Notepad, use "Save As"
- Change "Save as type" to "All Files"
- Name it `.env`

### Issue: "Port 3001 already in use"
**Solution**: Kill the process
```bash
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F
```

---

## 📝 Quick Checklist

- [ ] Created Supabase account
- [ ] Created new project
- [ ] Copied database URL
- [ ] Created `backend/.env` file
- [ ] Pasted database URL in `.env`
- [ ] Created `.env.local` file
- [ ] Ran `npm install` in backend
- [ ] Started backend with `npm start`
- [ ] Tested health endpoint
- [ ] Started frontend with `npm run dev`
- [ ] Opened http://localhost:3000

---

Need more help? Let me know what error you're seeing!

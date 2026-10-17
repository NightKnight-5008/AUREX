# Troubleshooting Guide

## Common Issues

### Backend Won't Start

**Error:** Database connection failed

**Solution:**
1. Check PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
2. Verify database exists: `psql -U postgres -l | grep aurex`
3. Check DATABASE_URL in backend/.env
4. Ensure port 3001 is free

### Frontend Can't Connect

**Error:** Network error in console

**Solution:**
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check VITE_API_URL in .env.local
3. Clear browser cache
4. Check CORS settings (already configured)

### Authentication Fails

**Error:** "Invalid token" or "Unauthorized"

**Solution:**
1. Check JWT_SECRET is set in backend/.env
2. Sign out and sign in again
3. Check token in DevTools -> Application -> Local Storage
4. Verify token hasn't expired (24h default)

### Database Tables Missing

**Error:** `relation 'users' does not exist`

**Solution:**
1. Run migration: `psql -U user -d aurex_db -f backend/migrations/001_initial_schema.sql`
2. Or let server initialize on first run
3. Check tables: `psql -U user -d aurex_db -c "\dt"`

---

## Windows-Specific Issues

### "Cannot find backend/.env"
- Make sure you saved the file in the backend folder
- Make sure it's named .env not .env.txt
- Check with: `dir backend\.env` in PowerShell
- In Notepad, use "Save As" -> Change "Save as type" to "All Files"

### "Connection refused"
- Check your DATABASE_URL is correct
- Make sure you replaced [YOUR-PASSWORD] with actual password
- No extra spaces at the end
- Copy it again from Supabase if needed

### "Port 3001 already in use"
- Kill the process:
```bash
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F
```

### "Module not found"
- Run `npm install` in project root
- Run `npm install` in backend folder

---

## Currency Conversion Issues

### Issue: "Rates not updating"
**Solution:**
1. Check internet connection
2. Clear browser cache (localStorage)
3. Click "Refresh Rates Now" in Settings
4. Check browser console for API errors

### Issue: "Showing offline rates when online"
**Solution:**
1. Cache may be fresh (< 7 days old)
2. Click "Refresh Rates Now" to force update
3. Check if APIs are accessible (CORS, firewall)

### Issue: "Wrong conversion amounts"
**Solution:**
1. Verify country selection matches data currency
2. Check if custom currency is selected
3. Refresh rates to ensure latest data
4. Clear cache and reload app

---

## Supabase Issues

### "Invalid redirect URL"
- Check Google OAuth redirect URIs
- Verify Supabase URL configuration
- Ensure domains match exactly

### "Failed to sign in with Google"
- Verify Google OAuth credentials in Supabase
- Check OAuth consent screen is published
- Clear browser cache and try again

### "Session not found after OAuth redirect"
- Clear browser cache and cookies
- Make sure cookies are enabled
- Check browser console for errors
- Verify that the callback route is working correctly

### Email verification not working
- Go to Supabase -> Authentication -> Email Templates
- Make sure email confirmation is enabled
- Check your spam folder
- For development, you can disable email confirmation temporarily

---

## Windows Node.js 24 Issue

When installing @supabase/supabase-js on Windows with Node.js 24.11.0, the better-sqlite3 native module may fail to compile:

```bash
npm install --ignore-scripts
```

This is safe because better-sqlite3 is only needed for local Supabase development. Since you're using hosted Supabase, you don't need it.

If you need local Supabase later:
1. Upgrade to Visual Studio 2022 (supports C++20), OR
2. Downgrade to Node.js 20 LTS, OR
3. Use Docker for local Supabase instead

---

## Debug Checklist

### Backend Issues
- [ ] PostgreSQL is running
- [ ] Database exists and is accessible
- [ ] .env file exists with correct values
- [ ] Port 3001 is not in use
- [ ] Dependencies installed (npm install)
- [ ] No errors in backend console

### Frontend Issues
- [ ] Backend is running and healthy
- [ ] .env.local has correct VITE_API_URL
- [ ] Dependencies installed (npm install)
- [ ] No CORS errors in browser console
- [ ] Token is being sent in requests
- [ ] React Query DevTools shows queries

### Database Issues
- [ ] Tables exist (\dt in psql)
- [ ] User has correct permissions
- [ ] Connection string is correct
- [ ] Database is not full
- [ ] No foreign key constraint errors

### Auth Issues
- [ ] JWT_SECRET is set in backend
- [ ] Token is not expired (24h default)
- [ ] User exists in database
- [ ] Password is correct
- [ ] Token is in Authorization header

---

## Useful URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health Check: http://localhost:3001/health
- React Query DevTools: Bottom-right of frontend (dev mode)

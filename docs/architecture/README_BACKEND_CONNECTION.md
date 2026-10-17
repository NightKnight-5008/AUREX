# 🎉 AUREX Backend Connection - Complete Package

Everything you need to connect your AUREX frontend to the PostgreSQL backend is ready!

## 📦 What's Included

### 1. Environment Configuration
- ✅ `backend/.env.example` - Backend environment template
- ✅ `.env.local.example` - Frontend environment template

### 2. API Client Updates
- ✅ Fixed `src/lib/api-client.ts` - All endpoints standardized to `/api/*`
- ✅ Fixed environment variable usage (`import.meta.env` instead of `process.env`)
- ✅ Fixed port inconsistencies (all using 3001)

### 3. React Query Hooks
- ✅ `src/hooks/use-cards-queries.ts` - Credit card CRUD operations
- ✅ `src/hooks/use-settings-queries.ts` - User settings management
- ✅ `src/hooks/use-transaction-queries.ts` - Fixed port (already existed)
- ✅ `src/hooks/use-sms-queries.ts` - Already has API integration

### 4. Startup Scripts
- ✅ `start-dev.sh` - Mac/Linux startup script
- ✅ `start-dev.bat` - Windows startup script

### 5. Documentation
- ✅ `CONNECTION_SUMMARY.md` - Quick overview of everything
- ✅ `BACKEND_CONNECTION_GUIDE.md` - Detailed step-by-step guide (10KB)
- ✅ `EXAMPLE_COMPONENT_UPDATE.md` - Code examples for migration (13KB)
- ✅ `QUICK_REFERENCE.md` - Quick lookup reference (9KB)
- ✅ `README_BACKEND_CONNECTION.md` - This file

---

## 🚀 Get Started in 3 Steps

### Step 1: Configure Environment (2 minutes)

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL credentials

# Frontend  
cp .env.local.example .env.local
# Default values work for local development
```

**Required in backend/.env:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/aurex_db
JWT_SECRET=your_strong_random_secret_here
```

### Step 2: Initialize Database (1 minute)

```bash
# Option A: Run migration
psql -U your_username -d aurex_db -f backend/migrations/001_initial_schema.sql

# Option B: Let server initialize automatically
cd backend && npm install && npm start
```

### Step 3: Start Everything (30 seconds)

**Mac/Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

**Windows:**
```bash
start-dev.bat
```

**Manual:**
```bash
# Terminal 1
cd backend && npm start

# Terminal 2
npm run dev
```

**That's it!** 🎉

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

---

## 📚 Documentation Guide

### For Quick Setup
👉 **Start here:** `CONNECTION_SUMMARY.md`
- Overview of what's been done
- Quick start instructions
- Verification checklist

### For Detailed Instructions
👉 **Read this:** `BACKEND_CONNECTION_GUIDE.md`
- Step-by-step setup guide
- Database initialization
- Testing procedures
- Debugging tips
- Production deployment

### For Code Examples
👉 **Reference this:** `EXAMPLE_COMPONENT_UPDATE.md`
- Before/after code examples
- Migration patterns
- Common use cases
- Best practices

### For Quick Lookup
👉 **Keep handy:** `QUICK_REFERENCE.md`
- API endpoints table
- React Query hooks
- Database commands
- Debug checklist
- Code snippets

---

## ✅ What's Already Working

### Backend (Ready to Use)
- ✅ Express.js server with JWT authentication
- ✅ PostgreSQL database with 11 tables
- ✅ CORS configured for localhost:3000
- ✅ All CRUD endpoints for cards, transactions, SMS
- ✅ User authentication (register, login, get current user)
- ✅ Settings management
- ✅ Health check endpoint

### Frontend (Ready to Connect)
- ✅ API client with all methods
- ✅ Auth context with token management
- ✅ React Query hooks for data fetching
- ✅ TanStack Query configured (5min stale, 10min GC)
- ✅ Error handling and loading states
- ✅ Type-safe interfaces for all data

### Integration Points
- ✅ Token automatically synced to API client on login
- ✅ Automatic query invalidation after mutations
- ✅ Optimistic updates support
- ✅ Automatic retries on failure
- ✅ Request/response interceptors

---

## 🔄 What You Need to Do

### 1. Update Auth Context (30 minutes)

**File:** `src/contexts/auth-context.tsx`

**Current:** Uses `local-user-storage.ts` (localStorage-based demo)

**Target:** Use `apiClient.register()` and `apiClient.login()`

**See:** `EXAMPLE_COMPONENT_UPDATE.md` for code examples

### 2. Replace Mock Data in Dashboard (1-2 hours)

**File:** `src/routes/index.tsx`

**Current:** Uses `generateSampleCards()`, `generateSampleTransactions()`

**Target:** Use `useCards()`, `useTransactions()` hooks

**Pattern:**
```typescript
// Before
const [cards, setCards] = useState(() => generateSampleCards());

// After
const { data: cards = [], isLoading } = useCards();
```

### 3. Update Components (2-4 hours)

Components that need real data:
- `CardManagement.tsx` / `CardManagementEnterprise.tsx`
- `SmsLogTab.tsx`
- `MetricsTab.tsx`
- `AnalyticsDashboard.tsx`

**See:** `EXAMPLE_COMPONENT_UPDATE.md` for patterns

### 4. Test Everything (30 minutes)

- [ ] User registration creates database record
- [ ] User login returns JWT token
- [ ] Cards fetch from backend
- [ ] Card creation works
- [ ] Card updates persist
- [ ] Card deletion works
- [ ] Transactions fetch from backend
- [ ] Settings load and save

---

## 🎯 Migration Priority

### Phase 1: Core Functionality (Do First)
1. Auth context (sign up, sign in) - **30 min**
2. Credit cards in dashboard - **1 hour**
3. Transactions in dashboard - **1 hour**
4. User settings - **30 min**

**Total: ~3 hours**

### Phase 2: Components (Do Next)
1. Card management components - **1 hour**
2. Transaction list components - **1 hour**
3. SMS log tab - **1 hour**
4. Dashboard metrics - **1 hour**

**Total: ~4 hours**

### Phase 3: Advanced Features (Do Later)
1. Analytics dashboard - **2 hours**
2. Payroll (needs backend endpoints) - **3 hours**
3. Products (needs backend endpoints) - **2 hours**
4. Website metrics (needs backend endpoints) - **2 hours**

**Total: ~9 hours**

---

## 🧪 Testing Your Connection

### 1. Backend Health Check
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. User Registration
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. User Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Save the token from response
```

### 4. Fetch Cards (with token)
```bash
curl http://localhost:3001/api/credit-cards \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Check Database
```bash
psql -U your_username -d aurex_db
\dt                                    # List tables
SELECT * FROM users;                   # View users
SELECT * FROM credit_cards;            # View cards
\q                                     # Exit
```

---

## 🐛 Troubleshooting

### Backend Won't Start
**Error:** Database connection failed

**Solution:**
1. Check PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
2. Verify database exists: `psql -U postgres -l | grep aurex`
3. Check `DATABASE_URL` in `backend/.env`
4. Ensure port 3001 is free

### Frontend Can't Connect
**Error:** Network error in console

**Solution:**
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check `VITE_API_URL` in `.env.local`
3. Clear browser cache
4. Check CORS settings (already configured)

### Authentication Fails
**Error:** "Invalid token" or "Unauthorized"

**Solution:**
1. Check `JWT_SECRET` is set in `backend/.env`
2. Sign out and sign in again
3. Check token in DevTools → Application → Local Storage
4. Verify token hasn't expired (24h default)

### Database Tables Missing
**Error:** `relation 'users' does not exist`

**Solution:**
1. Run migration: `psql -U user -d aurex_db -f backend/migrations/001_initial_schema.sql`
2. Or let server initialize on first run
3. Check tables: `psql -U user -d aurex_db -c "\dt"`

**More help:** See `BACKEND_CONNECTION_GUIDE.md` debugging section

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Components                │
│                 ↓                       │
│    TanStack Query Hooks                 │
│                 ↓                       │
│       API Client (api-client.ts)        │
│                 ↓                       │
│    HTTP Requests + JWT Token            │
└─────────────────────────────────────────┘
                  ↓
            (HTTP/JSON)
                  ↓
┌─────────────────────────────────────────┐
│    Express.js Server (server.js)        │
│                 ↓                       │
│  JWT Auth Middleware (auth.js)          │
│                 ↓                       │
│    Route Handlers (routes/*.js)         │
│                 ↓                       │
│   Database Queries (database.js)        │
└─────────────────────────────────────────┘
                  ↓
            (SQL Queries)
                  ↓
┌─────────────────────────────────────────┐
│       PostgreSQL Database               │
│   (11 tables: users, cards, etc.)       │
└─────────────────────────────────────────┘
```

---

## 🎓 Learning Resources

### React Query (TanStack Query)
- Official Docs: https://tanstack.com/query/latest
- Video Tutorial: https://www.youtube.com/watch?v=novnyCaa7To
- Our hooks: `src/hooks/use-*-queries.ts`

### PostgreSQL
- Official Docs: https://www.postgresql.org/docs/
- Tutorial: https://www.postgresqltutorial.com/
- Our schema: `backend/migrations/001_initial_schema.sql`

### Express.js
- Official Docs: https://expressjs.com/
- Guide: https://expressjs.com/en/guide/routing.html
- Our server: `backend/src/server.js`

### JWT Authentication
- JWT.io: https://jwt.io/
- Guide: https://www.digitalocean.com/community/tutorials/nodejs-jwt-expressjs
- Our middleware: `backend/src/middleware/auth.js`

---

## 💡 Pro Tips

1. **Use React Query DevTools** - Already installed, shows query status in bottom-right
2. **Check Backend Logs** - All requests logged with timestamps
3. **Use PostgreSQL GUI** - pgAdmin or TablePlus for easier database inspection
4. **Test API with curl** - Verify endpoints work before frontend integration
5. **Keep Mock Data** - Useful for testing UI without backend
6. **Start Small** - Update one component at a time
7. **Use TypeScript** - Catch errors before runtime
8. **Add Loading States** - Better UX during data fetching
9. **Handle Errors** - Always show user-friendly messages
10. **Test Edge Cases** - Empty data, slow network, errors

---

## 🎉 Success Criteria

You'll know everything is connected when:

✅ Backend starts without errors
✅ Frontend connects to backend  
✅ User registration creates database record
✅ User login returns JWT token
✅ Dashboard shows real data from database
✅ Creating/updating/deleting data works
✅ Network tab shows API calls to localhost:3001
✅ Database queries show your data
✅ Data persists after page refresh
✅ React Query DevTools shows successful queries

---

## 📞 Support

### Documentation Files
- `CONNECTION_SUMMARY.md` - Quick overview
- `BACKEND_CONNECTION_GUIDE.md` - Detailed guide
- `EXAMPLE_COMPONENT_UPDATE.md` - Code examples
- `QUICK_REFERENCE.md` - Quick lookup

### Debugging Steps
1. Check backend console for errors
2. Check browser DevTools console
3. Check React Query DevTools
4. Check database with psql
5. Test API with curl
6. Review documentation

### Common Issues
- Backend won't start → Check PostgreSQL and `.env`
- Frontend can't connect → Check backend is running
- Auth fails → Check JWT_SECRET and token
- Tables missing → Run migration or let server initialize

---

## 🚀 Next Steps After Connection

1. **Remove Creao Legacy Code** - Clean up old platform code
2. **Add More Endpoints** - Employees, products, analytics
3. **Implement Real-time** - WebSocket for SMS sync
4. **Add Validation** - Zod schemas on both sides
5. **Implement Caching** - Redis for performance
6. **Add Monitoring** - Sentry for error tracking
7. **Write Tests** - Unit and integration tests
8. **Deploy to Production** - Render.com or similar

---

## 📝 Checklist

### Setup
- [ ] Copied `.env` files
- [ ] Edited `backend/.env` with database credentials
- [ ] Installed dependencies (frontend and backend)
- [ ] Database created and initialized
- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] Health endpoint responds

### Testing
- [ ] User registration works
- [ ] User login works
- [ ] Cards fetch from backend
- [ ] Card creation works
- [ ] Card updates persist
- [ ] Card deletion works
- [ ] Transactions fetch from backend
- [ ] Settings load and save
- [ ] Data persists after refresh

### Migration
- [ ] Auth context updated
- [ ] Dashboard uses real data
- [ ] Card components updated
- [ ] Transaction components updated
- [ ] SMS components updated
- [ ] Settings components updated
- [ ] All mock data removed (or kept for testing)

---

## 🎊 You're Ready!

Everything is set up and ready to go. Follow the steps above, and you'll have a fully connected AUREX application in a few hours.

**Start with:** `CONNECTION_SUMMARY.md` for a quick overview

**Questions?** Check the documentation files or the debugging sections

**Good luck!** 🚀

---

**Created:** 2024
**Version:** 1.0.0
**Status:** ✅ Ready to Connect

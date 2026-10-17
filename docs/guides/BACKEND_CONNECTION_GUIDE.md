# AUREX Backend Connection Guide

This guide will help you connect the AUREX frontend to the PostgreSQL backend.

## 📋 Prerequisites

1. **PostgreSQL Database** - Running and accessible
2. **Node.js** - v18+ installed
3. **Environment Variables** - Configured for both frontend and backend

---

## 🚀 Step 1: Set Up Environment Variables

### Backend (.env)

Create `backend/.env` from the example:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/aurex_db
JWT_SECRET=your_strong_random_jwt_secret_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Frontend (.env.local)

Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

---

## 🗄️ Step 2: Initialize the Database

### Option A: Using the Migration File

```bash
cd backend
psql -U your_username -d aurex_db -f migrations/001_initial_schema.sql
```

### Option B: Let the Server Initialize

The backend server will automatically create tables on first run (see `backend/src/database.js`).

```bash
cd backend
npm install
npm start
```

Check the console for "Database initialized successfully" message.

---

## 🔌 Step 3: Start the Backend Server

```bash
cd backend
npm install
npm start
```

The server should start on `http://localhost:3001`.

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

---

## 🎨 Step 4: Update Frontend to Use Backend

### 4.1: Install Dependencies (if needed)

```bash
npm install
```

### 4.2: The Connection is Already Set Up!

The following files are already configured:

✅ **API Client**: `src/lib/api-client.ts`
- Handles all HTTP requests
- Manages JWT token in-memory
- Base URL from `VITE_API_URL` env var

✅ **Auth Context**: `src/contexts/auth-context.tsx`
- Syncs token to `apiClient` on login
- Clears token on logout
- Persists auth state via SecureStorage

✅ **Query Hooks**: Created for you!
- `src/hooks/use-cards-queries.ts` - Credit card CRUD
- `src/hooks/use-settings-queries.ts` - User settings
- `src/hooks/use-sms-queries.ts` - SMS logs (already has API integration)
- `src/hooks/use-transaction-queries.ts` - Transactions (already has API integration)

---

## 🔄 Step 5: Replace Mock Data with Real Data

### Current State (Mock Data)

```typescript
// src/routes/index.tsx - BEFORE
const [cards, setCards] = useState(() => generateSampleCards(countryCode));
const [transactions, setTransactions] = useState(() => generateSampleTransactions(countryCode));
```

### New State (Real Data)

Replace the mock data generators with TanStack Query hooks:

```typescript
// src/routes/index.tsx - AFTER
import { useCards } from '@/hooks/use-cards-queries';
import { useTransactions } from '@/hooks/use-transaction-queries';
import { useUserSettings } from '@/hooks/use-settings-queries';

function App() {
  const { isAuthenticated, user } = useAuth();
  
  // Fetch real data from backend
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  
  // Show loading state
  if (cardsLoading || transactionsLoading || settingsLoading) {
    return <div>Loading...</div>;
  }
  
  // Use real data in your components
  return (
    <div>
      <CardManagement cards={cards} />
      <TransactionList transactions={transactions} />
    </div>
  );
}
```

---

## 📝 Step 6: Update Auth Flow

### Current Auth (localStorage-based)

The auth context currently uses `local-user-storage.ts` for demo mode.

### Backend Auth Integration

Update `src/contexts/auth-context.tsx` to use the backend:

**Sign Up:**
```typescript
const signUp = async (email: string, password: string) => {
  try {
    const response = await apiClient.register(email, password, androidPassword);
    // Handle response
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

**Sign In:**
```typescript
const signIn = async (email: string, password: string) => {
  try {
    const response = await apiClient.login(email, password);
    
    // Token is automatically set in apiClient
    // Store user data
    setUser(response.user);
    await SecureStorage.setAuthToken({
      token: response.authToken,
      expiresAt: response.expiresAt
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

## 🧪 Step 7: Test the Connection

### 7.1: Start Both Servers

Terminal 1 (Backend):
```bash
cd backend
npm start
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 7.2: Test User Registration

1. Open `http://localhost:3000`
2. Click "Sign Up"
3. Enter email and password
4. Check backend logs for registration request
5. Check database for new user:
   ```sql
   SELECT * FROM users;
   ```

### 7.3: Test Data Fetching

1. Sign in with your account
2. Open browser DevTools → Network tab
3. Look for API calls to `http://localhost:3001/api/*`
4. Check responses for data

### 7.4: Test Data Creation

1. Try creating a credit card
2. Check backend logs
3. Verify in database:
   ```sql
   SELECT * FROM credit_cards;
   ```

---

## 🔍 Step 8: Debugging

### Backend Not Starting?

Check:
- PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
- Database exists: `psql -U postgres -l | grep aurex`
- Environment variables are set correctly
- Port 3001 is not in use: `lsof -i :3001` (Mac/Linux) or `netstat -ano | findstr :3001` (Windows)

### Frontend Can't Connect?

Check:
- Backend is running on port 3001
- `VITE_API_URL` in `.env.local` is correct
- CORS is enabled in backend (already configured)
- Browser console for errors

### Authentication Issues?

Check:
- JWT_SECRET is set in backend `.env`
- Token is being sent in Authorization header
- Token hasn't expired (24h default)
- User exists in database

### Database Errors?

Check:
- Database schema is initialized
- User has correct permissions
- Connection string is correct
- Tables exist: `\dt` in psql

---

## 📊 Step 9: Data Migration (Optional)

If you want to seed the database with sample data:

### Create a Seed Script

```javascript
// backend/scripts/seed.js
import { query } from '../src/database.js';
import { hashPassword } from '../src/utils/crypto.js';

async function seed() {
  // Create test user
  const passwordHash = await hashPassword('password123');
  const userResult = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    ['test@example.com', passwordHash]
  );
  
  const userId = userResult.rows[0].id;
  
  // Create sample cards
  await query(
    `INSERT INTO credit_cards (user_id, card_name, last_four, credit_limit, available_balance)
     VALUES ($1, 'Chase Sapphire', '1234', 10000, 8000)`,
    [userId]
  );
  
  console.log('Database seeded successfully!');
}

seed().catch(console.error);
```

Run it:
```bash
node backend/scripts/seed.js
```

---

## 🎯 Step 10: Production Deployment

### Backend (Render.com)

The `render.yaml` file is already configured:

```yaml
services:
  - type: web
    name: aurex-backend
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

Deploy:
1. Push to GitHub
2. Connect repository to Render
3. Set environment variables in Render dashboard
4. Deploy

### Frontend (Render.com / Vercel / Netlify)

Update `.env.production`:
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_ENV=production
```

Build:
```bash
npm run build
```

Deploy the `dist/` folder.

---

## ✅ Checklist

- [ ] PostgreSQL database created
- [ ] Backend `.env` configured
- [ ] Frontend `.env.local` configured
- [ ] Database schema initialized
- [ ] Backend server running on port 3001
- [ ] Frontend dev server running on port 3000
- [ ] Health endpoint responding
- [ ] User registration working
- [ ] User login working
- [ ] Cards fetching from backend
- [ ] Transactions fetching from backend
- [ ] Settings fetching from backend
- [ ] Data creation working
- [ ] Data updates working
- [ ] Data deletion working

---

## 🆘 Need Help?

### Common Issues

**Issue**: "Cannot find module 'pg'"
**Solution**: Run `npm install` in backend directory

**Issue**: "ECONNREFUSED localhost:3001"
**Solution**: Backend server is not running. Start it with `npm start`

**Issue**: "JWT malformed"
**Solution**: Token is invalid. Sign out and sign in again

**Issue**: "relation 'users' does not exist"
**Solution**: Database schema not initialized. Run migration or let server initialize

**Issue**: "CORS error"
**Solution**: Check `FRONTEND_URL` in backend `.env` matches your frontend URL

---

## 🎉 Success!

Once everything is connected, you should see:
- Real data from PostgreSQL in your dashboard
- Network requests to backend in DevTools
- Database records being created/updated
- Authentication working end-to-end

The mock data generators in `src/lib/financial-data.ts` can now be removed or kept for testing purposes.

---

## 📚 Next Steps

1. **Remove Creao Legacy Code** - See `CREAO_CLEANUP_GUIDE.md` (to be created)
2. **Add More Endpoints** - Extend backend for employees, products, etc.
3. **Implement Real-time Updates** - Add WebSocket support for SMS sync
4. **Add Data Validation** - Use Zod schemas on both frontend and backend
5. **Implement Caching** - Use Redis for frequently accessed data
6. **Add Monitoring** - Set up error tracking (Sentry) and analytics

---

**Last Updated**: 2024
**Version**: 1.0.0

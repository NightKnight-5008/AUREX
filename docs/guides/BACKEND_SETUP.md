# Backend Setup Guide

## Overview

This guide covers setting up the AUREX backend API with PostgreSQL database, environment variables, and connecting the frontend.

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL database (local, Supabase, or Docker)
- npm or yarn

---

## 2. Environment Variables

### Backend (.env)

Create `backend/.env` from the example:

```bash
cd backend
cp .env.example .env
```

Required variables:

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

```env
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

---

## 3. Database Initialization

### Option A: Using the Migration File

```bash
cd backend
psql -U your_username -d aurex_db -f migrations/001_initial_schema.sql
```

### Option B: Let the Server Initialize

The backend server will automatically create tables on first run:

```bash
cd backend
npm install
npm start
```

Check the console for "Database initialized successfully" message.

---

## 4. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The server should start on http://localhost:3001.

Test the health endpoint:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","timestamp":"2024-..."}
```

---

## 5. Connect Frontend to Backend

The following files are already configured:

- **API Client** (src/lib/api-client.ts) — Handles all HTTP requests, manages JWT token in-memory, base URL from VITE_API_URL env var
- **Auth Context** (src/contexts/auth-context.tsx) — Syncs token to apiClient on login, clears token on logout
- **Query Hooks**:
  - src/hooks/use-cards-queries.ts — Credit card CRUD
  - src/hooks/use-settings-queries.ts — User settings
  - src/hooks/use-sms-queries.ts — SMS logs (already has API integration)
  - src/hooks/use-transaction-queries.ts — Transactions (already has API integration)

---

## 6. Replace Mock Data with Real Data

### Current State (Mock Data)

```typescript
// src/routes/index.tsx - BEFORE
const [cards, setCards] = useState(() => generateSampleCards(countryCode));
const [transactions, setTransactions] = useState(() => generateSampleTransactions(countryCode));
```

### New State (Real Data)

```typescript
// src/routes/index.tsx - AFTER
import { useCards } from '@/hooks/use-cards-queries';
import { useTransactions } from '@/hooks/use-transaction-queries';
import { useUserSettings } from '@/hooks/use-settings-queries';

function App() {
  const { isAuthenticated, user } = useAuth();
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  // ... use real data in your components
}
```

---

## 7. Update Auth Flow

### Sign Up

```typescript
const signUp = async (email: string, password: string) => {
  try {
    const response = await apiClient.register(email, password, androidPassword);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### Sign In

```typescript
const signIn = async (email: string, password: string) => {
  try {
    const response = await apiClient.login(email, password);
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

## 8. API Endpoints Reference

| Operation | Method | Endpoint | Auth Required |
|-----------|--------|----------|---------------|
| **Auth** | | | |
| Register | POST | /api/auth/register | No |
| Login | POST | /api/auth/login | No |
| Get Current User | GET | /api/auth/me | Yes |
| **Cards** | | | |
| List Cards | GET | /api/credit-cards | Yes |
| Get Card | GET | /api/credit-cards/:id | Yes |
| Create Card | POST | /api/credit-cards | Yes |
| Update Card | PUT | /api/credit-cards/:id | Yes |
| Delete Card | DELETE | /api/credit-cards/:id | Yes |
| **Transactions** | | | |
| List Transactions | GET | /api/transactions | Yes |
| Create Transaction | POST | /api/transactions | Yes |
| Update Transaction | PUT | /api/transactions/:id | Yes |
| Delete Transaction | DELETE | /api/transactions/:id | Yes |
| **SMS** | | | |
| Get SMS Logs | GET | /api/sms/logs | Yes |
| Sync SMS | POST | /api/sms/sync | Yes |
| Search by Phone | GET | /api/sms/search?phone=... | Yes |
| **Settings** | | | |
| Get Settings | GET | /api/settings/:userId | Yes |
| Update Settings | PUT | /api/settings/:userId | Yes |
| **Health** | | | |
| Health Check | GET | /health | No |

---

## 9. Testing Commands

```bash
# Test backend health
curl http://localhost:3001/health

# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test authenticated endpoint (replace TOKEN)
curl http://localhost:3001/api/credit-cards \
  -H "Authorization: Bearer TOKEN"
```

---

## 10. Production Deployment

### Backend (Render.com)

The render.yaml file is already configured:

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

Update .env.production:

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_ENV=production
```

Build:

```bash
npm run build
```

Deploy the dist/ folder.

---

## 11. Troubleshooting

### Backend Won't Start
- Check PostgreSQL is running: `psql -U postgres -c "SELECT version();"`
- Verify database exists: `psql -U postgres -l | grep aurex`
- Check DATABASE_URL in backend/.env
- Ensure port 3001 is free

### Frontend Can't Connect
- Verify backend is running: `curl http://localhost:3001/health`
- Check VITE_API_URL in .env.local
- Clear browser cache
- Check CORS settings (already configured)

### Authentication Fails
- Check JWT_SECRET is set in backend/.env
- Sign out and sign in again
- Check token in DevTools -> Application -> Local Storage
- Verify token hasn't expired (24h default)

### Database Tables Missing
- Run migration: `psql -U user -d aurex_db -f backend/migrations/001_initial_schema.sql`
- Or let server initialize on first run
- Check tables: `psql -U user -d aurex_db -c "\dt"`

---

## 12. Quick Reference

### Database Quick Commands

```bash
# Connect to database
psql -U your_username -d aurex_db

# List tables
\dt

# View users
SELECT id, email, created_at FROM users;

# View cards
SELECT id, user_id, card_name, last_four FROM credit_cards;

# View transactions
SELECT id, user_id, transaction_type, amount FROM transactions LIMIT 10;

# View SMS logs
SELECT id, user_id, sender, received_at FROM sms_logs LIMIT 10;

# Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM credit_cards;
SELECT COUNT(*) FROM transactions;

# Exit psql
\q
```

### Component Update Pattern

```typescript
// BEFORE (Mock Data)
const [cards, setCards] = useState(() => generateSampleCards());

// AFTER (Real Data)
const { data: cards = [], isLoading } = useCards();
```

```typescript
// BEFORE (Manual State Update)
const handleCreate = (card) => {
  setCards([...cards, card]);
};

// AFTER (Mutation)
const createCard = useCreateCard();
const handleCreate = async (card) => {
  await createCard.mutateAsync(card);
  toast.success('Card created!');
};
```

---

## 13. Migration Priority

### Phase 1: Core Functionality (Do First)
1. Auth context (sign up, sign in) — 30 min
2. Credit cards in dashboard — 1 hour
3. Transactions in dashboard — 1 hour
4. User settings — 30 min

**Total: ~3 hours**

### Phase 2: Components (Do Next)
1. Card management components — 1 hour
2. Transaction list components — 1 hour
3. SMS log tab — 1 hour
4. Dashboard metrics — 1 hour

**Total: ~4 hours**

### Phase 3: Advanced Features (Do Later)
1. Analytics dashboard — 2 hours
2. Payroll (needs backend endpoints) — 3 hours
3. Products (needs backend endpoints) — 2 hours
4. Website metrics (needs backend endpoints) — 2 hours

**Total: ~9 hours**

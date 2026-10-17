# AUREX Backend Connection - Quick Reference

## 🚀 Quick Start Commands

```bash
# Setup (one time)
cp backend/.env.example backend/.env
cp .env.local.example .env.local
# Edit backend/.env with your database credentials

# Start everything (Mac/Linux)
chmod +x start-dev.sh && ./start-dev.sh

# Start everything (Windows)
start-dev.bat

# Or manually
cd backend && npm start          # Terminal 1
npm run dev                      # Terminal 2
```

## 📡 API Endpoints Reference

| Operation | Method | Endpoint | Auth Required |
|-----------|--------|----------|---------------|
| **Auth** |
| Register | POST | `/api/auth/register` | No |
| Login | POST | `/api/auth/login` | No |
| Get Current User | GET | `/api/auth/me` | Yes |
| **Cards** |
| List Cards | GET | `/api/credit-cards` | Yes |
| Get Card | GET | `/api/credit-cards/:id` | Yes |
| Create Card | POST | `/api/credit-cards` | Yes |
| Update Card | PUT | `/api/credit-cards/:id` | Yes |
| Delete Card | DELETE | `/api/credit-cards/:id` | Yes |
| **Transactions** |
| List Transactions | GET | `/api/transactions` | Yes |
| Create Transaction | POST | `/api/transactions` | Yes |
| Update Transaction | PUT | `/api/transactions/:id` | Yes |
| Delete Transaction | DELETE | `/api/transactions/:id` | Yes |
| **SMS** |
| Get SMS Logs | GET | `/api/sms/logs` | Yes |
| Sync SMS | POST | `/api/sms/sync` | Yes |
| Search by Phone | GET | `/api/sms/search?phone=...` | Yes |
| **Settings** |
| Get Settings | GET | `/api/settings/:userId` | Yes |
| Update Settings | PUT | `/api/settings/:userId` | Yes |
| **Health** |
| Health Check | GET | `/health` | No |

## 🎣 React Query Hooks

```typescript
// Cards
import { useCards, useCard, useCreateCard, useUpdateCard, useDeleteCard } from '@/hooks/use-cards-queries';

const { data: cards, isLoading } = useCards();
const { data: card } = useCard(cardId);
const createCard = useCreateCard();
const updateCard = useUpdateCard();
const deleteCard = useDeleteCard();

// Transactions
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/use-transaction-queries';

const { data: transactions } = useTransactions();
const createTxn = useCreateTransaction();

// SMS
import { useSmsLogs, useSearchSmsByPhoneNumber } from '@/hooks/use-sms-queries';

const { data: smsLogs } = useSmsLogs();
const { data: searchResult } = useSearchSmsByPhoneNumber(phoneNumber);

// Settings
import { useUserSettings, useUpdateUserSettings } from '@/hooks/use-settings-queries';

const { data: settings } = useUserSettings();
const updateSettings = useUpdateUserSettings();
```

## 💾 Database Quick Commands

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

# Delete test data
DELETE FROM credit_cards WHERE user_id = 'test-user-id';
DELETE FROM users WHERE email = 'test@example.com';

# Exit psql
\q
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/aurex_db
JWT_SECRET=your_secret_here
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_char_key_here
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

## 🧪 Testing Commands

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
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🐛 Debug Checklist

### Backend Issues
- [ ] PostgreSQL is running
- [ ] Database exists and is accessible
- [ ] `.env` file exists with correct values
- [ ] Port 3001 is not in use
- [ ] Dependencies installed (`npm install`)
- [ ] No errors in backend console

### Frontend Issues
- [ ] Backend is running and healthy
- [ ] `.env.local` has correct `VITE_API_URL`
- [ ] Dependencies installed (`npm install`)
- [ ] No CORS errors in browser console
- [ ] Token is being sent in requests
- [ ] React Query DevTools shows queries

### Database Issues
- [ ] Tables exist (`\dt` in psql)
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

## 📊 Component Update Pattern

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

## 🔍 Useful URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health Check: http://localhost:3001/health
- React Query DevTools: Bottom-right of frontend (dev mode)

## 📝 Common Code Snippets

### Create a New Query Hook

```typescript
// src/hooks/use-my-data-queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';

export function useMyData() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['myData', user?.id],
    queryFn: async () => {
      const response = await apiClient.getMyData(user.id);
      return response.data;
    },
    enabled: !!user?.id,
  });
}

export function useCreateMyData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      return apiClient.createMyData(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myData', user?.id] });
    },
  });
}
```

### Add New Backend Endpoint

```javascript
// backend/src/server.js
app.get('/api/my-endpoint', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM my_table WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
```

### Add Method to API Client

```typescript
// src/lib/api-client.ts
class ApiClient {
  // ... existing methods
  
  async getMyData(userId: string) {
    return this.request(`/api/my-endpoint`, {
      method: 'GET',
    });
  }
  
  async createMyData(userId: string, data: any) {
    return this.request(`/api/my-endpoint`, {
      method: 'POST',
      body: data,
    });
  }
}
```

## 🎯 Migration Priority

1. **High Priority** (Do First)
   - [ ] Auth context (sign up, sign in)
   - [ ] Credit cards (most used feature)
   - [ ] Transactions (core functionality)
   - [ ] User settings (country, currency)

2. **Medium Priority** (Do Next)
   - [ ] SMS logs
   - [ ] Dashboard metrics
   - [ ] Card management components
   - [ ] Transaction list components

3. **Low Priority** (Do Later)
   - [ ] Analytics dashboard
   - [ ] Payroll (needs backend endpoints)
   - [ ] Products (needs backend endpoints)
   - [ ] Website metrics (needs backend endpoints)

## 📚 Documentation Files

- `CONNECTION_SUMMARY.md` - Overview and what's been done
- `BACKEND_CONNECTION_GUIDE.md` - Detailed step-by-step guide
- `EXAMPLE_COMPONENT_UPDATE.md` - Code examples
- `QUICK_REFERENCE.md` - This file (quick lookup)

## 🆘 Get Help

1. Check backend console for errors
2. Check browser DevTools console
3. Check React Query DevTools
4. Check database with psql
5. Review documentation files
6. Test API with curl

---

**Print this page for quick reference while coding!**

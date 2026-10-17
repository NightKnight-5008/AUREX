# Step 2: Backend API Setup

This guide shows you how to set up a backend API to replace the mock data with real database-backed endpoints.

## Overview

You need a backend to:
- Store and retrieve financial data (cards, transactions, employees)
- Handle user authentication
- Process SMS events
- Generate reports
- Integrate with Google APIs

---

## Option 1: Node.js + Express + PostgreSQL (Recommended)

### Setup Instructions

1. **Create backend directory**:
```bash
mkdir aurex-backend
cd aurex-backend
npm init -y
```

2. **Install dependencies**:
```bash
npm install express pg cors dotenv bcrypt jsonwebtoken
npm install --save-dev typescript @types/express @types/node @types/bcrypt @types/jsonwebtoken ts-node nodemon
```

3. **Create `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

4. **Create database schema** (`schema.sql`):
```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company cards table
CREATE TABLE company_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  card_number_last4 VARCHAR(4) NOT NULL,
  card_holder VARCHAR(255) NOT NULL,
  card_type VARCHAR(50) NOT NULL,
  bank VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  credit_limit DECIMAL(12, 2),
  current_balance DECIMAL(12, 2) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES company_cards(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EGP',
  description TEXT,
  category VARCHAR(100),
  transaction_date TIMESTAMP NOT NULL,
  merchant VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  salary DECIMAL(12, 2),
  position VARCHAR(255),
  department VARCHAR(255),
  hire_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS events table
CREATE TABLE sms_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  card_id INTEGER REFERENCES company_cards(id),
  message TEXT NOT NULL,
  amount DECIMAL(12, 2),
  transaction_type VARCHAR(50),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_sms_events_user_id ON sms_events(user_id);
CREATE INDEX idx_company_cards_user_id ON company_cards(user_id);
```

5. **Create basic server** (`src/index.ts`):
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import cardsRoutes from './routes/cards';
import transactionsRoutes from './routes/transactions';
import employeesRoutes from './routes/employees';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/employees', employeesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

6. **Create authentication middleware** (`src/middleware/auth.ts`):
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user as AuthRequest['user'];
    next();
  });
};
```

7. **Create routes** (`src/routes/cards.ts` example):
```typescript
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import pool from '../db';

const router = express.Router();

// Get all cards for authenticated user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM company_cards WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Create new card
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { cardHolder, cardType, bank, creditLimit } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO company_cards (user_id, card_holder, card_type, bank, credit_limit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user!.id, cardHolder, cardType, bank, creditLimit]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

export default router;
```

8. **Environment variables** (`.env`):
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aurex_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Option 2: Supabase (Fastest Setup)

Supabase provides instant backend with database, auth, and APIs.

### Steps:

1. **Create Supabase project**: https://supabase.com
2. **Run SQL schema** (use schema.sql from above)
3. **Enable Row Level Security** (RLS)
4. **Update frontend** (`src/lib/supabase.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

5. **Replace API calls** in frontend:
```typescript
// Instead of fetch('/api/cards')
const { data: cards, error } = await supabase
  .from('company_cards')
  .select('*')
  .order('created_at', { ascending: false });
```

---

## Option 3: Firebase

1. Create Firebase project
2. Enable Firestore Database
3. Enable Authentication
4. Use Firebase SDK in frontend

---

## Update Frontend to Use Backend

### 1. Create API client (`src/lib/api-client.ts`):

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiClient {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Add PUT, DELETE, etc.
}

export const apiClient = new ApiClient();
```

### 2. Create React Query hooks (`src/hooks/use-cards.ts`):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CompanyCard } from '@/types/financial';

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: () => apiClient.get<CompanyCard[]>('/api/cards'),
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardData: Partial<CompanyCard>) =>
      apiClient.post<CompanyCard>('/api/cards', cardData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}
```

### 3. Use in components:

```typescript
// Instead of useState with mock data
const { data: cards = [], isLoading, error } = useCards();
```

---

## Deploy Backend

### Option A: Railway.app (Easiest)
1. Connect GitHub repo
2. Add PostgreSQL database
3. Deploy automatically

### Option B: Heroku
1. `heroku create aurex-api`
2. `heroku addons:create heroku-postgresql:mini`
3. `git push heroku main`

### Option C: AWS/DigitalOcean/VPS
- Set up PM2 for process management
- Use Nginx as reverse proxy
- SSL with Let's Encrypt

---

## Checklist

- [ ] Database created and schema applied
- [ ] Backend server running locally
- [ ] Authentication endpoints working
- [ ] CRUD endpoints for cards/transactions/employees
- [ ] Frontend updated to use API client
- [ ] Environment variables configured
- [ ] Backend deployed to production
- [ ] Frontend points to production API

---

**Next**: Proceed to **DEPLOYMENT-GUIDE-03-ELECTRON-DESKTOP-APP.md**

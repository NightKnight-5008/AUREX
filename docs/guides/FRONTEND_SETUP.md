# Frontend Setup Guide

## Overview

This guide covers setting up the AUREX React frontend with environment variables, connecting to the backend API, and removing mock data.

---

## 1. Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see BACKEND_SETUP.md)

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Environment Variables

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

For production:

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_ENV=production
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com/oauth/callback
```

---

## 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 5. Remove Mock Data

The AUREX project currently uses mock data in several places for demonstration purposes. Here is what to remove or modify:

### 5.1 Financial Data Generation (src/lib/financial-data.ts)

Replace mock data generators with empty arrays or API calls:

```typescript
// BEFORE: These functions generate mock data
export function generateSampleCards(): CompanyCard[] { ... }
export function generateSampleTransactions(): FinancialTransaction[] { ... }
export function generateSampleSmsEvents(): SmsEvent[] { ... }

// AFTER: Replace with empty arrays or API calls
export function generateSampleCards(): CompanyCard[] {
  return []; // Empty until you connect real data
}
```

### 5.2 Main Route File (src/routes/index.tsx)

Replace mock data with real data:

```typescript
// BEFORE
const [cards, setCards] = useState<CompanyCard[]>(() => generateSampleCards());

// AFTER
const [cards, setCards] = useState<CompanyCard[]>([]);

useEffect(() => {
  async function loadData() {
    try {
      const cardsResponse = await fetch('/api/cards');
      setCards(await cardsResponse.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }
  loadData();
}, []);
```

### 5.3 Mock User Authentication (src/contexts/auth-context.tsx)

```typescript
// BEFORE: Mock authentication
const login = async (username: string, password: string) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (username === 'admin' && password === 'admin') {
    setUser({ username, role: 'admin' });
    return true;
  }
  return false;
};

// AFTER: Real authentication
const login = async (username: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Authentication failed');
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
};
```

---

## 6. Update Components to Use Real Data

### Example 1: Simple Card List Component

```typescript
// BEFORE (Mock Data)
import { useState, useEffect } from 'react';
import { generateSampleCards } from '@/lib/financial-data';

export function MyCardList() {
  const [cards, setCards] = useState<CompanyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockCards = generateSampleCards('EG');
    setCards(mockCards);
    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{cards.map(card => <div key={card.id}>{card.cardName}</div>)}</div>;
}

// AFTER (Real Data)
import { useCards } from '@/hooks/use-cards-queries';

export function MyCardList() {
  const { data: cards = [], isLoading, error } = useCards();
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>{cards.map(card => <div key={card.id}>{card.cardName}</div>)}</div>;
}
```

### Example 2: Component with Create/Update/Delete

```typescript
// AFTER (Real Data with Mutations)
import { useCards, useCreateCard, useUpdateCard, useDeleteCard } from '@/hooks/use-cards-queries';
import { toast } from 'sonner';

export function CardManager() {
  const { data: cards = [], isLoading } = useCards();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();

  const handleCreate = async (newCard: Partial<CompanyCard>) => {
    try {
      await createCard.mutateAsync(newCard);
      toast.success('Card created successfully!');
    } catch (error) {
      toast.error('Failed to create card');
    }
  };
  // ... similar for update and delete
}
```

### Example 3: Dashboard with Multiple Data Sources

```typescript
// AFTER (Multiple Query Hooks)
import { useCards } from '@/hooks/use-cards-queries';
import { useTransactions } from '@/hooks/use-transaction-queries';

export function Dashboard() {
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: transactions = [], isLoading: txnLoading } = useTransactions();
  const isLoading = cardsLoading || txnLoading;

  if (isLoading) return <div>Loading dashboard...</div>;
  return <div>{/* Component UI */}</div>;
}
```

---

## 7. Common Patterns

### Pattern 1: Loading States

```typescript
const { data, isLoading, error } = useCards();
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <CardList cards={data} />;
```

### Pattern 2: Refetch on Demand

```typescript
const { data, refetch } = useCards();
<button onClick={() => refetch()}>Refresh Cards</button>
```

### Pattern 3: Dependent Queries

```typescript
const { data: card } = useCard(cardId);
const { data: transactions } = useTransactionsByCard(card?.id, {
  enabled: !!card?.id,
});
```

### Pattern 4: Optimistic Updates

```typescript
const updateCard = useUpdateCard();
const queryClient = useQueryClient();

const handleSubmit = async (updates: Partial<CompanyCard>) => {
  queryClient.setQueryData(['cards', user?.id], (old: CompanyCard[]) =>
    old.map(c => c.id === card.id ? { ...c, ...updates } : c)
  );
  try {
    await updateCard.mutateAsync({ cardId: card.id, cardData: updates });
  } catch (error) {
    queryClient.invalidateQueries({ queryKey: ['cards', user?.id] });
  }
};
```

---

## 8. TypeScript Conventions

- `strict: false` but `noImplicitAny: true` + `strictNullChecks: true`
- `verbatimModuleSyntax: true` — MUST use `import { type Foo }` for type-only imports
- `moduleResolution: "bundler"` — uses Vite's module resolution
- `target: "ES2022"` — modern JS features available
- Path alias: Always use `@/` to import from `src/`
- File naming: kebab-case.tsx for files, PascalCase for component names
- Icons: Only use lucide-react
- Component priority: Use existing shadcn/ui -> custom components -> create new

---

## 9. Vite Build Configuration

- Dev server: host "0.0.0.0", port 3000, usePolling: true
- Base path: Dynamic — /${TENANT_ID}/ if TENANT_ID env var is set, otherwise /
- Build: Minification disabled for memory savings
- Chunk warning limit: 1500 KB
- Code splitting: autoCodeSplitting: false in TanStack Router
- SVGR plugin: Allows importing SVGs as React components

---

## 10. CSS & Theming

### Brand Colors
- Primary: #585BFF (vibrant blue)
- Secondary: #813DFF (purple)
- Foreground: #2E2A2A (dark charcoal)

### Architecture
- styles.css — Main stylesheet using @import "tailwindcss" (Tailwind v4 syntax)
- Uses oklch() color space for all CSS variables
- @plugin "tailwindcss-animate" for animation utilities
- @custom-variant dark (&:is(.dark *)) — dark mode via .dark class
- @theme inline { ... } maps CSS variables -> Tailwind color tokens

---

## 11. Testing Your Changes

### 1. Check Network Tab
- Open DevTools -> Network
- Look for requests to http://localhost:3001/api/*
- Verify request/response data

### 2. Check React Query DevTools
- Look for your queries in the DevTools panel
- Check query status (loading, success, error)
- Verify cache updates after mutations

### 3. Check Database

```sql
SELECT * FROM credit_cards WHERE user_id = 'your-user-id';
SELECT * FROM credit_cards WHERE id = 'card-id';
```

---

## 12. Migration Checklist

For each component:
- [ ] Identify mock data generators being used
- [ ] Find or create corresponding query hook
- [ ] Replace useState + useEffect with query hook
- [ ] Update loading states to use isLoading
- [ ] Add error handling with error state
- [ ] Replace manual state updates with mutations
- [ ] Add toast notifications for user feedback
- [ ] Test create/update/delete operations
- [ ] Verify data persists after page refresh
- [ ] Check React Query DevTools for query status

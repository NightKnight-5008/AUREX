# Example: Converting a Component from Mock Data to Real Data

This guide shows you exactly how to update a component to use real backend data instead of mock data.

## Example 1: Simple Card List Component

### BEFORE (Mock Data)

```typescript
// MyCardList.tsx - BEFORE
import { useState, useEffect } from 'react';
import { generateSampleCards } from '@/lib/financial-data';
import type { CompanyCard } from '@/types/financial';

export function MyCardList() {
  const [cards, setCards] = useState<CompanyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate mock data
    const mockCards = generateSampleCards('EG');
    setCards(mockCards);
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>My Cards ({cards.length})</h2>
      {cards.map(card => (
        <div key={card.id}>
          <h3>{card.cardName}</h3>
          <p>Balance: ${card.availableBalance}</p>
        </div>
      ))}
    </div>
  );
}
```

### AFTER (Real Data)

```typescript
// MyCardList.tsx - AFTER
import { useCards } from '@/hooks/use-cards-queries';
import type { CompanyCard } from '@/types/financial';

export function MyCardList() {
  // Use the query hook - it handles loading, error, and data states
  const { data: cards = [], isLoading, error } = useCards();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h2>My Cards ({cards.length})</h2>
      {cards.map(card => (
        <div key={card.id}>
          <h3>{card.cardName}</h3>
          <p>Balance: ${card.availableBalance}</p>
        </div>
      ))}
    </div>
  );
}
```

**Changes:**
- ❌ Removed `useState` and `useEffect`
- ❌ Removed `generateSampleCards()`
- ✅ Added `useCards()` hook
- ✅ Automatic loading and error handling
- ✅ Automatic refetching and caching

---

## Example 2: Component with Create/Update/Delete

### BEFORE (Mock Data with Local State)

```typescript
// CardManager.tsx - BEFORE
import { useState } from 'react';
import { generateSampleCards } from '@/lib/financial-data';
import type { CompanyCard } from '@/types/financial';

export function CardManager() {
  const [cards, setCards] = useState(() => generateSampleCards('EG'));

  const handleCreate = (newCard: CompanyCard) => {
    // Just update local state
    setCards([...cards, newCard]);
  };

  const handleUpdate = (cardId: string, updates: Partial<CompanyCard>) => {
    // Just update local state
    setCards(cards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    ));
  };

  const handleDelete = (cardId: string) => {
    // Just update local state
    setCards(cards.filter(card => card.id !== cardId));
  };

  return (
    <div>
      {/* Component UI */}
    </div>
  );
}
```

### AFTER (Real Data with Mutations)

```typescript
// CardManager.tsx - AFTER
import { useCards, useCreateCard, useUpdateCard, useDeleteCard } from '@/hooks/use-cards-queries';
import type { CompanyCard } from '@/types/financial';
import { toast } from 'sonner';

export function CardManager() {
  // Query for reading data
  const { data: cards = [], isLoading } = useCards();
  
  // Mutations for writing data
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

  const handleUpdate = async (cardId: string, updates: Partial<CompanyCard>) => {
    try {
      await updateCard.mutateAsync({ cardId, cardData: updates });
      toast.success('Card updated successfully!');
    } catch (error) {
      toast.error('Failed to update card');
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      await deleteCard.mutateAsync(cardId);
      toast.success('Card deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Component UI - same as before */}
      {/* But now it automatically refetches after mutations! */}
    </div>
  );
}
```

**Changes:**
- ✅ Added mutation hooks: `useCreateCard()`, `useUpdateCard()`, `useDeleteCard()`
- ✅ Async handlers with try/catch
- ✅ Toast notifications for user feedback
- ✅ Automatic refetch after mutations (handled by React Query)
- ✅ Loading states for mutations: `createCard.isPending`

---

## Example 3: Dashboard with Multiple Data Sources

### BEFORE (Multiple Mock Data Generators)

```typescript
// Dashboard.tsx - BEFORE
import { useState, useEffect } from 'react';
import {
  generateSampleCards,
  generateSampleTransactions,
  generateSampleEmployees,
} from '@/lib/financial-data';

export function Dashboard() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate all mock data
    setCards(generateSampleCards('EG'));
    setTransactions(generateSampleTransactions('EG'));
    setEmployees(generateSampleEmployees('EG'));
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <CardSection cards={cards} />
      <TransactionSection transactions={transactions} />
      <EmployeeSection employees={employees} />
    </div>
  );
}
```

### AFTER (Multiple Query Hooks)

```typescript
// Dashboard.tsx - AFTER
import { useCards } from '@/hooks/use-cards-queries';
import { useTransactions } from '@/hooks/use-transaction-queries';
import { useEmployees } from '@/hooks/use-employee-queries'; // You'll create this

export function Dashboard() {
  // Fetch all data in parallel
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: transactions = [], isLoading: txnLoading } = useTransactions();
  const { data: employees = [], isLoading: empLoading } = useEmployees();

  // Combined loading state
  const isLoading = cardsLoading || txnLoading || empLoading;

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <CardSection cards={cards} />
      <TransactionSection transactions={transactions} />
      <EmployeeSection employees={employees} />
    </div>
  );
}
```

**Benefits:**
- ✅ All queries run in parallel (faster!)
- ✅ Each query has independent loading/error states
- ✅ Automatic caching and refetching
- ✅ No manual state management
- ✅ Cleaner, more maintainable code

---

## Example 4: Form with Optimistic Updates

### AFTER (Advanced Pattern)

```typescript
// CardEditForm.tsx - AFTER
import { useUpdateCard } from '@/hooks/use-cards-queries';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';

export function CardEditForm({ card }: { card: CompanyCard }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateCard = useUpdateCard();

  const handleSubmit = async (updates: Partial<CompanyCard>) => {
    // Optimistic update - update UI immediately
    queryClient.setQueryData(['cards', user?.id], (old: CompanyCard[]) => 
      old.map(c => c.id === card.id ? { ...c, ...updates } : c)
    );

    try {
      // Send to backend
      await updateCard.mutateAsync({ 
        cardId: card.id, 
        cardData: updates 
      });
      toast.success('Card updated!');
    } catch (error) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['cards', user?.id] });
      toast.error('Update failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

**Advanced Features:**
- ✅ Optimistic updates (instant UI feedback)
- ✅ Automatic rollback on error
- ✅ Manual cache manipulation
- ✅ Better user experience

---

## Example 5: Updating the Main Dashboard (index.tsx)

### Current State

```typescript
// src/routes/index.tsx - CURRENT
function App() {
  const [cards, setCards] = useState(() => generateSampleCards(countryCode));
  const [transactions, setTransactions] = useState(() => generateSampleTransactions(countryCode));
  const [smsEvents, setSmsEvents] = useState(() => generateSampleSmsEvents(countryCode));
  
  // ... rest of component
}
```

### Updated State

```typescript
// src/routes/index.tsx - UPDATED
import { useCards } from '@/hooks/use-cards-queries';
import { useTransactions } from '@/hooks/use-transaction-queries';
import { useSmsLogs } from '@/hooks/use-sms-queries';
import { useUserSettings } from '@/hooks/use-settings-queries';

function App() {
  const { user } = useAuth();
  
  // Fetch real data
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: transactions = [], isLoading: txnLoading } = useTransactions();
  const { data: smsLogs = [], isLoading: smsLoading } = useSmsLogs();
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  
  // Use settings for country/currency
  const countryCode = settings?.country || DEFAULT_COUNTRY;
  const currency = settings?.currency || 'USD';
  
  // Combined loading state
  const isLoadingData = cardsLoading || txnLoading || smsLoading || settingsLoading;
  
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading your data...</span>
      </div>
    );
  }
  
  // Convert backend data to enhanced cards if needed
  const enhancedCards = useMemo(
    () => convertToEnhancedCards(cards),
    [cards]
  );
  
  // Calculate metrics from real transactions
  const metrics = useMemo(
    () => calculateMetricsFromTransactions(transactions, cards),
    [transactions, cards]
  );
  
  // ... rest of component uses real data
}
```

---

## Common Patterns

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

<button onClick={() => refetch()}>
  Refresh Cards
</button>
```

### Pattern 3: Dependent Queries

```typescript
// Only fetch transactions after we have a card ID
const { data: card } = useCard(cardId);
const { data: transactions } = useTransactionsByCard(card?.id, {
  enabled: !!card?.id, // Only run if card exists
});
```

### Pattern 4: Mutation with Callback

```typescript
const createCard = useCreateCard();

const handleCreate = () => {
  createCard.mutate(newCardData, {
    onSuccess: (data) => {
      console.log('Created card:', data);
      navigate(`/cards/${data.id}`);
    },
    onError: (error) => {
      console.error('Failed:', error);
    },
  });
};
```

---

## Migration Checklist

For each component:

- [ ] Identify mock data generators being used
- [ ] Find or create corresponding query hook
- [ ] Replace `useState` + `useEffect` with query hook
- [ ] Update loading states to use `isLoading`
- [ ] Add error handling with `error` state
- [ ] Replace manual state updates with mutations
- [ ] Add toast notifications for user feedback
- [ ] Test create/update/delete operations
- [ ] Verify data persists after page refresh
- [ ] Check React Query DevTools for query status

---

## Testing Your Changes

### 1. Check Network Tab
- Open DevTools → Network
- Look for requests to `http://localhost:3001/api/*`
- Verify request/response data

### 2. Check React Query DevTools
- Look for your queries in the DevTools panel
- Check query status (loading, success, error)
- Verify cache updates after mutations

### 3. Check Database
```sql
-- Verify data was created
SELECT * FROM credit_cards WHERE user_id = 'your-user-id';

-- Verify data was updated
SELECT * FROM credit_cards WHERE id = 'card-id';

-- Verify data was deleted
SELECT * FROM credit_cards WHERE id = 'deleted-card-id';
-- Should return no rows
```

### 4. Test Offline Behavior
- Disconnect network
- Try to create/update data
- Should show error message
- Reconnect network
- Data should sync

---

## Pro Tips

1. **Start Small** - Update one component at a time
2. **Keep Mock Data** - Useful for testing UI without backend
3. **Use DevTools** - React Query DevTools shows everything
4. **Add Loading States** - Better UX during data fetching
5. **Handle Errors** - Always show user-friendly error messages
6. **Use Optimistic Updates** - For instant UI feedback
7. **Test Edge Cases** - Empty data, slow network, errors
8. **Cache Wisely** - Adjust `staleTime` based on data freshness needs

---

**Ready to start?** Pick a simple component and follow the patterns above!

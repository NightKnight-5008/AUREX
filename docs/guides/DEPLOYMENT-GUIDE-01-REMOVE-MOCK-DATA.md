# Step 1: Remove Mock Data from AUREX

This guide will help you remove all mock/sample data from the project to make it production-ready.

## Overview

The AUREX project currently uses mock data in several places for demonstration purposes. This guide shows you exactly what to remove or modify.

---

## Files to Modify

### 1. Financial Data Generation (`src/lib/financial-data.ts`)

**What it does**: Generates sample cards, transactions, SMS events, employees, etc.

**How to remove**:

```typescript
// BEFORE: These functions generate mock data
export function generateSampleCards(): CompanyCard[] { ... }
export function generateSampleTransactions(): FinancialTransaction[] { ... }
export function generateSampleSmsEvents(): SmsEvent[] { ... }
export function generateSampleEmployees(): Employee[] { ... }

// AFTER: Replace with empty arrays or API calls
export function generateSampleCards(): CompanyCard[] {
  return []; // Empty until you connect real data
}

export function generateSampleTransactions(): FinancialTransaction[] {
  return []; // Empty until you connect real data
}

export function generateSampleSmsEvents(): SmsEvent[] {
  return []; // Empty until you connect real data
}

export function generateSampleEmployees(): Employee[] {
  return []; // Empty until you connect real data
}
```

**OR** completely remove these functions and replace their usage with API calls.

---

### 2. Main Route File (`src/routes/index.tsx`)

**Location**: Lines ~80-110

**Current code**:
```typescript
// Initialize with sample data
const [cards, setCards] = useState<CompanyCard[]>(() => generateSampleCards());
const [transactions, setTransactions] = useState<FinancialTransaction[]>(() =>
  generateSampleTransactions()
);
const [smsEvents, setSmsEvents] = useState<SmsEvent[]>(() => generateSampleSmsEvents());
const [employees, setEmployees] = useState<Employee[]>(() =>
  generateSampleEmployees()
);
```

**Production-ready code**:
```typescript
// Start with empty data - will be loaded from API
const [cards, setCards] = useState<CompanyCard[]>([]);
const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
const [smsEvents, setSmsEvents] = useState<SmsEvent[]>([]);
const [employees, setEmployees] = useState<Employee[]>([]);

// Add useEffect to load real data
useEffect(() => {
  // Load cards from your API
  async function loadData() {
    try {
      // Replace with your actual API endpoints
      const cardsResponse = await fetch('/api/cards');
      const cardsData = await cardsResponse.json();
      setCards(cardsData);

      const transactionsResponse = await fetch('/api/transactions');
      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData);

      // ... load other data
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  loadData();
}, []);
```

---

### 3. Sample Metrics (`src/lib/financial-data.ts`)

**Functions to replace**:
- `generateSampleMetrics()` - Replace with API call to your metrics endpoint
- `generateSampleProducts()` - Replace with real product data
- `generateSampleWebsiteMetrics()` - Replace with Google Analytics or your analytics API
- `generateSampleTaxConfig()` - Replace with user's actual tax configuration

**Production approach**:
```typescript
// Remove all these from src/routes/index.tsx:
const monthlyMetrics = useMemo(() => generateSampleMetrics(), []);
const products = useMemo(() => generateSampleProducts(), []);
const websiteMetrics = useMemo(() => generateSampleWebsiteMetrics(), []);

// Replace with API calls using TanStack Query
import { useQuery } from '@tanstack/react-query';

const { data: monthlyMetrics = [] } = useQuery({
  queryKey: ['monthly-metrics'],
  queryFn: async () => {
    const response = await fetch('/api/metrics/monthly');
    return response.json();
  }
});

const { data: products = [] } = useQuery({
  queryKey: ['products'],
  queryFn: async () => {
    const response = await fetch('/api/products');
    return response.json();
  }
});
```

---

### 4. Mock User Authentication (`src/contexts/auth-context.tsx`)

**Current**: Uses hardcoded mock authentication

**Location**: Check the `login` function

**What to change**:
```typescript
// BEFORE: Mock authentication
const login = async (username: string, password: string) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (username === 'admin' && password === 'admin') {
    setUser({ username, role: 'admin' });
    setIsAuthenticated(true);
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

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    setUser(data.user);
    setIsAuthenticated(true);

    // Store JWT token
    localStorage.setItem('auth_token', data.token);

    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
};
```

---

### 5. Mock SMS Processing (`src/lib/sms-processor.ts`)

**Current**: Simulates SMS processing

**What to do**:
- Connect to real SMS gateway API (Twilio, AWS SNS, etc.)
- Or remove SMS features if not needed

**Location**: `processSmsEventsBatch()` function

---

## Files You Can Safely Delete (Optional)

These files contain only mock data and can be removed once you have real data:

1. **Remove mock data generators** (if fully replaced):
   - Parts of `src/lib/financial-data.ts` (keep utility functions, remove generators)

2. **Sample data comments**: Search for "mock", "sample", "demo" comments and remove them

---

## Configuration Changes

### Update Environment Variables

Create a `.env.production` file:

```env
# API Configuration
VITE_API_BASE_URL=https://your-production-api.com
VITE_API_TIMEOUT=30000

# Authentication
VITE_AUTH_ENABLED=true

# Google OAuth (if using)
VITE_GOOGLE_CLIENT_ID=your-real-google-client-id
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com/oauth/callback

# Feature Flags
VITE_ENABLE_SMS=true
VITE_ENABLE_GOOGLE_INTEGRATION=true

# Analytics
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

---

## Testing After Removal

After removing mock data, test these scenarios:

1. **Empty State**: App should handle zero cards/transactions gracefully
2. **Loading State**: Show loading indicators while fetching real data
3. **Error Handling**: Display errors if API calls fail
4. **Authentication**: Verify login/logout works with real backend

---

## Next Steps

After completing this step:
- Proceed to **DEPLOYMENT-GUIDE-02-BACKEND-SETUP.md** to set up your backend API
- Or proceed to **DEPLOYMENT-GUIDE-03-ELECTRON-DESKTOP-APP.md** to create desktop version

---

## Checklist

- [ ] Replaced `generateSampleCards()` with API call or empty array
- [ ] Replaced `generateSampleTransactions()` with API call or empty array
- [ ] Replaced `generateSampleSmsEvents()` with API call or empty array
- [ ] Replaced `generateSampleEmployees()` with API call or empty array
- [ ] Updated authentication to use real backend
- [ ] Created `.env.production` file
- [ ] Tested app with no data (empty state)
- [ ] Tested app with real data
- [ ] Removed mock data comments

---

**Status**: Ready for Step 2 - Backend Setup

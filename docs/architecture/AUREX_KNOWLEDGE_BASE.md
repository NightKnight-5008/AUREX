# AUREX — Complete Application Knowledge Base

## 1. The Core Idea

**AUREX** (Advanced Financial Intelligence Platform) is an **enterprise-grade financial management dashboard** designed for mid-to-large companies. It provides:

- **Real-time credit card portfolio management** across 1,000+ company cards
- **Automated SMS-based transaction detection** synced from an Android companion app
- **Payroll management** for 500+ employees with salary tracking, bonuses & sales data
- **AI-powered financial insights** via a built-in chat assistant
- **Google Workspace integration** (Calendar, Tasks, Docs) for payment reminders & automated reports
- **Tax calculation** with multi-country support (Egypt, US, UK, India, Canada, etc.)
- **Shopify e-commerce integration** for revenue tracking
- **Enterprise analytics** with website metrics, product performance, and conversion funnels

The app models an **Egyptian multi-million-pound company** by default (~45M EGP monthly revenue, 575 employees, 1,250 company cards, 3,500 SMS events). It supports switching between countries with different currencies, tax brackets, and locale formatting.

> **Current State:** The frontend currently operates on mock/sample data generators. A PostgreSQL backend exists and is ready for production use, but the frontend needs to be wired to the API instead of sample data.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript |
| **Routing** | TanStack Router (file-based) |
| **Server State** | TanStack Query (React Query) |
| **Client State** | Zustand + React Context + localStorage |
| **Styling** | Tailwind CSS v4 + shadcn/ui (40+ components) |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **Build Tool** | Vite (via rolldown-vite) |
| **Backend** | Express.js (Node.js) |
| **Database** | PostgreSQL (via `pg` driver) |
| **Auth** | JWT tokens (custom) + Google OAuth 2.0 PKCE |
| **Testing** | Vitest + React Testing Library |
| **Linting** | Biome + ESLint |

---

## 3. Frontend Architecture

### 3.1 Entry Point & Providers

```
main.tsx → ThemeProvider → QueryClientProvider → RouterProvider
               ↓
         __root.tsx → AuthProvider → ErrorBoundary → Outlet → index.tsx
```

- [main.tsx](file:///d:/dd/AUREX/src/main.tsx) — App entry: creates QueryClient (5min stale, 10min GC), TanStack Router, renders providers
- [__root.tsx](file:///d:/dd/AUREX/src/routes/__root.tsx) — Root route: wraps everything in [AuthProvider](file:///d:/dd/AUREX/src/contexts/auth-context.tsx#37-283), `ErrorBoundary`, and `TanStackRouterDevtools`
- [index.tsx](file:///d:/dd/AUREX/src/routes/index.tsx) — **The main dashboard** (only route): Auth gate → 7-tab dashboard

### 3.2 Dashboard Tabs

The single route (`/`) renders a tabbed dashboard with **7 active tabs**:

| Tab | Component | Description |
|-----|-----------|-------------|
| **Overview** | [OverviewTab](file:///d:/dd/AUREX/src/components/OverviewTab.tsx#21-254) | KPI cards (Revenue, Expenses, Payroll, Net Profit, Net Worth), 6-month trend table, recent transactions with edit |
| **Metrics** | `MetricsTab` | Enterprise analytics: `AnalyticsDashboard` (data viz with Recharts), `SalesSection`, `CardsSection`, `WebsiteSection`, `WorldHeatmap` |
| **Cards** | `CardManagementEnterprise` | Full credit/debit card portfolio — search, filter, sort 1,250 cards; view utilization, debt, payment status |
| **Payroll** | `PayrollTabEnterprise` | Employee management for 575+ employees — salary, department, sales data, bonuses, CSV import/export |
| **SMS Log** | [SmsLogTab](file:///d:/dd/AUREX/src/components/SmsLogTab.tsx#32-813) | Semi-account selector → phone number search → SMS messages with AI classification, confidence scores, sync status, E2EE badges |
| **Tax** | `TaxCalculator` | Country-specific tax bracket calculation with yearly metrics |
| **Settings** | [UserSettings](file:///d:/dd/AUREX/src/lib/api-client.ts#262-272) | Country/locale selector, `GeneralSettings`, `SecuritySettings`, `ShopifySettings`, `GoogleConnectionOnboarding`, sign-out |

### 3.3 Key Components (32 files)

**Dashboard & Data Display:**
- [OverviewTab.tsx](file:///d:/dd/AUREX/src/components/OverviewTab.tsx) — KPI grid + trend table + transaction list
- [AnalyticsDashboard.tsx](file:///d:/dd/AUREX/src/components/AnalyticsDashboard.tsx) — Recharts-based data visualization (~44KB, largest component)
- [DashboardCardsSection.tsx](file:///d:/dd/AUREX/src/components/DashboardCardsSection.tsx) — Card summary cards
- [MetricsTab.tsx](file:///d:/dd/AUREX/src/components/MetricsTab.tsx) — Aggregates analytics sub-components
- [SalesSection.tsx](file:///d:/dd/AUREX/src/components/SalesSection.tsx) — Product sales metrics
- [WebsiteSection.tsx](file:///d:/dd/AUREX/src/components/WebsiteSection.tsx) — Website conversion funnel
- [WorldHeatmap.tsx](file:///d:/dd/AUREX/src/components/WorldHeatmap.tsx) — Geographic order distribution

**Card Management:**
- [CardManagement.tsx](file:///d:/dd/AUREX/src/components/CardManagement.tsx) — Base card management (~44KB)
- [CardManagementEnterprise.tsx](file:///d:/dd/AUREX/src/components/enterprise/CardManagementEnterprise.tsx) — Enterprise version with enhanced features (~27KB)

**Payroll:**
- [PayrollTab.tsx](file:///d:/dd/AUREX/src/components/PayrollTab.tsx) — Base payroll (~41KB)
- [PayrollTabEnterprise.tsx](file:///d:/dd/AUREX/src/components/enterprise/PayrollTabEnterprise.tsx) — Enterprise payroll (~29KB)

**SMS System:**
- [SmsLogTab.tsx](file:///d:/dd/AUREX/src/components/SmsLogTab.tsx) — Full SMS log viewer with AI processing details (~45KB)
- [SmsEventLogger.tsx](file:///d:/dd/AUREX/src/components/SmsEventLogger.tsx) — SMS event processing (~24KB)
- [SmsProcessingIndicator.tsx](file:///d:/dd/AUREX/src/components/SmsProcessingIndicator.tsx) — Live SMS processing status
- [SmsPhoneConfig.tsx](file:///d:/dd/AUREX/src/components/SmsPhoneConfig.tsx) — Phone number configuration
- [AndroidSyncIndicator.tsx](file:///d:/dd/AUREX/src/components/AndroidSyncIndicator.tsx) — Android app sync status

**AI & Integrations:**
- [AIChat.tsx](file:///d:/dd/AUREX/src/components/AIChat.tsx) — AI financial assistant with local data analysis + GPT fallback
- [GoogleConnectionOnboarding.tsx](file:///d:/dd/AUREX/src/components/GoogleConnectionOnboarding.tsx) — Google OAuth setup wizard
- [ShopifySettings.tsx](file:///d:/dd/AUREX/src/components/ShopifySettings.tsx) — Shopify store connection

**Settings & Auth:**
- [AuthScreen.tsx](file:///d:/dd/AUREX/src/components/AuthScreen.tsx) — Sign up / Sign in / Email verification
- [UserSettings.tsx](file:///d:/dd/AUREX/src/components/UserSettings.tsx) — Settings hub
- [GeneralSettings.tsx](file:///d:/dd/AUREX/src/components/GeneralSettings.tsx) — Country/language preferences
- [SecuritySettings.tsx](file:///d:/dd/AUREX/src/components/SecuritySettings.tsx) — Password management, Android app password
- [CountrySelector.tsx](file:///d:/dd/AUREX/src/components/CountrySelector.tsx) — Country picker with flags

**Other:**
- [TaxCalculator.tsx](file:///d:/dd/AUREX/src/components/TaxCalculator.tsx) — Tax bracket calculator
- [EditTransactionDialog.tsx](file:///d:/dd/AUREX/src/components/EditTransactionDialog.tsx) — Transaction edit modal
- [PaymentAlertsBanner.tsx](file:///d:/dd/AUREX/src/components/PaymentAlertsBanner.tsx) — Payment due alerts (currently disabled)
- [SimulationsTab.tsx](file:///d:/dd/AUREX/src/components/SimulationsTab.tsx) — Financial "what-if" simulations
- [ErrorBoundary.tsx](file:///d:/dd/AUREX/src/components/ErrorBoundary.tsx) — Error boundary wrapper
- [theme-provider.tsx](file:///d:/dd/AUREX/src/components/theme-provider.tsx) — Dark/light theme
- [theme-toggle.tsx](file:///d:/dd/AUREX/src/components/theme-toggle.tsx) — Theme switch button
- [animated-number.tsx](file:///d:/dd/AUREX/src/components/animated-number.tsx) — Animated counter

### 3.4 Custom Hooks (8 files)

| Hook | Purpose |
|------|---------|
| [use-sms-queries.ts](file:///d:/dd/AUREX/src/hooks/use-sms-queries.ts) | TanStack Query hooks for SMS messages, semi-accounts, phone number search (demo data + API calls) |
| [use-transaction-queries.ts](file:///d:/dd/AUREX/src/hooks/use-transaction-queries.ts) | Transaction CRUD with React Query |
| [use-shopify.ts](file:///d:/dd/AUREX/src/hooks/use-shopify.ts) | Shopify API integration (connect, metrics, products) |
| [use-gpt-chat.ts](file:///d:/dd/AUREX/src/hooks/use-gpt-chat.ts) | GPT chat completion hook (currently stubbed — Creao backend disconnected) |
| [use-android-sync.ts](file:///d:/dd/AUREX/src/hooks/use-android-sync.ts) | Android SMS sync status tracking |
| [use-count-up.ts](file:///d:/dd/AUREX/src/hooks/use-count-up.ts) | Animated number counting |
| [use-in-view.ts](file:///d:/dd/AUREX/src/hooks/use-in-view.ts) | Intersection Observer for animations |
| [use-mobile.ts](file:///d:/dd/AUREX/src/hooks/use-mobile.ts) | Mobile viewport detection |

### 3.5 Lib Utilities (23 files)

**Core Financial Logic:**
- [financial-data.ts](file:///d:/dd/AUREX/src/lib/financial-data.ts) — Sample data generators: 1,250 cards, 575 employees, thousands of transactions, 3,500 SMS events, products, website metrics
- [financial-logic-engine.ts](file:///d:/dd/AUREX/src/lib/financial-logic-engine.ts) — Business logic calculations
- [country-config.ts](file:///d:/dd/AUREX/src/lib/country-config.ts) — Multi-country support (currency, locale, tax brackets, bank names)
- [payroll-utils.ts](file:///d:/dd/AUREX/src/lib/payroll-utils.ts) — Employee extraction from transactions, payroll calculations
- [card-converter.ts](file:///d:/dd/AUREX/src/lib/card-converter.ts) — Convert between basic and enhanced card types
- [card-risk.ts](file:///d:/dd/AUREX/src/lib/card-risk.ts) — Card risk scoring and analysis
- [stress-index-calculator.ts](file:///d:/dd/AUREX/src/lib/stress-index-calculator.ts) — Financial stress index (0–100 score)

**SMS Processing:**
- [sms-processor.ts](file:///d:/dd/AUREX/src/lib/sms-processor.ts) — Core SMS engine: parses bank SMS, extracts amounts/balances, detects full/partial payments, auto-updates cards
- [enhanced-sms-processor.ts](file:///d:/dd/AUREX/src/lib/enhanced-sms-processor.ts) — Advanced SMS processing with confidence scoring
- [sms-ai-classifier.ts](file:///d:/dd/AUREX/src/lib/sms-ai-classifier.ts) — AI-based SMS classification (payment, purchase, withdrawal, fee, refund, etc.)
- [bank-whitelist.ts](file:///d:/dd/AUREX/src/lib/bank-whitelist.ts) — Known bank sender IDs for SMS filtering

**Security & Auth:**
- [encryption.ts](file:///d:/dd/AUREX/src/lib/encryption.ts) — Client-side encryption utilities
- [security-password.ts](file:///d:/dd/AUREX/src/lib/security-password.ts) — Password generation and management
- [auth-utils.ts](file:///d:/dd/AUREX/src/lib/auth-utils.ts) — Password hashing, token generation, verification codes, email sending
- [local-user-storage.ts](file:///d:/dd/AUREX/src/lib/local-user-storage.ts) — localStorage-based user persistence (used in demo/offline mode)

**Integrations:**
- [google-oauth.ts](file:///d:/dd/AUREX/src/lib/google-oauth.ts) — Google OAuth 2.0 with PKCE flow for Calendar/Tasks/Docs
- [google-payment-reminders.ts](file:///d:/dd/AUREX/src/lib/google-payment-reminders.ts) — Auto-create Google Calendar reminders for card payments
- [google-report-generator.ts](file:///d:/dd/AUREX/src/lib/google-report-generator.ts) — Generate financial reports in Google Docs

**Other:**
- [api-client.ts](file:///d:/dd/AUREX/src/lib/api-client.ts) — HTTP API client for backend communication
- [semi-account-generator.ts](file:///d:/dd/AUREX/src/lib/semi-account-generator.ts) — Semi-account credential generation
- [file-scanner.ts](file:///d:/dd/AUREX/src/lib/file-scanner.ts) — Project file scanning utility

### 3.6 Contexts (2 files)

- [auth-context.tsx](file:///d:/dd/AUREX/src/contexts/auth-context.tsx) — Auth state management: signUp, verifyEmail, signIn, signOut (with localStorage persistence)
- [animation-context.tsx](file:///d:/dd/AUREX/src/contexts/animation-context.tsx) — Animation enable/disable toggle

### 3.7 Type System (4 files)

- [financial.ts](file:///d:/dd/AUREX/src/types/financial.ts) — Core types: [CompanyCard](file:///d:/dd/AUREX/src/types/financial.ts#1-15), [FinancialTransaction](file:///d:/dd/AUREX/src/types/financial.ts#25-40), [SmsEvent](file:///d:/dd/AUREX/src/types/financial.ts#53-69), [PaymentAlert](file:///d:/dd/AUREX/src/types/financial.ts#70-78), [TaxConfiguration](file:///d:/dd/AUREX/src/types/financial.ts#79-88), [FinancialMetrics](file:///d:/dd/AUREX/src/types/financial.ts#89-101), [Product](file:///d:/dd/AUREX/src/types/financial.ts#129-137), [Employee](file:///d:/dd/AUREX/src/types/financial.ts#138-148), [WebsiteMetrics](file:///d:/dd/AUREX/src/types/financial.ts#165-177), [PayrollKPIs](file:///d:/dd/AUREX/src/types/financial.ts#178-185), [SalesMetrics](file:///d:/dd/AUREX/src/types/financial.ts#196-204), [ConversionMetrics](file:///d:/dd/AUREX/src/types/financial.ts#205-213)
- [enhanced-financial.ts](file:///d:/dd/AUREX/src/types/enhanced-financial.ts) — Extended types with data trust layer: [EnhancedCompanyCard](file:///d:/dd/AUREX/src/types/enhanced-financial.ts#43-75) (7 statuses, field metadata, change history, risk indicators), [FinancialStressIndex](file:///d:/dd/AUREX/src/types/enhanced-financial.ts#76-89), [SpendingSimulation](file:///d:/dd/AUREX/src/types/enhanced-financial.ts#102-121), [TrendData](file:///d:/dd/AUREX/src/types/enhanced-financial.ts#122-133), [WeeklySummary](file:///d:/dd/AUREX/src/types/enhanced-financial.ts#134-142)
- [google-integrations.ts](file:///d:/dd/AUREX/src/types/google-integrations.ts) — Google integration types: [PaymentReminder](file:///d:/dd/AUREX/src/types/google-integrations.ts#9-41), [GeneratedReport](file:///d:/dd/AUREX/src/types/google-integrations.ts#77-100), report data types (Card Payment, Payroll, Tax, Expense, Revenue, P&L)
- [assistant-automation.ts](file:///d:/dd/AUREX/src/types/assistant-automation.ts) — Automation types: [LiveActivityItem](file:///d:/dd/AUREX/src/types/assistant-automation.ts#15-24), [CalendarReminder](file:///d:/dd/AUREX/src/types/assistant-automation.ts#28-40), [ManagedTask](file:///d:/dd/AUREX/src/types/assistant-automation.ts#44-57), [FinancialReport](file:///d:/dd/AUREX/src/types/assistant-automation.ts#61-73), [GoogleServiceStatus](file:///d:/dd/AUREX/src/types/assistant-automation.ts#77-86), [AssistantState](file:///d:/dd/AUREX/src/types/assistant-automation.ts#103-112)

### 3.8 Frontend Data/ORM Layer

Located in `src/components/data/`:

- **`orm/`** — 11 ORM model files (client-side data access): `orm_user`, `orm_credit_card`, `orm_transaction`, `orm_sms_log`, `orm_user_settings`, `orm_encryption_key`, `orm_card_field_change_history`, `orm_card_reliability_metadata`, `orm_financial_stress_index`, plus `client.ts` and `common.ts`
- **`schema/`** — 10 JSON schema definitions for each data model
- **`resource/`** — 9 JSON resource definitions

---

## 4. Backend Architecture

### 4.1 Server Stack

- **Framework:** Express.js
- **Database:** PostgreSQL (via `pg` Pool, max 20 connections)
- **Auth:** JWT-based token authentication with middleware
- **Deployment:** Render.com (defined in `render.yaml`)

### 4.2 Backend Files

```
backend/
├── src/
│   ├── server.js              # Main Express app (~720 lines)
│   ├── database.js            # PostgreSQL connection pool + schema init
│   ├── creao-datastore-server.js  # Legacy (being removed)
│   ├── middleware/
│   │   └── auth.js            # JWT token verification middleware
│   ├── routes/
│   │   ├── sms-routes.js      # SMS CRUD endpoints
│   │   ├── semi-account-routes.js  # Semi-account management
│   │   └── transaction-routes.js   # Transaction endpoints
│   └── utils/
│       └── crypto.js          # Password hashing (bcrypt), encryption
├── migrations/
│   └── 001_initial_schema.sql # Database schema
├── package.json
└── .env / .env.example
```

### 4.3 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Health check |
| **Auth** | | | |
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Login → JWT token |
| `GET` | `/api/auth/me` | Yes | Get current user |
| **Credit Cards** | | | |
| `GET` | `/api/credit-cards` | Yes | List user's cards |
| `POST` | `/api/credit-cards` | Yes | Create card |
| `GET` | `/api/credit-cards/:id` | Yes | Get card |
| `PUT` | `/api/credit-cards/:id` | Yes | Update card |
| `DELETE` | `/api/credit-cards/:id` | Yes | Delete card |
| **Transactions** | | | |
| `GET` | `/api/transactions` | Yes | List transactions (filterable by card, paginated) |
| `POST` | `/api/transactions` | Yes | Create transaction |
| **SMS** | | | |
| `POST` | `/api/sms/sync` | Yes | Receive SMS from Android |
| `GET` | `/api/sms/logs` | Yes | Get SMS logs (paginated) |
| **Settings** | | | |
| `GET` | `/api/settings` | Yes | Get user settings |
| `PUT` | `/api/settings` | Yes | Update settings |
| **Semi-Accounts** | | | |
| `GET` | `/api/semi-accounts` | Yes | Get fixed semi-accounts (4 hardcoded) |
| **Security** | | | |
| `POST` | `/api/security-credentials` | Yes | Generate security password |
| `GET` | `/api/security-credentials` | Yes | Get security credentials |

*(Plus additional routes defined in the route modules)*

### 4.4 Database Schema (11 tables)

| Table | Key Columns | Relations |
|-------|------------|-----------|
| `users` | id, email, password_hash, auth_token, token_expires_at, android_app_password, email_verified, verification_code | — |
| `credit_cards` | id, user_id, card_name, last_four, card_network, credit_limit, available_balance, outstanding_debt, minimum_payment, payment_status | → users |
| `transactions` | id, user_id, card_id, type, amount, description, category, photo_data, date | → users, → credit_cards |
| `sms_logs` | id, user_id, semi_account_id, phone_number, content, received_at, processed | → users, → semi_accounts |
| `user_settings` | id, user_id, country, currency, language, theme | → users |
| `semi_accounts` | id, user_id, name, phone_number | → users |
| `security_credentials` | id, user_id, security_password | → users |
| `encryption_keys` | id, user_id, key_data | → users |
| `card_field_change_history` | id, card_id, field_name, old_value, new_value | → credit_cards |
| `card_reliability_metadata` | id, card_id, reliability_score | → credit_cards |
| `financial_stress_index` | id, user_id, stress_score | → users |

---

## 5. Authentication Flow

### Frontend Auth (Current — localStorage-based)
1. User signs up with email + password → password is hashed, verification code generated
2. Verification email sent → user enters 6-digit code
3. On verification → auth token generated, stored in `localStorage`
4. On app load → token checked from localStorage, validated against expiry
5. Token-based session persists across refreshes

### Backend Auth (Production-ready)
1. `POST /api/auth/register` → bcrypt hash password, create user + default settings
2. `POST /api/auth/login` → verify password → generate JWT token (24h expiry), stored in DB
3. `authenticateToken` middleware validates Bearer token on protected routes

---

## 6. Key Feature Deep-Dives

### 6.1 SMS Processing Pipeline

The app's most unique feature — automatically parsing bank SMS messages to update credit card data:

```
Android App
    ↓ (E2E Encrypted, Smart Retry)
Backend /api/sms/sync
    ↓
AI Classification (11 types: payment_received, card_purchase,
    cash_withdrawal, fee_charged, interest_applied, refund,
    card_blocked, credit_limit_changed, statement_issued,
    ambiguous, rejected)
    ↓
Data Extraction (amount, currency, card_last_four, merchant, date_time)
    ↓
Confidence Scoring (≥95% = auto state update)
    ↓
Card State Update (balance, debt, payment status, credit limit)
```

**SMS Processor capabilities:**
- Full payment detection → sets debt to 0, status to "paid"
- Partial payment detection → updates balance, calculates remaining debt
- Credit limit updates → adjusts available balance
- Due date alerts → updates card due date and minimum payment
- Multi-currency support (EGP, USD, EUR, GBP, INR, etc.)
- Bank name matching (only processes SMS from correct bank)
- Card identification via last 4 digits

### 6.2 Semi-Accounts System

AUREX uses "semi-accounts" — phone number accounts linked to the user for SMS collection:
- 4 semi-accounts per user (hardcoded in demo)
- Each has a phone number that receives bank SMS
- SMS messages are grouped by semi-account
- Access control: only the owner can view their semi-account's messages

### 6.3 Google Integrations

Three Google services connected via OAuth 2.0 PKCE:

1. **Google Calendar** — Auto-create payment reminder events 2-3 days before card due dates
2. **Google Tasks** — Create tasks for payments, auto-complete when payment confirmed via SMS
3. **Google Docs** — Generate monthly/quarterly financial reports (card payments, payroll, tax, P&L)

### 6.4 AI Financial Assistant

- **Local data analysis**: Directly queries cards, transactions, metrics, and tax data to answer questions
- **GPT integration**: Sends financial context + question to GPT API for enhanced responses (currently stubbed)
- **Topic restriction**: Only answers finance/app questions; blocks code, emotional, or off-topic queries
- **Supported questions**: Cards, employees, payroll, transactions, revenue, expenses, profit, taxes, net worth

### 6.5 Financial Stress Index

Calculates a 0–100 stress score based on:
- Credit utilization impact (0–40 points)
- Card payment status impact (0–25 points)
- Due date proximity impact (0–20 points)
- Active cards impact (0–10 points)
- Over-limit impact (0–5 points)

Levels: `safe` (0-33) → `watchlist` (34-66) → `high_risk` (67-100)

---

## 7. Multi-Country Support

The app supports multiple countries with customizable:
- **Currency** (EGP, USD, GBP, EUR, INR, CAD)
- **Locale formatting** (number formats, date formats)
- **Tax brackets** (country-specific rates)
- **Bank names** (country-specific banks)
- **Salary scaling** (multiplier for different economies)

Default country: **Egypt (EG)**. Switching countries regenerates all mock data with appropriate values.

---

## 8. UI Component Library

40+ shadcn/ui components in `src/components/ui/`, including:
Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Button, Calendar, Card, Carousel, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, HoverCard, Input, InputOTP, Label, Menubar, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Sheet, Slider, Sonner (toasts), Switch, Table, Tabs, Textarea, Toggle, ToggleGroup, Tooltip

---

## 9. Project Config & Tooling

- **`vite.config.js`** — Vite build with React plugin, TanStack Router plugin, SVGR, path aliases (`@/` → `src/`)
- **`tsconfig.json`** — Strict TypeScript, path alias config
- **`biome.json`** — Code formatting and linting
- **`components.json`** — shadcn/ui configuration
- **`render.yaml`** — Render.com deployment config for frontend + backend
- **`scripts/`** — Build helpers: `generate-file-manifest.js`, `generate-complete-manifest.js`, `lint-radix.js`

---

## 10. File Count Summary

| Area | File Count |
|------|-----------|
| Components | 32 + 2 enterprise |
| UI Components (shadcn) | 40+ |
| Hooks | 8 |
| Lib Utilities | 23 |
| Type Definitions | 4 |
| ORM Models | 11 |
| Schema Definitions | 10 |
| Resource Definitions | 9 |
| Backend Source Files | 7 |
| Database Migrations | 1 |
| Config/Scripts | ~15 |
| **Total Source Files** | **~160+** |

---

## 11. Environment Variables

### Frontend (Vite — must be prefixed `VITE_`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | For backend | Backend API URL (default: `http://localhost:3001`) |
| `VITE_ENV` | No | Environment name (`development` / `production`) |
| `VITE_GOOGLE_CLIENT_ID` | For Google | Google OAuth Client ID from Cloud Console |
| `VITE_GOOGLE_REDIRECT_URI` | No | Custom redirect URI (defaults to `/auth-callback.html`) |

Files: `.env.development`, `.env.local` (gitignored), `.env.local.example`

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing (default: insecure fallback) |
| `PORT` | No | Server port (default: `3001`, production: `10000`) |
| `NODE_ENV` | No | `development` / `production` |
| `FRONTEND_URL` | No | For CORS allowlist |
| `ENCRYPTION_KEY` | No | 32-char key for AES-256-CBC encryption (default: insecure fallback) |

---

## 12. TypeScript Conventions & Gotchas

### Compiler Settings
- `strict: false` but `noImplicitAny: true` + `strictNullChecks: true` — a relaxed-but-safe setup
- `verbatimModuleSyntax: true` — **CRITICAL**: You MUST use `import { type Foo }` or `import type { Foo }` for type-only imports, or the build will fail
- `moduleResolution: "bundler"` — uses Vite's module resolution
- `target: "ES2022"` — modern JS features available
- The `agent/**/*` directory is excluded from TypeScript compilation

### Coding Conventions
- **Path alias**: Always use `@/` to import from `src/` (e.g., `import { cn } from "@/lib/utils"`)
- **File naming**: `kebab-case.tsx` for files, `PascalCase` for component names
- **Icons**: Only use `lucide-react` (no other icon libraries)
- **Component priority**: Use existing shadcn/ui from `@/components/ui/` → custom components → create new as last resort
- **Formatter**: Biome with tabs (not spaces), double quotes
- **`cn()` helper**: Used everywhere for conditional Tailwind class merging — `cn("base-class", condition && "conditional-class")`

### routeTree.gen.ts
This file is **auto-generated** by TanStack Router plugin. **Never edit it manually.** It will be regenerated when routes change.

---

## 13. CSS & Theming System

### Brand Colors
- **Primary**: `#585BFF` (vibrant blue) — used for buttons, links, focus rings, chart-1
- **Secondary**: `#813DFF` (purple) — used for accents, chart-2
- **Foreground**: `#2E2A2A` (dark charcoal) — text color

### Architecture
- [styles.css](file:///d:/dd/AUREX/src/styles.css) — Main stylesheet using `@import "tailwindcss"` (Tailwind v4 syntax)
- Uses `oklch()` color space for all CSS variables (not `hsl`)
- `@plugin "tailwindcss-animate"` for animation utilities
- `@custom-variant dark (&:is(.dark *))` — dark mode via `.dark` class on ancestor
- `@theme inline { ... }` maps CSS variables → Tailwind color tokens (e.g., `--color-primary: var(--primary)`)
- Base radius: `0.625rem` (10px)

### Custom Animations (available as CSS classes)
- `.animate-fadeIn`, `.animate-slideInUp`, `.animate-slideInDown`, `.animate-slideInLeft`, `.animate-slideInRight`, `.animate-scaleIn`
- Stagger delays: `.animation-delay-100` through `.animation-delay-500`
- `.animate-on-mount` — initial `opacity: 0` state for mount animations

### shadcn/ui Config
- Style: `new-york` | Base color: `zinc` | CSS variables: `true` | Icon library: `lucide`
- Not using React Server Components (`rsc: false`)

---

## 14. Vite Build Configuration

Important settings in [vite.config.js](file:///d:/dd/AUREX/vite.config.js):

- **Dev server**: `host: "0.0.0.0"`, `port: 3000`, `usePolling: true` (for containers/WSL)
- **Base path**: Dynamic — `/${TENANT_ID}/` if `TENANT_ID` env var is set, otherwise `/`
- **Build**: Minification is **disabled** (`minify: false`, `cssMinify: false`) for memory savings — consider re-enabling for production
- **Sourcemaps**: Disabled in production builds
- **Chunk warning limit**: 1500 KB (higher than default due to large components)
- **Code splitting**: `autoCodeSplitting: false` in TanStack Router (disabled for now)
- **SVGR plugin**: Allows importing SVGs as React components

---

## 15. Data Flow: Mock vs Real

**This is the most important architectural detail for an AI to understand:**

```
┌─────────────────────────────────────────────────────┐
│ CURRENT STATE (Demo/Development)                     │
│                                                      │
│  financial-data.ts → generates sample data in-memory │
│  index.tsx         → calls generators on mount       │
│  Components        → receive data as props           │
│  localStorage      → persists auth state only        │
│                                                      │
│  Backend API exists but is NOT connected to frontend │
│  api-client.ts exists but is mostly unused           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TARGET STATE (Production)                            │
│                                                      │
│  index.tsx      → fetches from API via TanStack Query│
│  api-client.ts  → makes HTTP requests to backend     │
│  Backend        → queries PostgreSQL                 │
│  Components     → receive data from query hooks      │
└─────────────────────────────────────────────────────┘
```

Key implications:
- When modifying components, data currently comes from `generateSample*()` functions in `financial-data.ts`
- The `api-client.ts` has all the right methods but many are not called yet
- TanStack Query is set up and ready — hooks just need to use `apiClient` instead of sample data
- Some hooks (e.g., `use-sms-queries.ts`) have **both** demo data paths and API paths with a toggle

---

## 16. Creao Legacy Remnants (Cleanup Needed)

The project was originally created on the **Creao platform** (a hosted dev environment). A recent cleanup session removed most Creao SDK code, but these remnants still exist:

| File | Issue |
|------|-------|
| [index.html](file:///d:/dd/AUREX/index.html) line 18 | `<script defer src="/creao-runtime/index.js?...">` — dead script reference |
| [index.html](file:///d:/dd/AUREX/index.html) line 12 | `<link rel="apple-touch-icon" href="/creao_icon.svg">` — references Creao icon |
| [manifest.json](file:///d:/dd/AUREX/public/manifest.json) | App name is `"Creao"` instead of `"AUREX"` |
| `public/creao_icon.svg` | Creao branding asset still present |
| `src/assets/creao_logo.svg` | Creao branding asset still present |
| [local-user-storage.ts](file:///d:/dd/AUREX/src/lib/local-user-storage.ts) line 4 | Comment references "Creao platform API" |
| [CLAUDE.md](file:///d:/dd/AUREX/CLAUDE.md) lines 39, 57 | References Creao SDK SDK and platform utilities |
| `backend/src/creao-datastore-server.js` | Legacy Creao datastore file (should be deleted) |

---

## 17. Development Commands & Workflow

### Running the App
```bash
# Frontend (from project root)
npm run dev          # Starts Vite dev server on http://localhost:3000

# Backend (from backend/ directory)
npm start            # Starts Express server on http://localhost:3001
npm run dev          # Same but with NODE_ENV=development
```

### Validation
```bash
npm run check:safe   # TypeScript type checking + ESLint (primary validation command)
npm run build        # Production build (Vite)
npm run format       # Biome auto-format
```

### Adding shadcn/ui Components
```bash
npx shadcn@latest add <component-name>
# Components are installed to src/components/ui/
# Config is in components.json
```

### Key Scripts
- `npm run check:safe` — **Primary dev tool** — runs `tsc --noEmit` + ESLint
- `npm run build` — Production bundle (minification disabled, see § 14)
- `scripts/generate-file-manifest.js` — Generates project file manifest
- `scripts/lint-radix.js` — Checks for direct Radix imports (should use shadcn wrappers)

---

## 18. localStorage Keys Reference

The app uses `localStorage` extensively. Here are all keys:

| Key | Module | Purpose |
|-----|--------|---------|
| `financial_dashboard_users` | `local-user-storage.ts` | Array of all user objects (demo mode) |
| `auth_token` | `auth-context.tsx` | Current session JWT token |
| `auth_user` | `auth-context.tsx` | Current user object (JSON) |
| `google_calendar_token` | `google-oauth.ts` | Google Calendar OAuth token |
| `google_tasks_token` | `google-oauth.ts` | Google Tasks OAuth token |
| `google_docs_token` | `google-oauth.ts` | Google Docs OAuth token |
| `google_calendar_connected` | `google-oauth.ts` | Boolean flag |
| `google_tasks_connected` | `google-oauth.ts` | Boolean flag |
| `google_docs_connected` | `google-oauth.ts` | Boolean flag |
| `google_calendar_connected_at` | `google-oauth.ts` | ISO timestamp |
| `google_tasks_connected_at` | `google-oauth.ts` | ISO timestamp |
| `google_docs_connected_at` | `google-oauth.ts` | ISO timestamp |
| `vite-ui-theme` | `theme-provider.tsx` | Theme preference: `"light"`, `"dark"`, or `"system"` |
| `shopify_*` | `use-shopify.ts` | Shopify connection details |

`sessionStorage` is used for Google OAuth PKCE flow: `google_oauth_pkce`, `google_oauth_error`, `google_oauth_success`

---

## 19. Known Limitations & TODOs

1. **No real data connection** — Frontend uses mock data generators; needs to be wired to backend API via `api-client.ts` and TanStack Query hooks
2. **GPT chat is stubbed** — `use-gpt-chat.ts` references a Creao backend (`/api/chat/completions`) that no longer exists; needs a new API endpoint (e.g., direct OpenAI or custom backend proxy)
3. **Email verification is simulated** — `auth-utils.ts` logs the verification code to console instead of sending a real email
4. **No password reset flow** — Auth only supports sign up, verify, sign in, and sign out
5. **Single-page app** — Only one route (`/`); all features live inside tabs on `index.tsx`, which is becoming very large
6. **No WebSocket/real-time** — SMS sync is pull-based (HTTP polling), not push
7. **Payroll & Cards have dual versions** — Both base (`CardManagement.tsx`) and enterprise (`CardManagementEnterprise.tsx`) versions exist; only enterprise versions are used
8. **PaymentAlertsBanner** — Component exists but is currently disabled/not rendered
9. **SimulationsTab** — Financial "what-if" simulation component exists but isn't wired into the main tabs
10. **Backend has insecure defaults** — JWT secret and encryption key fall back to hardcoded strings if env vars are missing
11. **No test files** — Despite Vitest being configured, no test files exist yet
12. **Build minification disabled** — Both JS and CSS minification are off for memory optimization; production bundles will be larger than necessary

---

## 20. Important Architecture Patterns for Developers

### Adding a New Tab to the Dashboard
1. Create component in `src/components/YourTab.tsx`
2. Import in `src/routes/index.tsx`
3. Add a `TabsTrigger` + `TabsContent` in the dashboard JSX
4. Pass relevant data props from the dashboard's state

### Adding a New API Endpoint (Backend)
1. Add route handler in `backend/src/server.js` or create a new route file in `backend/src/routes/`
2. Use `authenticateToken` middleware for protected routes
3. Access user via `req.user.id` and `req.user.email`
4. Add corresponding function in `src/lib/api-client.ts`

### Adding a New Data Type
1. Define TypeScript interface in `src/types/financial.ts` or `enhanced-financial.ts`
2. Add mock data generator in `src/lib/financial-data.ts`
3. Add ORM model in `src/components/data/orm/`
4. Add DB migration in `backend/migrations/` if it needs persistence
5. Add API endpoints in backend

### Data Transformation Chain
```
Raw SMS → sms-processor.ts → sms-ai-classifier.ts → enhanced-sms-processor.ts → Card State Update
Raw Cards → card-converter.ts → card-risk.ts → stress-index-calculator.ts → Risk Dashboard
```

# AUREX — Financial Management Platform

A full-stack financial management platform with AI-powered SMS classification, payment reminders, credit card tracking, and multi-currency support. Runs on web, desktop, and Android.

---

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Router/Query, shadcn/ui
- **Backend:** Express, TypeScript, PostgreSQL (Supabase), JWT
- **Desktop:** Electron
- **Android:** Kotlin, WorkManager, Room

## Features

- SMS classification engine — parses bank SMS and extracts amount, card number, merchant, due date, and OTP
- Financial stress scoring — deterministic 0-100 score based on utilization, payment status, and due-date proximity
- Credit card management — track limits, balances, and utilization across multiple cards
- Payment reminders — configurable schedules with WhatsApp delivery
- Multi-currency support with conversion
- Semi-account management for shared workspaces
- RBAC with role-based access control
- License key management (optional, can be disabled)

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14 or a Supabase project

## Setup

### Frontend

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

**Frontend (`.env.local`):**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_AI_API_ID` | AI provider API ID |
| `VITE_AI_API_PATH` | AI chat completions endpoint |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |

**Backend (`backend/.env`):**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | AES-256 key (32 chars) |
| `AI_API_ID` | AI provider API ID |
| `AI_API_PATH` | AI provider API path |

## API Endpoints

Base URL: `http://localhost:3001/api`

| Endpoint | Description |
|---|---|
| `POST /auth/register` | Create account |
| `POST /auth/login` | Login |
| `GET /auth/me` | Current user |
| `GET /credit-cards` | List cards |
| `POST /credit-cards` | Create card |
| `PUT /credit-cards/:id` | Update card |
| `DELETE /credit-cards/:id` | Delete card |
| `GET /transactions` | List transactions |
| `POST /transactions` | Create transaction |
| `POST /ai/chat` | AI chat completion |
| `POST /ai/sms/classify` | SMS classification |
| `POST /ai/analysis/financial` | Financial analysis |
| `GET /settings` | User settings |
| `PUT /settings` | Update settings |

## Project Structure

```
aurex/
+-- src/                    # Frontend source
|   +-- components/         # React components
|   +-- routes/             # TanStack Router pages
|   +-- lib/                # Utilities, AI classifiers
|   +-- hooks/              # React hooks
|   +-- types/              # TypeScript types
|   +-- sdk/                # Generated SDK
+-- backend/                # Backend source
|   +-- src/routes/         # API route handlers
|   +-- src/middleware/     # Auth middleware
|   +-- src/services/       # Business logic
|   +-- migrations/         # SQL migrations
|   +-- Dockerfile
+-- desktop/                # Electron app
+-- and-app/                # Android app
+-- docs/                   # Documentation
+-- supabase/               # Supabase migrations
```

## License

MIT

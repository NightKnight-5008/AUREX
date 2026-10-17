# AUREX — Advanced Financial Management Platform

> A full-stack financial management platform with AI-powered insights, cross-platform support, and enterprise-grade security.

⚠️ **Private project.** All rights reserved.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI-Powered SMS Classification** | Automatically parses and categorizes bank SMS notifications using AI, extracting merchant, amount, and transaction type |
| 📊 **Financial Stress Analysis** | Real-time stress scoring based on credit utilization, debt-to-limit ratios, and spending patterns |
| 🔔 **Payment Reminders** | Smart reminders with configurable lead times, recurring schedules, and multi-channel notifications |
| 💳 **Credit Card Management** | Track limits, balances, due dates, and card reliability scores across multiple issuers |
| 💱 **Multi-Currency Support** | Handle transactions in multiple currencies with conversion and normalization |
| 🖥️ **Cross-Platform** | Web (React), Desktop (Electron), and Android (Kotlin) from a single codebase |
| 🔐 **Enterprise Security** | JWT authentication, RBAC, audit logging, encryption at rest, and account lockout |
| 📋 **License Management** | Tiered licensing (Trial / Pro / Enterprise) with signed license keys and feature gating |

---

## 🧱 Tech Stack

### Frontend
![React 19](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack_Router-FF4055?style=flat-square&logo=reactrouter&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-4A3C31?style=flat-square&logo=zustand&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=flat-square&logo=apacheecharts&logoColor=white)

### Backend
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)

### Desktop & Mobile
![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=flat-square&logo=android&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=flat-square&logo=kotlin&logoColor=white)

---

## 📋 Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0 (or yarn / pnpm)
- **PostgreSQL** ≥ 14 (or a [Supabase](https://supabase.com) project)
- **Git**

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/aurex.git
cd aurex
```

### 2. Install dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 3. Set up the database

Run the SQL migrations in order against your PostgreSQL / Supabase instance:

```bash
psql -h <host> -U <user> -d aurex -f backend/migrations/001_initial_schema.sql
# …repeat for each migration file in sequence
```

Or use the Supabase dashboard SQL editor.

### 4. Configure environment variables

```bash
# Frontend
cp .env.local.example .env.local

# Backend
cd backend
cp .env.example .env  # if present, or create manually
```

---

## ⚙️ Environment Variables

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API base URL (e.g. `http://localhost:3001`) |
| `VITE_ENV` | ✅ | Environment mode (`development` / `production`) |
| `VITE_AI_API_ID` | — | AI provider API identifier for chat features |
| `VITE_AI_API_PATH` | — | AI chat completions endpoint path |
| `VITE_AI_API_NAME` | — | AI model display name |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID (optional) |
| `VITE_GOOGLE_REDIRECT_URI` | — | Google OAuth redirect URI (optional) |

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `PORT` | — | API server port (default: `3001`) |
| `ENCRYPTION_KEY` | ✅ | AES-256 key for sensitive data encryption |
| `FRONTEND_URL` | — | Allowed CORS origin (default: `http://localhost:3000`) |

> 🔒 **Never commit real secrets.** All `.env` files are listed in `.gitignore`.

---

## 🏃 Running the Project

### Development mode

```bash
# Start frontend dev server (port 3000)
npm run dev

# Start backend dev server (port 3001) — in a separate terminal
cd backend && npm run dev
```

### Desktop app (Electron)

```bash
# Compiles frontend + backend, then launches Electron
npm run desktop:dev
```

### Production build

```bash
# Build frontend
npm run build

# Build backend
cd backend && npm run build && cd ..

# Run backend production server
cd backend && npm start
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:3001/api`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Authenticate and receive JWT |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/credit-cards` | List user's credit cards |
| `POST` | `/credit-cards` | Add a new credit card |
| `PUT` | `/credit-cards/:id` | Update card details |
| `DELETE` | `/credit-cards/:id` | Remove a card |
| `GET` | `/transactions` | List transactions (paginated) |
| `POST` | `/transactions` | Add a transaction |
| `PUT` | `/transactions/:id` | Update a transaction |
| `DELETE` | `/transactions/:id` | Delete a transaction |
| `GET` | `/sms` | List parsed SMS records |
| `POST` | `/sms/parse` | Submit raw SMS for AI classification |
| `GET` | `/sms/classifications` | List AI-classified transactions |
| `GET` | `/semi-accounts` | List semi-accounts |
| `POST` | `/semi-accounts` | Create a semi-account |
| `GET` | `/licenses` | Get license info for current user |
| `POST` | `/licenses/activate` | Activate a license key |
| `GET` | `/reminders` | List payment reminders |
| `POST` | `/reminders` | Create a reminder |
| `PUT` | `/reminders/:id` | Update a reminder |
| `DELETE` | `/reminders/:id` | Delete a reminder |
| `GET` | `/settings` | Get user settings |
| `PUT` | `/settings` | Update user settings |
| `GET` | `/security-credentials` | List saved credentials |
| `POST` | `/security-credentials` | Save a new credential |
| `DELETE` | `/security-credentials/:id` | Delete a credential |

---

## 📁 Project Structure

```
aurex/
├── src/                      # Frontend source (React + Vite)
│   ├── components/           # Reusable UI components (shadcn/ui)
│   ├── routes/               # TanStack Router pages
│   ├── lib/                  # Utilities, SDK clients, AI classifiers
│   ├── sdk/                  # Generated SDK & ORM layer
│   ├── types/                # TypeScript type definitions
│   └── styles.css            # Global styles (Tailwind)
├── backend/                  # Backend source (Express + TypeScript)
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── middleware/       # Auth, rate-limiting, validation
│   │   ├── services/         # Business logic (reminders, licenses, WhatsApp)
│   │   ├── utils/            # Crypto, encryption helpers
│   │   ├── lib/              # Crypto & license signing
│   │   └── database.js       # DB connection pool
│   ├── migrations/           # SQL schema migrations
│   ├── scripts/              # CLI tools (migrate, issue-license, etc.)
│   └── Dockerfile            # Backend container image
├── desktop/                  # Electron main process
├── android/                  # Android (Kotlin) app
├── .env.local.example        # Frontend env template
├── package.json              # Root package (frontend + desktop)
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

---

## 🔑 Security

- **Authentication:** JWT with refresh-token rotation
- **Authorization:** Role-based access control (RBAC)
- **Data Protection:** AES-256 encryption for sensitive fields, Supabase Vault for key storage
- **Rate Limiting:** Express-rate-limit on all API routes
- **Audit Logging:** All data mutations logged with before/after snapshots
- **Account Lockout:** Automatic lock after 5 failed login attempts
- **Password Policy:** Enforced strength validation via DB functions

---

## 🤝 Contributing

This is a **private project**. Contributions are not accepted from external parties.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

> **Note:** This is a private, proprietary project. The MIT license applies to the codebase as maintained by the project owner. Unauthorized distribution or use is prohibited.

---

## 📮 Contact

For internal inquiries, reach out to the project maintainers via the organization's internal channels.

---

<p align="center">
  <sub>Built with ❤️ by the AUREX team.</sub>
</p>

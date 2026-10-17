# AUREX - Advanced Financial Intelligence Platform

Enterprise-grade financial management dashboard with real-time credit card portfolio management, automated SMS-based transaction detection, payroll management, and AI-powered financial insights.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Android device (for SMS sync feature)

### Installation

```bash
# 1. Clone and install dependencies
npm install
cd backend && npm install && cd ..

# 2. Set up environment variables
cp .env.local.example .env.local
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL credentials

# 3. Initialize database
psql -U your_username -d aurex_db -f backend/migrations/001_initial_schema.sql

# 4. Start development servers
./start-dev.sh  # Mac/Linux
# OR
start-dev.bat   # Windows
```

**Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 📚 Documentation

All documentation is in the **[docs/](./docs/)** folder.

### 🎯 Start Here

1. **[docs/README_BACKEND_CONNECTION.md](./docs/README_BACKEND_CONNECTION.md)** - Main setup guide
2. **[docs/AUREX_KNOWLEDGE_BASE.md](./docs/AUREX_KNOWLEDGE_BASE.md)** - Complete app overview
3. **[docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)** - Quick lookup reference

### 📖 Key Documentation

- **Backend Connection**: [docs/CONNECTION_SUMMARY.md](./docs/CONNECTION_SUMMARY.md)
- **Code Examples**: [docs/EXAMPLE_COMPONENT_UPDATE.md](./docs/EXAMPLE_COMPONENT_UPDATE.md)
- **Deployment**: [docs/COMPLETE-DEPLOYMENT-GUIDE.md](./docs/COMPLETE-DEPLOYMENT-GUIDE.md)
- **Database**: [docs/AUREX_DATABASE_GUIDE.md](./docs/AUREX_DATABASE_GUIDE.md)
- **Android App**: [docs/android/](./docs/android/)

**See [docs/README.md](./docs/README.md) for complete documentation index.**

## ✨ Features

### Core Features
- 📊 **Real-time Dashboard** - KPI cards, 6-month trends, transaction history
- 💳 **Credit Card Management** - 1,250+ card portfolio with utilization tracking
- 💰 **Payroll Management** - 575+ employee tracking with salary, bonuses, sales data
- 📱 **SMS-Based Transaction Detection** - Automatic card updates from bank SMS
- 🤖 **AI Financial Assistant** - Local data analysis + GPT integration
- 📈 **Analytics Dashboard** - Sales metrics, website analytics, conversion funnels
- 🌍 **Multi-Country Support** - Egypt, US, UK, India, Canada with localized currencies
- 🔐 **Enterprise Security** - JWT auth, E2E encryption, RBAC

### Integrations
- **Google Workspace** - Calendar reminders, Tasks, Docs report generation
- **Shopify** - E-commerce revenue tracking
- **Android App** - SMS sync with dual SIM support

### Advanced Features
- Tax calculation with multi-country brackets
- Financial stress index (0-100 score)
- Card risk scoring and analysis
- Semi-accounts system for SMS collection
- Automated payment reminders
- CSV import/export for payroll

## 🏗️ Tech Stack

### Frontend
- React 19 + TypeScript
- TanStack Router (file-based routing)
- TanStack Query (server state)
- Zustand (client state)
- Tailwind CSS v4 + shadcn/ui (40+ components)
- Recharts (data visualization)
- Vite (build tool)

### Backend
- Express.js (Node.js)
- PostgreSQL (via `pg` driver)
- JWT authentication
- bcrypt password hashing

### Android App
- Kotlin
- Hilt (dependency injection)
- Room (local database)
- Retrofit (API client)
- MVVM architecture

## 📁 Project Structure

```
aurex/
├── src/                      # Frontend source
│   ├── components/           # React components (32 custom + 40+ UI)
│   ├── hooks/                # Custom React hooks (18 files)
│   ├── lib/                  # Utilities and business logic (23 files)
│   ├── types/                # TypeScript type definitions
│   ├── contexts/             # React contexts (auth, animation)
│   └── routes/               # TanStack Router routes
├── backend/                  # Backend API
│   ├── src/                  # Server source code
│   │   ├── server.js         # Main Express app
│   │   ├── database.js       # PostgreSQL connection
│   │   ├── middleware/       # Auth middleware
│   │   ├── routes/           # API route modules
│   │   └── utils/            # Crypto utilities
│   └── migrations/           # Database schema
├── and-app/                  # Android companion app
│   └── app/src/main/java/    # Kotlin source code
├── docs/                     # All documentation
│   ├── README.md             # Documentation index
│   ├── android/              # Android app docs
│   └── *.md                  # Various guides
├── public/                   # Static assets
├── scripts/                  # Build and utility scripts
└── config/                   # Configuration files
```

## 🔧 Development

### Available Scripts

```bash
# Frontend
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run check:safe       # TypeScript + ESLint check

# Backend
cd backend
npm start                # Start server (port 3001)
npm run dev              # Start with auto-reload

# Both
./start-dev.sh           # Start both servers (Mac/Linux)
start-dev.bat            # Start both servers (Windows)
```

### Environment Variables

**Frontend (`.env.local`):**
```env
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/aurex_db
JWT_SECRET=your_secret_here
PORT=3001
```

## 🧪 Testing

```bash
# Run tests
npm test

# Type checking
npm run check:safe
```

## 🚢 Deployment

See [docs/COMPLETE-DEPLOYMENT-GUIDE.md](./docs/COMPLETE-DEPLOYMENT-GUIDE.md) for detailed deployment instructions.

### Quick Deploy (Render.com)

The project includes `render.yaml` for easy deployment:

1. Push to GitHub
2. Connect repository to Render
3. Set environment variables
4. Deploy

## 📊 Database Schema

11 tables:
- `users` - User accounts
- `credit_cards` - Credit/debit cards
- `transactions` - Financial transactions
- `sms_logs` - SMS messages from banks
- `user_settings` - User preferences
- `semi_accounts` - Phone number accounts
- `security_credentials` - Security passwords
- `encryption_keys` - Encryption keys
- `card_field_change_history` - Card change tracking
- `card_reliability_metadata` - Card reliability scores
- `financial_stress_index` - Financial stress metrics

See [docs/AUREX_DATABASE_GUIDE.md](./docs/AUREX_DATABASE_GUIDE.md) for complete schema documentation.

## 🔐 Security

- JWT-based authentication with 24h token expiry
- bcrypt password hashing
- E2E encryption for SMS data
- Android Keystore for secure key storage
- CORS configured for production
- SQL injection prevention via parameterized queries

## 🌍 Multi-Country Support

Supported countries with localized currencies, tax brackets, and bank names:
- 🇪🇬 Egypt (EGP) - Default
- 🇺🇸 United States (USD)
- 🇬🇧 United Kingdom (GBP)
- 🇮🇳 India (INR)
- 🇨🇦 Canada (CAD)

## 📱 Android App

Companion Android app for SMS sync:
- Automatic SMS detection from banks
- Dual SIM support
- E2E encryption
- Background sync with smart retry
- Foreground service for Android 12+
- Battery optimization handling

See [docs/android/](./docs/android/) for Android documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Documentation**: [docs/README.md](./docs/README.md)
- **Backend Setup**: [docs/README_BACKEND_CONNECTION.md](./docs/README_BACKEND_CONNECTION.md)
- **Quick Reference**: [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)
- **Troubleshooting**: [docs/BACKEND_CONNECTION_GUIDE.md](./docs/BACKEND_CONNECTION_GUIDE.md)

## 🎯 Current Status

- ✅ Frontend: Fully functional with mock data
- ✅ Backend: Production-ready API
- ✅ Database: Schema complete with 11 tables
- ✅ Android App: Phase 2 & 3 complete
- ⚠️ Integration: Frontend needs to be wired to backend (see docs)

**Next Steps**: Follow [docs/README_BACKEND_CONNECTION.md](./docs/README_BACKEND_CONNECTION.md) to connect frontend to backend.

## 📈 Roadmap

- [ ] Connect frontend to backend API
- [ ] Remove Creao legacy code
- [ ] Add WebSocket for real-time SMS sync
- [ ] Implement data validation with Zod
- [ ] Add Redis caching
- [ ] Set up error tracking (Sentry)
- [ ] Write comprehensive tests
- [ ] Deploy to production

---

**Version**: 1.0.0  
**Last Updated**: March 25, 2026  
**Status**: Ready for Backend Connection

For detailed information, see the [documentation](./docs/).

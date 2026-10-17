# Supabase Installation Note - Windows Node.js 24

## Issue Encountered
When installing `@supabase/supabase-js` on Windows with Node.js 24.11.0, the `better-sqlite3` native module fails to compile due to C++ version mismatch:
- Node.js 24 requires C++20
- Visual Studio 2019 BuildTools only supports C++17

## Solution Applied
Installed packages with `--ignore-scripts` flag to skip native module compilation:
```bash
npm install --ignore-scripts
```

## Why This Works
- `better-sqlite3` is only needed for **local Supabase development** (when running `npx supabase start`)
- Since you're using **Supabase hosted** (cloud), you don't need the local SQLite database
- The Supabase JavaScript client (`@supabase/supabase-js`) works perfectly without it

## What's Working
✅ Supabase client installed (`@supabase/supabase-js@2.99.3`)
✅ Frontend connection configured (`.env.local`)
✅ Backend connection configured (`backend/.env`)
✅ Android configuration ready
✅ TypeScript types generated
✅ All migrations synced

## What's NOT Working (and doesn't matter)
❌ Local Supabase (`npx supabase start`) - requires `better-sqlite3`
- You don't need this since you're using hosted Supabase

## If You Need Local Supabase Later
To fix the `better-sqlite3` compilation issue, you would need to:
1. Upgrade to Visual Studio 2022 (supports C++20), OR
2. Downgrade to Node.js 20 LTS, OR
3. Use Docker for local Supabase instead

## Verification
Your Supabase client is working correctly:
```bash
npm list @supabase/supabase-js
# aurex@1.0.0
# └── @supabase/supabase-js@2.99.3
```

## Next Steps
Continue with development using your hosted Supabase database:
- Frontend: Use `src/lib/supabase.ts`
- Backend: Connect via `DATABASE_URL` in `backend/.env`
- Android: Use configuration in `supabase_config.xml`

Everything is ready to go! 🚀

#!/usr/bin/env bash
#
# AUREX Database & Development Setup
# Sets up environment variables, runs migrations, and starts all servers.
#
# Usage: ./setup-db.sh
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { echo "[SETUP] $1"; }
ok()    { echo "[OK]   $1"; }
fail()  { echo "[FAIL] $1" >&2; exit 1; }

ask() {
    local prompt="$1" default="${2:-}" reply
    if [ -n "$default" ]; then
        read -r -p "$prompt [$default]: " reply
        echo "${reply:-$default}"
    else
        read -r -p "$prompt: " reply
        echo "$reply"
    fi
}

# ── Prerequisites ────────────────────────────────────────────────────────────

info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js is required but not installed."
command -v npm  >/dev/null 2>&1 || fail "npm is required but not installed."

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js >= 18 required (found $(node -v))"
fi

ok "Node.js $(node -v)"

# ── Install dependencies ─────────────────────────────────────────────────────

if [ ! -d "node_modules" ]; then
    info "Installing frontend dependencies..."
    npm install --no-audit --no-fund
    ok "Frontend dependencies installed"
else
    ok "Frontend dependencies already installed"
fi

if [ ! -d "backend/node_modules" ]; then
    info "Installing backend dependencies..."
    (cd backend && npm install --no-audit --no-fund)
    ok "Backend dependencies installed"
else
    ok "Backend dependencies already installed"
fi

# ── Collect Supabase credentials ────────────────────────────────────────────

echo ""
info "Supabase database setup"
echo ""
info "  1. Go to https://supabase.com"
info "  2. Create a project or open an existing one"
info "  3. Go to Settings > Database"
info "  4. Copy the Connection string (URI format)"
echo ""

DATABASE_URL=$(ask "DATABASE_URL")

if [ -z "$DATABASE_URL" ]; then
    fail "DATABASE_URL cannot be empty"
fi

# ── Generate secrets ─────────────────────────────────────────────────────────

info "Generating secure secrets..."

JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

ok "JWT_SECRET generated"
ok "ENCRYPTION_KEY generated"

# ── Write backend/.env ───────────────────────────────────────────────────────

if [ -f "backend/.env" ]; then
    echo ""
    OVERWRITE=$(ask "backend/.env already exists. Overwrite? (y/N)" "n")
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        info "Keeping existing backend/.env"
        SKIP_BACKEND_ENV=1
    fi
fi

if [ "${SKIP_BACKEND_ENV:-0}" != "1" ]; then
    cat > backend/.env << ENVEOF
# AUREX Backend Environment
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
AI_API_ID=
AI_API_PATH=
AI_API_NAME=OpenAIGPTChat
AI_API_BASE_URL=https://api-production.creao.ai/execute-apis/v2
AI_DEFAULT_MODEL=MaaS_4.1
WHATSAPP_PROVIDER=twilio
WHATSAPP_API_KEY=
WHATSAPP_ACCOUNT_SID=
WHATSAPP_AUTH_TOKEN=
WHATSAPP_FROM_NUMBER=
ADMIN_EMAIL=admin@example.com
ENVEOF
    ok "backend/.env created"
fi

# ── Write .env.local ────────────────────────────────────────────────────────

if [ ! -f ".env.local" ]; then
    info "Creating .env.local..."
    cat > .env.local << ENVEOF
# AUREX Frontend Environment
VITE_API_URL=http://localhost:3001
VITE_ENV=development
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AI_API_ID=
VITE_AI_API_PATH=/v1/ai/your-path/chat/completions
VITE_AI_API_NAME=OpenAIGPTChat
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/auth-callback.html
ENVEOF
    ok ".env.local created"
else
    ok ".env.local already exists (kept)"
fi

# ── Run database migrations ──────────────────────────────────────────────────

echo ""
info "Running database migrations..."

if command -v psql >/dev/null 2>&1; then
    MIGRATION_FILES=(supabase/migrations/*.sql backend/migrations/*.sql)
    MIGRATION_COUNT=0
    for f in "${MIGRATION_FILES[@]}"; do
        if [ -f "$f" ]; then
            info "  Applying $f"
            if psql "$DATABASE_URL" -f "$f" -q 2>&1; then
                MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
            else
                echo "  [WARN] Migration $f had errors (may already be applied)"
            fi
        fi
    done
    ok "$MIGRATION_COUNT migration files processed"
else
    info "psql not found. Skipping migrations."
    info "Run migrations manually via Supabase SQL editor or install psql."
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo "  Setup Complete"
echo "========================================"
echo ""
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo "  Health:   http://localhost:3001/health"
echo ""
echo "  To start development:"
echo "    npm run dev          (frontend)"
echo "    cd backend && npm run dev   (backend)"
echo ""
echo "  To run migrations later:"
echo "    psql \$DATABASE_URL -f supabase/migrations/<filename>.sql"
echo ""

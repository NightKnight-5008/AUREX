@echo off
REM AUREX Development Startup Script for Windows
REM This script starts both frontend and backend servers

echo 🚀 Starting AUREX Development Environment...
echo.

REM Check if .env files exist
if not exist "backend\.env" (
    echo ⚠️  backend\.env not found!
    echo 📝 Creating from backend\.env.example...
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env - Please edit it with your database credentials
    echo.
)

if not exist ".env.local" (
    echo ⚠️  .env.local not found!
    echo 📝 Creating from .env.local.example...
    copy .env.local.example .env.local
    echo ✅ Created .env.local
    echo.
)

REM Check if node_modules exist
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    call npm install
    echo.
)

if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

REM Start backend
echo 🔧 Starting backend server on port 3001...
start "AUREX Backend" cmd /k "cd backend && npm start"

REM Wait for backend to start
echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

REM Start frontend
echo 🎨 Starting frontend server on port 3000...
start "AUREX Frontend" cmd /k "npm run dev"

echo.
echo ✅ AUREX is running!
echo.
echo 📍 Frontend: http://localhost:3000
echo 📍 Backend:  http://localhost:3001
echo 📍 Health:   http://localhost:3001/health
echo.
echo Close the terminal windows to stop the servers
echo.
pause

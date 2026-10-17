@echo off
REM Simple AUREX Database Setup for Windows

echo ========================================
echo AUREX Database Setup - Simple Version
echo ========================================
echo.

echo This script will help you set up your database connection.
echo.
echo First, you need a Supabase database URL.
echo.
echo Steps to get it:
echo 1. Go to https://supabase.com
echo 2. Create a new project
echo 3. Go to Settings -^> Database
echo 4. Copy the Connection String (URI format)
echo.
echo Example:
echo postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
echo.
pause
echo.

set /p DATABASE_URL="Paste your Supabase DATABASE_URL here: "

if "%DATABASE_URL%"=="" (
    echo.
    echo ERROR: DATABASE_URL cannot be empty!
    echo Please run the script again and paste your database URL.
    pause
    exit /b 1
)

echo.
echo Creating backend/.env file...
echo.

(
echo # AUREX Backend Environment Variables
echo.
echo # Database
echo DATABASE_URL=%DATABASE_URL%
echo.
echo # JWT Secret
echo JWT_SECRET=aurex_jwt_secret_change_this_in_production_12345
echo.
echo # Server
echo PORT=3001
echo NODE_ENV=development
echo.
echo # Frontend URL
echo FRONTEND_URL=http://localhost:3000
echo.
echo # Encryption Key
echo ENCRYPTION_KEY=aurex_encryption_key_32_chars
) > backend\.env

if exist "backend\.env" (
    echo SUCCESS: backend/.env created!
) else (
    echo ERROR: Failed to create backend/.env
    pause
    exit /b 1
)

echo.

if not exist ".env.local" (
    echo Creating .env.local file...
    (
    echo # AUREX Frontend Environment Variables
    echo.
    echo # Backend API URL
    echo VITE_API_URL=http://localhost:3001
    echo.
    echo # Environment
    echo VITE_ENV=development
    ) > .env.local
    echo SUCCESS: .env.local created!
) else (
    echo .env.local already exists, skipping...
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Start backend:
echo    cd backend
echo    npm start
echo.
echo 2. In a new terminal, start frontend:
echo    npm run dev
echo.
echo 3. Open http://localhost:3000
echo.
echo Press any key to start the backend now...
pause > nul

echo.
echo Starting backend server...
echo.
cd backend
call npm start

#!/bin/bash

# AUREX Development Startup Script
# This script starts both frontend and backend servers

echo "🚀 Starting AUREX Development Environment..."
echo ""

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found!"
    echo "📝 Creating from backend/.env.example..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env - Please edit it with your database credentials"
    echo ""
fi

if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found!"
    echo "📝 Creating from .env.local.example..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local"
    echo ""
fi

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
    echo ""
fi

# Start backend in background
echo "🔧 Starting backend server on port 3001..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running!"
else
    echo "❌ Backend failed to start. Check backend logs."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎨 Starting frontend server on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ AUREX is running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend:  http://localhost:3001"
echo "📍 Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait

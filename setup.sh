#!/bin/bash

# GAS Bridge Hub - Quick Setup Script
# This script helps new users set up the application quickly

set -e

echo "🚀 GAS Bridge Hub - Quick Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js 20+ from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected"
    echo "   Please upgrade to Node.js 18+ or 20+"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example .env
        echo "✅ .env file created"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env with your credentials:"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_ANON_KEY"
        echo "   - SUPABASE_SERVICE_KEY"
        echo "   - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)"
        echo ""
        read -p "Press Enter after you've updated .env file..."
    else
        echo "❌ .env.example not found"
        exit 1
    fi
else
    echo "✅ .env file found"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

echo ""
echo "✅ Dependencies installed"
echo ""

# Check database
echo "🗄️  Checking database setup..."
echo ""
echo "Please ensure you have:"
echo "  1. Created a Supabase project"
echo "  2. Run database-schema.sql in Supabase SQL Editor"
echo ""
read -p "Have you completed database setup? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 Database Setup Instructions:"
    echo "   1. Go to: https://supabase.com/dashboard"
    echo "   2. Create a new project (or select existing)"
    echo "   3. Click 'SQL Editor' → 'New Query'"
    echo "   4. Copy content from: database-schema.sql"
    echo "   5. Paste and click 'Run'"
    echo ""
    echo "Or use this command to copy SQL to clipboard:"
    echo "   cat database-schema.sql | pbcopy"
    echo ""
    exit 0
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo ""
echo "  Development:"
echo "    npm run dev          # Start both frontend and backend"
echo ""
echo "  Production:"
echo "    npm run build        # Build for production"
echo "    npm start            # Start production server"
echo ""
echo "  Docker:"
echo "    docker-compose up    # Start with Docker"
echo ""
echo "📚 For more information, see:"
echo "   - README.md"
echo "   - DEPLOYMENT_GUIDE.md"
echo ""

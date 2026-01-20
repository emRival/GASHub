#!/bin/bash

# GAS Bridge Hub - Smart Port Detection & Deployment
# Automatically finds available ports if defaults are in use

set -e

echo "🐳 GAS Bridge Hub - Smart Docker Deployment"
echo "==========================================="
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to find next available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            echo "❌ Could not find available port in range $start_port-$((start_port + 100))"
            exit 1
        fi
    done
    
    echo $port
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    echo "   Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) detected"
echo "✅ Docker Compose $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1) detected"
echo ""

# Smart port detection
echo "🔍 Checking ports..."
echo ""

DEFAULT_APP_PORT=9987
DEFAULT_DB_PORT=9988

# Check application port
if check_port $DEFAULT_APP_PORT; then
    APP_PORT=$DEFAULT_APP_PORT
    echo "✅ Application port $APP_PORT is available"
else
    echo "⚠️  Port $DEFAULT_APP_PORT is in use, finding alternative..."
    APP_PORT=$(find_available_port $DEFAULT_APP_PORT)
    echo "✅ Using alternative port: $APP_PORT"
fi

# Check database port
if check_port $DEFAULT_DB_PORT; then
    DB_PORT=$DEFAULT_DB_PORT
    echo "✅ Database port $DB_PORT is available"
else
    echo "⚠️  Port $DEFAULT_DB_PORT is in use, finding alternative..."
    DB_PORT=$(find_available_port $DEFAULT_DB_PORT)
    echo "✅ Using alternative port: $DB_PORT"
fi

echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from Docker template..."
    if [ -f ".env.docker" ]; then
        cp .env.docker .env
        
        # Update ports in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/APP_PORT=9987/APP_PORT=$APP_PORT/" .env
            sed -i '' "s/DB_PORT=9988/DB_PORT=$DB_PORT/" .env
            sed -i '' "s|BETTER_AUTH_URL=http://localhost:9987|BETTER_AUTH_URL=http://localhost:$APP_PORT|" .env
            sed -i '' "s|FRONTEND_URL=http://localhost:9987|FRONTEND_URL=http://localhost:$APP_PORT|" .env
        else
            # Linux
            sed -i "s/APP_PORT=9987/APP_PORT=$APP_PORT/" .env
            sed -i "s/DB_PORT=9988/DB_PORT=$DB_PORT/" .env
            sed -i "s|BETTER_AUTH_URL=http://localhost:9987|BETTER_AUTH_URL=http://localhost:$APP_PORT|" .env
            sed -i "s|FRONTEND_URL=http://localhost:9987|FRONTEND_URL=http://localhost:$APP_PORT|" .env
        fi
        
        echo "✅ .env file created with ports: APP=$APP_PORT, DB=$DB_PORT"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and set:"
        echo "   - DB_PASSWORD (PostgreSQL password)"
        echo "   - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)"
        echo ""
        read -p "Press Enter after you've updated .env file..."
    else
        echo "❌ .env.docker template not found"
        exit 1
    fi
else
    echo "✅ .env file found"
    
    # Update ports in existing .env if they're different
    if grep -q "APP_PORT=" .env; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/APP_PORT=.*/APP_PORT=$APP_PORT/" .env
            sed -i '' "s/DB_PORT=.*/DB_PORT=$DB_PORT/" .env
        else
            sed -i "s/APP_PORT=.*/APP_PORT=$APP_PORT/" .env
            sed -i "s/DB_PORT=.*/DB_PORT=$DB_PORT/" .env
        fi
        echo "✅ Ports updated in .env: APP=$APP_PORT, DB=$DB_PORT"
    fi
fi

echo ""
echo "🗄️  Database Setup..."
echo ""
echo "This deployment includes PostgreSQL in Docker."
echo "Database will be automatically initialized on first run!"
echo ""

# Check if postgres volume exists
if docker volume ls | grep -q "gasrepeater_postgres_data"; then
    echo "⚠️  Existing database volume found."
    read -p "Do you want to remove it and start fresh? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing old database volume..."
        docker-compose down -v
        echo "✅ Old data removed"
    fi
fi

echo ""
echo "🐳 Building Docker images..."
echo ""

# Export ports for docker-compose
export APP_PORT
export DB_PORT

docker-compose build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting containers (PostgreSQL + Application)..."
echo ""

docker-compose up -d

echo ""
echo "⏳ Waiting for database to initialize (30 seconds)..."
sleep 30

echo ""
echo "📊 Checking health..."

if docker-compose ps | grep -q "Up"; then
    echo "✅ Containers are running!"
    echo ""
    
    # Check database
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
    else
        echo "⚠️  PostgreSQL may still be initializing..."
    fi
    
    echo ""
    echo "🎯 Application is ready!"
    echo ""
    echo "   🌐 Application: http://localhost:$APP_PORT"
    echo "   📊 Health Check: http://localhost:$APP_PORT/health"
    echo "   🗄️  PostgreSQL: localhost:$DB_PORT"
    echo ""
    echo "📝 Useful commands:"
    echo "   docker-compose logs -f              # View all logs"
    echo "   docker-compose logs -f gas-bridge-hub  # App logs only"
    echo "   docker-compose logs -f postgres     # Database logs"
    echo "   docker-compose ps                   # Check status"
    echo "   docker-compose down                 # Stop all containers"
    echo "   docker-compose down -v              # Stop and remove data"
    echo "   docker-compose restart              # Restart all"
    echo ""
    echo "🗄️  Database Access:"
    echo "   docker-compose exec postgres psql -U postgres -d gas_bridge_hub"
    echo ""
    echo "💡 Ports used:"
    echo "   Application: $APP_PORT (external) → 3000 (internal)"
    echo "   PostgreSQL:  $DB_PORT (external) → 5432 (internal)"
    echo ""
else
    echo "❌ Containers failed to start"
    echo ""
    echo "Check logs with:"
    echo "   docker-compose logs"
    echo ""
    exit 1
fi

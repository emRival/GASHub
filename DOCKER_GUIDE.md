# 🐳 Self-Contained Docker Deployment Guide

## ✅ **Fully Self-Contained - NO External Dependencies!**

Setup ini menggunakan **PostgreSQL lokal di Docker**, jadi aplikasi bisa running **100% offline** tanpa dependency ke Supabase atau cloud services lainnya.

---

## 📋 What's Included

- ✅ **PostgreSQL 16** (Alpine) - Local database
- ✅ **Node.js 20** (Alpine) - Application runtime
- ✅ **Auto Database Init** - Schema created automatically
- ✅ **Data Persistence** - PostgreSQL data volume
- ✅ **Health Checks** - Auto-monitoring
- ✅ **Log Persistence** - Application logs saved

---

## 🚀 Quick Start (2 Commands!)

### 1. Configure Environment

```bash
# Copy Docker environment template
cp .env.docker .env

# Edit configuration
nano .env
```

**Required Changes:**
```bash
# Set secure database password
DB_PASSWORD=your_secure_password_here

# Generate auth secret (32+ characters)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

### 2. Deploy!

```bash
# Option A: Automated script
bash docker-deploy.sh

# Option B: Manual
docker-compose up -d
```

**That's it!** Application running at `http://localhost:3000` 🎉

---

## 📦 Architecture

```
┌─────────────────────────────────────┐
│     Docker Compose Network          │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │  │     App     │ │
│  │   (Port      │←─│  (Port      │ │
│  │    5432)     │  │   3000)     │ │
│  └──────────────┘  └─────────────┘ │
│         ↓                           │
│  ┌──────────────┐                  │
│  │ Volume:      │                  │
│  │ postgres_data│                  │
│  └──────────────┘                  │
└─────────────────────────────────────┘
```

---

## 🔧 Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v

# Restart all services
docker-compose restart

# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f gas-bridge-hub

# View database logs only
docker-compose logs -f postgres
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d gas_bridge_hub

# Run SQL query
docker-compose exec postgres psql -U postgres -d gas_bridge_hub -c "SELECT COUNT(*) FROM logs;"

# Backup database
docker-compose exec postgres pg_dump -U postgres gas_bridge_hub > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d gas_bridge_hub < backup.sql
```

### Maintenance

```bash
# Check container status
docker-compose ps

# Check resource usage
docker stats

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d

# View container details
docker inspect gas-bridge-hub
docker inspect gas-bridge-postgres
```

---

## 📊 Environment Variables

### Required Variables

```bash
# Database
DB_PASSWORD=your_secure_password        # PostgreSQL password
DATABASE_URL=postgresql://postgres:PASSWORD@postgres:5432/gas_bridge_hub

# Authentication
BETTER_AUTH_SECRET=min_32_chars         # Auth encryption key
BETTER_AUTH_URL=http://localhost:3000   # Application URL

# Application
FRONTEND_URL=http://localhost:3000      # Frontend URL
PORT=3000                                # Application port
NODE_ENV=production                      # Environment
```

### Optional Variables

```bash
# For production deployment
BETTER_AUTH_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

---

## 🔍 Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify database is ready
docker-compose exec postgres pg_isready -U postgres

# Test connection
docker-compose exec postgres psql -U postgres -d gas_bridge_hub -c "SELECT 1;"
```

### Application Won't Start

```bash
# Check application logs
docker-compose logs gas-bridge-hub

# Common issues:
# 1. Database not ready - Wait 30 seconds after first start
# 2. Wrong DB_PASSWORD in .env
# 3. Port 3000 already in use
```

### Reset Everything

```bash
# Stop and remove all data
docker-compose down -v

# Remove images
docker rmi gas-bridge-hub postgres:16-alpine

# Start fresh
docker-compose up -d
```

### Port Already in Use

```bash
# Change application port
# Edit docker-compose.yml:
ports:
  - "8080:3000"  # Use port 8080 instead

# Change database port
# Edit docker-compose.yml:
ports:
  - "5433:5432"  # Use port 5433 instead
```

---

## 📈 Production Deployment

### 1. Update Environment

```bash
# Edit .env for production
BETTER_AUTH_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
DB_PASSWORD=very_secure_password_here
```

### 2. Add Resource Limits

Edit `docker-compose.yml`:

```yaml
services:
  gas-bridge-hub:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  postgres:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

### 3. Setup Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/gas-bridge-hub
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 💾 Backup & Restore

### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U postgres gas_bridge_hub > $BACKUP_DIR/db_$DATE.sql

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz logs/

# Keep only last 7 backups
ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs -r rm
ls -t $BACKUP_DIR/logs_*.tar.gz | tail -n +8 | xargs -r rm

echo "✅ Backup completed: $DATE"
```

### Restore from Backup

```bash
# Stop application
docker-compose stop gas-bridge-hub

# Restore database
docker-compose exec -T postgres psql -U postgres -d gas_bridge_hub < backups/db_20260120_101500.sql

# Restore logs
tar -xzf backups/logs_20260120_101500.tar.gz

# Start application
docker-compose start gas-bridge-hub
```

---

## 🔐 Security Best Practices

### 1. Strong Passwords

```bash
# Generate secure password
openssl rand -base64 32

# Use in .env
DB_PASSWORD=$(openssl rand -base64 32)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

### 2. Network Isolation

```bash
# Don't expose PostgreSQL port in production
# Comment out in docker-compose.yml:
# ports:
#   - "5432:5432"
```

### 3. Regular Updates

```bash
# Update base images
docker-compose pull
docker-compose up -d --build
```

### 4. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # Block PostgreSQL from outside
```

---

## 📊 Monitoring

### Container Health

```bash
# Check health status
docker-compose ps

# Detailed health info
docker inspect gas-bridge-hub | grep -A 10 Health
docker inspect gas-bridge-postgres | grep -A 10 Health
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Disk usage
docker system df

# Volume size
docker volume inspect gasrepeater_postgres_data
```

### Application Logs

```bash
# Follow all logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Logs since 1 hour ago
docker-compose logs --since 1h
```

---

## ✅ Production Checklist

Before deploying to production:

- [ ] `.env` configured with secure passwords
- [ ] `DB_PASSWORD` is strong (32+ characters)
- [ ] `BETTER_AUTH_SECRET` generated securely
- [ ] `BETTER_AUTH_URL` set to production domain
- [ ] `FRONTEND_URL` set to production domain
- [ ] PostgreSQL port NOT exposed (5432)
- [ ] SSL/HTTPS configured (Nginx + Let's Encrypt)
- [ ] Firewall rules configured
- [ ] Backup script setup and tested
- [ ] Resource limits configured
- [ ] Monitoring setup
- [ ] Domain DNS configured

---

## 🆘 Support

- **Documentation**: See `README.md`
- **Docker Logs**: `docker-compose logs -f`
- **Database Access**: `docker-compose exec postgres psql -U postgres -d gas_bridge_hub`

---

## 📝 Summary

**Advantages of Self-Contained Docker:**
- ✅ **No external dependencies** - Runs 100% offline
- ✅ **Easy deployment** - One command setup
- ✅ **Data persistence** - PostgreSQL volume
- ✅ **Full control** - Own your database
- ✅ **Cost effective** - No cloud database fees
- ✅ **Fast** - Local database = low latency

**Deployment Time:** ~2 minutes

---

**Last Updated:** 2026-01-20  
**PostgreSQL Version:** 16 Alpine  
**Node Version:** 20 Alpine

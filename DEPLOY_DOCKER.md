# 🚀 Cara Deploy ke Docker - Step by Step

## 📋 Prerequisites

Pastikan sudah terinstall:
- ✅ Docker Desktop (Mac/Windows) atau Docker Engine (Linux)
- ✅ Git (untuk clone repository)

---

## 🎯 Deployment Steps

### **Step 1: Clone Repository**

```bash
# Clone project
git clone https://github.com/yourusername/gas-bridge-hub.git
cd gas-bridge-hub
```

### **Step 2: Configure Environment**

```bash
# Copy template environment
cp .env.docker .env

# Edit configuration
nano .env
# Atau gunakan editor favorit: code .env, vim .env, dll
```

**Yang HARUS diubah di `.env`:**

```bash
# 1. Set password PostgreSQL (ganti dengan password kuat)
DB_PASSWORD=your_very_secure_password_here

# 2. Generate auth secret (jalankan command ini):
openssl rand -base64 32
# Copy hasilnya ke BETTER_AUTH_SECRET

BETTER_AUTH_SECRET=hasil_dari_openssl_rand_diatas
```

**Contoh `.env` yang sudah diisi:**

```bash
# PORTS
APP_PORT=9987
DB_PORT=9988

# DATABASE
DB_PASSWORD=MySecureP@ssw0rd123!
DATABASE_URL=postgresql://postgres:MySecureP@ssw0rd123!@postgres:5432/gas_bridge_hub

# AUTH
BETTER_AUTH_SECRET=xK9mP2vL8nQ4wR7tY6uI3oP1aS5dF0gH2jK4lZ8xC9vB6nM3qW7eR5tY1uI0oP==
BETTER_AUTH_URL=http://localhost:9987

# APP
FRONTEND_URL=http://localhost:9987
PORT=3000
NODE_ENV=production
```

### **Step 3: Deploy!**

**Option A: Automated (Recommended)**

```bash
# Jalankan script deployment
bash docker-deploy.sh
```

Script akan otomatis:
- ✅ Check Docker installation
- ✅ Detect available ports
- ✅ Build Docker images
- ✅ Start containers
- ✅ Initialize database

**Option B: Manual**

```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# Check logs
docker-compose logs -f
```

### **Step 4: Verify Deployment**

```bash
# Check if containers are running
docker-compose ps

# Should show:
# NAME                 STATUS
# gas-bridge-hub       Up (healthy)
# gas-bridge-postgres  Up (healthy)
```

### **Step 5: Access Application**

Buka browser:
```
http://localhost:9987
```

Atau check health:
```bash
curl http://localhost:9987/health
# Should return: {"status":"ok"}
```

---

## 🎉 **Selesai!**

Aplikasi sudah running di Docker dengan:
- 🌐 **Application**: http://localhost:9987
- 🗄️ **PostgreSQL**: localhost:9988
- 📊 **Health Check**: http://localhost:9987/health

---

## 📝 Common Commands

### View Logs

```bash
# All logs
docker-compose logs -f

# Application logs only
docker-compose logs -f gas-bridge-hub

# Database logs only
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100
```

### Stop/Start

```bash
# Stop containers (data tetap ada)
docker-compose down

# Start containers
docker-compose up -d

# Restart containers
docker-compose restart
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d gas_bridge_hub

# Inside PostgreSQL:
\dt              # List tables
\d endpoints     # Describe table
SELECT COUNT(*) FROM logs;  # Query
\q               # Exit
```

### Clean Up

```bash
# Stop and remove containers + data
docker-compose down -v

# Remove images
docker rmi gas-bridge-hub postgres:16-alpine

# Remove all unused Docker data
docker system prune -a
```

---

## 🔧 Troubleshooting

### Port Already in Use

Script otomatis akan cari port lain, tapi jika manual:

```bash
# Edit .env
APP_PORT=8000  # Ganti ke port lain
DB_PORT=8001

# Restart
docker-compose down
docker-compose up -d
```

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Common issues:
# 1. .env tidak ada atau salah format
# 2. DB_PASSWORD tidak match di DATABASE_URL
# 3. Port conflict (gunakan docker-deploy.sh)
```

### Database Connection Error

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U postgres

# If not ready, wait 30 seconds after first start
# Database initialization takes time
```

### Reset Everything

```bash
# Nuclear option - remove everything
docker-compose down -v
rm -rf logs/*
docker-compose up -d
```

---

## 🌐 Production Deployment

### Deploy ke VPS/Server

```bash
# 1. SSH ke server
ssh user@your-server.com

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Clone & Deploy
git clone https://github.com/yourusername/gas-bridge-hub.git
cd gas-bridge-hub
cp .env.docker .env
nano .env  # Configure for production

# 5. Update .env for production
BETTER_AUTH_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# 6. Deploy
bash docker-deploy.sh
```

### Setup Nginx (Optional)

```bash
# Install Nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/gas-bridge-hub
```

**Nginx Config:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:9987;
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gas-bridge-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## ✅ Deployment Checklist

Before going to production:

- [ ] `.env` configured with strong passwords
- [ ] `DB_PASSWORD` is secure (20+ characters)
- [ ] `BETTER_AUTH_SECRET` generated with openssl
- [ ] `BETTER_AUTH_URL` set to production domain
- [ ] `FRONTEND_URL` set to production domain
- [ ] Firewall configured (allow 80, 443)
- [ ] SSL certificate installed
- [ ] Backup strategy in place
- [ ] Monitoring setup (optional)

---

## 📊 Quick Reference

| Command | Description |
|---------|-------------|
| `bash docker-deploy.sh` | Deploy with auto port detection |
| `docker-compose up -d` | Start containers |
| `docker-compose down` | Stop containers |
| `docker-compose logs -f` | View logs |
| `docker-compose ps` | Check status |
| `docker-compose restart` | Restart all |
| `docker-compose down -v` | Remove everything |

---

## 🆘 Need Help?

- 📚 **Full Guide**: See `DOCKER_GUIDE.md`
- 🐛 **Issues**: Check `docker-compose logs`
- 💬 **Support**: GitHub Issues

---

**Deployment Time:** ~5 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Easy)

**Last Updated:** 2026-01-20

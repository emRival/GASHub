# 🌉 GAS Bridge Hub

**Enterprise-grade API Gateway for Google Apps Script**

Transform your Google Apps Script into a powerful, secure API with real-time monitoring, API key management, and payload transformation.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/emRival/GASHub)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://hub.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🚀 **Real-time Dashboard** - Monitor API performance with WebSocket live updates
- 🔐 **API Key Management** - Secure endpoints with scoped API keys
- 🔄 **Payload Transformation** - Map and transform request payloads
- 📊 **Analytics & Logging** - Track requests, response times, and error rates
- ⚡ **Rate Limiting** - Built-in DDoS protection
- 🎨 **Modern UI** - Beautiful dashboard with 3D animations
- 🐳 **Docker Ready** - One-command deployment
- 🌐 **Vercel Compatible** - Deploy to Vercel in minutes

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone repository
git clone https://github.com/emRival/GASHub.git
cd GASHub

# Run setup script
bash setup.sh

# Start development
npm run dev
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp backend/.env.example .env
# Edit .env with your Supabase credentials

# 3. Setup database
# Go to Supabase Dashboard → SQL Editor
# Run: database-schema.sql

# 4. Start development
npm run dev
```

### Option 3: Docker

```bash
# 1. Clone and configure
git clone https://github.com/emRival/GASHub.git
cd GASHub
cp backend/.env.example .env
# Edit .env

# 2. Run with Docker
docker-compose up -d

# Access at http://localhost:3000
```

## 📋 Prerequisites

- **Node.js** 18+ or 20+
- **Supabase Account** (free tier works)
- **Google Apps Script** endpoint

## 🔧 Configuration

### Environment Variables

Create `.env` file in root directory:

```bash
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Authentication
BETTER_AUTH_SECRET=your_secret_key_min_32_chars  # Generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Application
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

### Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Copy content from `database-schema.sql`
4. Click **Run**

## 📦 Deployment

### Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Add environment variables in Vercel dashboard
# 4. Redeploy
vercel --prod
```

### Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### VPS / Self-Hosted

```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone and setup
git clone https://github.com/yourusername/gas-bridge-hub.git
cd gas-bridge-hub
npm install

# 3. Build
npm run build

# 4. Start with PM2
npm install -g pm2
pm2 start backend/dist/server.js --name gas-bridge-hub
pm2 save
pm2 startup
```

## 📖 Usage

### 1. Create Endpoint

1. Login to dashboard
2. Go to **Endpoints** → **Create New**
3. Configure:
   - **Name**: My GAS Endpoint
   - **Alias**: `my-endpoint`
   - **GAS URL**: Your Google Apps Script URL
   - **Payload Mapping**: (optional)

### 2. Generate API Key

1. Go to **API Keys** → **Generate New**
2. Set permissions and expiry
3. Copy the key (shown only once!)

### 3. Make Request

```bash
curl -X POST https://your-domain.com/r/my-endpoint \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello GAS!"}'
```

### 4. Monitor

- View real-time requests in **Dashboard**
- Check logs in **Logs** page
- Analyze performance metrics

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  GAS Bridge  │─────▶│ Google Apps │
│             │      │     Hub      │      │   Script    │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Supabase   │
                     │   Database   │
                     └──────────────┘
```

## 🛡️ Security Features

- ✅ API Key Authentication with SHA-256 hashing
- ✅ Rate Limiting (60 req/min per IP)
- ✅ CORS Protection
- ✅ Helmet.js Security Headers
- ✅ Request Size Limiting
- ✅ SQL Injection Protection (Drizzle ORM)

## 📊 Tech Stack

**Frontend:**
- React + TypeScript
- TanStack Router & Query
- Tailwind CSS + shadcn/ui
- Three.js (3D animations)
- Recharts (Analytics)

**Backend:**
- Node.js + Express
- TypeScript
- Drizzle ORM
- Socket.IO (Real-time)
- Better-Auth (Authentication)

**Database:**
- Supabase (PostgreSQL)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](./DEPLOYMENT_GUIDE.md)
- 🐛 [Issue Tracker](https://github.com/emRival/GASHub/issues)
- 💬 [Discussions](https://github.com/emRival/GASHub/discussions)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Database & Auth
- [Vercel](https://vercel.com) - Hosting
- [shadcn/ui](https://ui.shadcn.com) - UI Components

---

**Made with ❤️ for the Google Apps Script community**

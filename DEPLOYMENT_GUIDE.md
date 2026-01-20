# 🚀 Deployment & Auto-Migration Guide

## 📋 Status Database Setup Saat Ini

### ⚠️ **Setup Saat Ini: MANUAL (Belum Auto-Migration)**

Aplikasi Anda saat ini menggunakan **manual SQL execution**:

```bash
# Current approach
npm run setup-db   # Copy SQL to clipboard
npm run migrate    # Check if tables exist
```

**Masalah:**
- ❌ User baru harus manual paste SQL ke Supabase dashboard
- ❌ Tidak ada auto-migration saat deployment
- ❌ Tidak cocok untuk Docker/self-hosted

## ✅ **Solusi: Auto-Migration System**

### Option 1: Drizzle ORM Auto-Migration (Recommended)

Drizzle sudah terinstall, tapi belum digunakan untuk migration. Mari kita aktifkan!

#### 1. Update Migration Script

**File: `backend/src/auto-migrate.ts`** (NEW)
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
    console.log('🚀 Running database migrations...\n');

    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment variables');
        process.exit(1);
    }

    // Create connection for migrations
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    try {
        console.log('📦 Applying migrations from drizzle/ folder...');
        
        await migrate(db, { 
            migrationsFolder: './drizzle',
            migrationsTable: 'drizzle_migrations'
        });

        console.log('✅ Migrations completed successfully!\n');
        console.log('🎉 Database is ready!\n');
        
        await migrationClient.end();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        await migrationClient.end();
        process.exit(1);
    }
}

runMigrations();
```

#### 2. Update package.json

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "tsx src/auto-migrate.ts",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "postinstall": "npm run db:migrate"  // Auto-migrate on install
  }
}
```

#### 3. Generate Initial Migration

```bash
# Generate migration from schema
npm run db:generate

# Apply migration
npm run db:migrate
```

### Option 2: SQL-based Auto-Migration

**File: `backend/src/sql-migrate.ts`** (NEW)
```typescript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runSQLMigration() {
    console.log('🚀 Running SQL migrations...\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Read SQL file
        const sqlPath = join(__dirname, '../../database-schema.sql');
        const sql = readFileSync(sqlPath, 'utf-8');

        console.log('📄 Executing database-schema.sql...');

        // Execute SQL via Supabase REST API
        const { data, error } = await supabase.rpc('exec_sql', { 
            sql_query: sql 
        });

        if (error) {
            // If exec_sql function doesn't exist, create it first
            console.log('⚠️  Creating exec_sql function...');
            
            const createFunctionSQL = `
                CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
                RETURNS void AS $$
                BEGIN
                    EXECUTE sql_query;
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            `;

            // This requires manual setup once
            console.log('💡 Please run this SQL in Supabase dashboard first:');
            console.log(createFunctionSQL);
            process.exit(1);
        }

        console.log('✅ Migration completed successfully!\n');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runSQLMigration();
```

## 🐳 **Docker Setup with Auto-Migration**

### Dockerfile

**File: `Dockerfile`** (NEW)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/database-schema.sql ./

# Copy migration scripts
COPY --from=builder /app/backend/src/auto-migrate.ts ./backend/src/
COPY --from=builder /app/backend/drizzle ./backend/drizzle

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Run migrations on startup
CMD cd backend && npm run db:migrate && npm start
```

### docker-compose.yml

**File: `docker-compose.yml`** (NEW)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - FRONTEND_URL=${FRONTEND_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### .env.example

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Auth
BETTER_AUTH_SECRET=your_secret_key_min_32_chars
BETTER_AUTH_URL=http://localhost:3000

# Frontend
FRONTEND_URL=http://localhost:5173
```

## 📦 **Installation Guide for New Users**

### Quick Start (Vercel + Supabase)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/gas-bridge-hub.git
cd gas-bridge-hub

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Run auto-migration
cd backend
npm run db:migrate

# 5. Start development
npm run dev
```

### Docker Deployment

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/gas-bridge-hub.git
cd gas-bridge-hub

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Build and run
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Access application
open http://localhost:3000
```

### Self-Hosted (VPS/Server)

```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone repository
git clone https://github.com/yourusername/gas-bridge-hub.git
cd gas-bridge-hub

# 3. Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# 4. Setup environment
cp .env.example .env
nano .env  # Edit with your credentials

# 5. Run migrations
cd backend
npm run db:migrate

# 6. Build application
cd ../frontend
npm run build
cd ../backend
npm run build

# 7. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔄 **Migration Workflow**

### For Developers

```bash
# 1. Modify schema in backend/src/db/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Review migration in drizzle/ folder
# 4. Apply migration
npm run db:migrate

# 5. Commit migration files
git add drizzle/
git commit -m "feat: add new table"
```

### For New Installations

```bash
# Automatic on first install
npm install  # Runs postinstall → db:migrate

# Or manual
npm run db:migrate
```

## ✅ **Checklist untuk Auto-Migration**

### Setup Tasks:

- [ ] Install postgres driver: `npm install postgres`
- [ ] Create `auto-migrate.ts` script
- [ ] Update `package.json` scripts
- [ ] Generate initial migration: `npm run db:generate`
- [ ] Test migration: `npm run db:migrate`
- [ ] Add postinstall hook
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Test Docker deployment
- [ ] Update README.md with deployment guide

### Verification:

- [ ] Fresh install works without manual SQL
- [ ] Docker deployment runs migrations automatically
- [ ] Vercel deployment works
- [ ] Migration rollback works (if needed)
- [ ] Multiple environments tested (dev, staging, prod)

## 🚨 **Current Status**

**Aplikasi Anda saat ini:**
- ❌ **Tidak ada auto-migration** - Butuh manual SQL execution
- ⚠️ **Tidak siap untuk Docker** - Butuh manual setup
- ⚠️ **Tidak user-friendly** - New users harus manual paste SQL

**Untuk production-ready, perlu:**
1. Implement Drizzle auto-migration
2. Add Docker support
3. Create comprehensive deployment guide
4. Test on fresh installation

## 📝 **Rekomendasi**

**Prioritas Tinggi:**
1. ✅ Implement auto-migration dengan Drizzle
2. ✅ Add Docker support
3. ✅ Create deployment documentation

**Prioritas Medium:**
4. Add migration rollback support
5. Add database seeding for demo data
6. Add health checks

**Prioritas Low:**
7. Add database backup automation
8. Add monitoring/alerting
9. Add multi-database support

---

**Next Steps:** Apakah Anda ingin saya implement auto-migration system sekarang?

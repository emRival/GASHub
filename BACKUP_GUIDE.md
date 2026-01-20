# 📦 Database Backup & Restore Guide

## 🎯 Overview

Panduan lengkap untuk setup automated backup dan restore procedure untuk Supabase database.

## 🔄 Automated Backup di Supabase

### 1. **Supabase Dashboard Backup (Recommended)**

#### Akses Backup Settings:
1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Navigate ke **Settings** → **Database**
4. Scroll ke section **"Database Backups"**

#### Backup Options:

**Free Tier:**
- ✅ Daily automated backups (retained for 7 days)
- ✅ Point-in-Time Recovery (PITR) - Last 7 days
- ⚠️ Limited to 7 days retention

**Pro Tier ($25/month):**
- ✅ Daily automated backups (retained for 30 days)
- ✅ Point-in-Time Recovery - Last 30 days
- ✅ Manual backups on-demand

### 2. **Manual Backup via pg_dump**

#### Install PostgreSQL Tools:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

#### Create Backup Script:

**File: `scripts/backup-db.sh`**
```bash
#!/bin/bash

# Configuration
PROJECT_REF="your-project-ref"  # Get from Supabase dashboard URL
DB_PASSWORD="your-db-password"   # Get from Settings → Database
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Run pg_dump
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.$PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f $BACKUP_FILE

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 30 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +31 | xargs -r rm

echo "🧹 Old backups cleaned up"
```

#### Make Script Executable:
```bash
chmod +x scripts/backup-db.sh
```

#### Run Manual Backup:
```bash
./scripts/backup-db.sh
```

### 3. **Automated Backup with Cron (Linux/macOS)**

#### Setup Cron Job:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/your/project/scripts/backup-db.sh >> /path/to/your/project/logs/backup.log 2>&1
```

### 4. **Automated Backup with GitHub Actions**

**File: `.github/workflows/backup.yml`**
```yaml
name: Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install PostgreSQL client
        run: sudo apt-get install -y postgresql-client

      - name: Create backup
        env:
          DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
        run: |
          DATE=$(date +%Y%m%d_%H%M%S)
          BACKUP_FILE="backup_$DATE.sql"
          
          PGPASSWORD=$DB_PASSWORD pg_dump \
            -h db.$PROJECT_REF.supabase.co \
            -U postgres \
            -d postgres \
            -F c \
            -f $BACKUP_FILE
          
          echo "✅ Backup created: $BACKUP_FILE"

      - name: Upload to GitHub Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backup_*.sql
          retention-days: 30
```

**Setup Secrets di GitHub:**
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_PROJECT_REF`

## 🔧 Restore Procedure

### 1. **Restore from Supabase Dashboard**

#### Point-in-Time Recovery:
1. Go to **Settings** → **Database** → **Backups**
2. Click **"Restore"** on desired backup
3. Choose restore point
4. Confirm restoration

⚠️ **Warning:** This will overwrite current database!

### 2. **Restore from Manual Backup**

#### Using pg_restore:
```bash
#!/bin/bash

# Configuration
PROJECT_REF="your-project-ref"
DB_PASSWORD="your-db-password"
BACKUP_FILE="./backups/backup_20260114_020000.sql"

# Restore database
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h db.$PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  $BACKUP_FILE

echo "✅ Database restored from: $BACKUP_FILE"
```

**Save as: `scripts/restore-db.sh`**
```bash
chmod +x scripts/restore-db.sh
./scripts/restore-db.sh
```

### 3. **Test Restore Procedure**

#### Create Test Environment:
```bash
# 1. Create test Supabase project
# 2. Get test project credentials
# 3. Restore backup to test project

PGPASSWORD=$TEST_DB_PASSWORD pg_restore \
  -h db.$TEST_PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  ./backups/backup_latest.sql
```

#### Verify Restored Data:
```sql
-- Connect to test database
psql -h db.$TEST_PROJECT_REF.supabase.co -U postgres -d postgres

-- Check tables
\dt

-- Check row counts
SELECT 'endpoints' as table, COUNT(*) FROM endpoints
UNION ALL
SELECT 'logs', COUNT(*) FROM logs
UNION ALL
SELECT 'api_keys', COUNT(*) FROM api_keys;

-- Verify recent data
SELECT * FROM logs ORDER BY created_at DESC LIMIT 5;
```

## 📋 Backup Checklist

### Daily:
- [ ] Verify automated backup ran successfully
- [ ] Check backup file size (should be consistent)

### Weekly:
- [ ] Test restore to staging environment
- [ ] Verify data integrity after restore
- [ ] Clean up old backups (keep last 30)

### Monthly:
- [ ] Full restore test to fresh database
- [ ] Document any issues encountered
- [ ] Update backup scripts if needed

## 🚨 Emergency Restore

### If Database is Corrupted:

1. **Stop Application:**
   ```bash
   # Stop backend to prevent new writes
   vercel --prod --env production
   ```

2. **Restore from Latest Backup:**
   ```bash
   ./scripts/restore-db.sh
   ```

3. **Verify Data:**
   ```bash
   # Check critical tables
   psql -h db.$PROJECT_REF.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM endpoints;"
   ```

4. **Restart Application:**
   ```bash
   # Redeploy to Vercel
   vercel --prod
   ```

## 📊 Backup Monitoring

### Check Backup Status:
```bash
# List all backups
ls -lh backups/

# Check latest backup
ls -lt backups/ | head -n 2

# Verify backup integrity
pg_restore --list backups/backup_latest.sql | head -n 20
```

### Backup Size Monitoring:
```bash
# Track backup size over time
du -h backups/* | tail -n 10
```

## 🔐 Security Best Practices

1. **Encrypt Backups:**
   ```bash
   # Encrypt backup file
   gpg --symmetric --cipher-algo AES256 backup.sql
   
   # Decrypt when needed
   gpg --decrypt backup.sql.gpg > backup.sql
   ```

2. **Store Backups Securely:**
   - ✅ Use encrypted cloud storage (S3, Google Cloud Storage)
   - ✅ Keep backups in different region than primary DB
   - ✅ Limit access to backup files

3. **Never Commit Backups to Git:**
   ```bash
   # Add to .gitignore
   echo "backups/" >> .gitignore
   echo "*.sql" >> .gitignore
   ```

## 📝 Backup Retention Policy

| Backup Type | Retention | Storage |
|-------------|-----------|---------|
| Daily | 7 days | Local/GitHub |
| Weekly | 4 weeks | Cloud Storage |
| Monthly | 12 months | Cold Storage |
| Yearly | 3 years | Archive |

## ✅ Quick Start

1. **Get Supabase Credentials:**
   - Project Ref: `Settings → General → Reference ID`
   - DB Password: `Settings → Database → Database Password`

2. **Create Backup Script:**
   ```bash
   mkdir -p scripts backups logs
   # Copy backup-db.sh from above
   chmod +x scripts/backup-db.sh
   ```

3. **Run First Backup:**
   ```bash
   ./scripts/backup-db.sh
   ```

4. **Test Restore:**
   ```bash
   # Create test project first
   ./scripts/restore-db.sh
   ```

5. **Setup Automation:**
   - Option A: Cron job (Linux/macOS)
   - Option B: GitHub Actions (Recommended)

## 🆘 Support

- **Supabase Docs:** https://supabase.com/docs/guides/database/backups
- **PostgreSQL Backup:** https://www.postgresql.org/docs/current/backup.html
- **GitHub Actions:** https://docs.github.com/en/actions

---

**Last Updated:** 2026-01-14  
**Tested On:** Supabase Free Tier & Pro Tier

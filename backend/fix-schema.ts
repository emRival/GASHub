
import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
    console.log('Running migration...');

    try {
        // 1. Create api_keys table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES "user"(id),
                name TEXT NOT NULL,
                key_hash TEXT NOT NULL UNIQUE,
                key_prefix TEXT NOT NULL,
                scopes JSONB DEFAULT '["read", "write"]',
                is_active BOOLEAN DEFAULT true,
                expires_at TIMESTAMPTZ,
                last_used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ api_keys table created');

        // 2. Add require_api_key to endpoints
        await db.execute(sql`
            ALTER TABLE endpoints 
            ADD COLUMN IF NOT EXISTS require_api_key BOOLEAN DEFAULT false;
        `);
        console.log('✅ require_api_key column added to endpoints');

        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

runMigration();

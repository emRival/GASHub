
import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Running migration: add-scoped-keys...');

    try {
        await db.execute(sql`
            ALTER TABLE api_keys 
            ADD COLUMN IF NOT EXISTS allowed_endpoint_ids JSONB;
        `);
        console.log('Migration successful: allowed_endpoint_ids column added.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

main();

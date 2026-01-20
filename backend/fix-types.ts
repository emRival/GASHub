
import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
    console.log('Running type migration...');

    try {
        // Alter endpoints.user_id to TEXT
        await db.execute(sql`
            ALTER TABLE endpoints 
            ALTER COLUMN user_id TYPE TEXT;
        `);
        console.log('✅ endpoints.user_id altered to TEXT');

        // Verify api_keys.user_id is TEXT (it should be, but just in case)
        // Must drop policy first if exists
        try {
            await db.execute(sql`DROP POLICY IF EXISTS "Users can view own api_keys" ON api_keys`);
            await db.execute(sql`DROP POLICY IF EXISTS "Users can select own api_keys" ON api_keys`);
            await db.execute(sql`DROP POLICY IF EXISTS "Users can insert own api_keys" ON api_keys`);
            await db.execute(sql`DROP POLICY IF EXISTS "Users can create own api_keys" ON api_keys`);
            await db.execute(sql`DROP POLICY IF EXISTS "Users can update own api_keys" ON api_keys`);
            await db.execute(sql`DROP POLICY IF EXISTS "Users can delete own api_keys" ON api_keys`);

            // Drop FK constraint causing type incompatibility
            await db.execute(sql`ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey`);
        } catch (e) {
            console.log('Policy drop ignored/failed', e);
        }

        await db.execute(sql`
            ALTER TABLE api_keys 
            ALTER COLUMN user_id TYPE TEXT;
        `);
        console.log('✅ api_keys.user_id verified as TEXT');

        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

runMigration();

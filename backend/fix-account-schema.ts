
import { db } from './src/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('Running migration: Adding id_token to account table...');
    try {
        await db.execute(sql`
      ALTER TABLE account 
      ADD COLUMN IF NOT EXISTS id_token TEXT;
    `);
        console.log('✅ Migration successful: id_token column added.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
    process.exit(0);
}

main();


import dotenv from 'dotenv';
dotenv.config();

// Dynamic import to ensure env vars are loaded first
async function main() {
    const { db } = await import('./src/db/index.js'); // Assuming compiled or tsx handles .ts resolution
    const { sql } = await import('drizzle-orm');

    console.log('Running migration: Adding id_token to account table...');
    try {
        await db.execute(sql`
      ALTER TABLE account 
      ADD COLUMN IF NOT EXISTS id_token TEXT;
    `);
        console.log('✅ Migration successful: id_token column added.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    process.exit(0);
}

main();

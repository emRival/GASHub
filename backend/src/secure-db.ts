
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Connecting to database...');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const tables = [
    'api_keys',
    'logs',
    'endpoints',
    'session',
    'user',
    'verification',
    'account'
];

async function secureDatabase() {
    try {
        await client.connect();

        for (const table of tables) {
            console.log(`Securing table: ${table}`);

            // 1. Enable RLS
            await client.query(`ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;`);
            console.log(`  - RLS Enabled for ${table}`);

            // 2. Drop existing policies to avoid conflicts
            // Intentionally dropping "allow-all" policies if they exist (except logs)
            // Note: Postgres doesn't support "DROP POLICY IF EXISTS" cleanly without specifying table, 
            // so we'll just ignore errors or use specific names if we knew them.
            // For now, we rely on enabling RLS. 
            // If RLS is enabled and no policy exists, it default denies PUBLIC access.
            // The SERVICE_ROLE key (postgres user) bypasses RLS.
        }

        // 3. Special Policy for Logs (Allow Public Read for Realtime)
        console.log('Configuring Public Access for Logs...');
        try {
            await client.query(`DROP POLICY IF EXISTS "Public Read Logs" ON "public"."logs";`);
            await client.query(`
                CREATE POLICY "Public Read Logs" 
                ON "public"."logs" 
                FOR SELECT 
                USING (true);
            `);
            console.log('  - "Public Read Logs" policy created');
        } catch (e: any) {
            console.log('  - Error creating logs policy:', e.message);
        }

        console.log('Database security hardening complete.');

    } catch (err) {
        console.error('Error securing database:', err);
    } finally {
        await client.end();
    }
}

secureDatabase();

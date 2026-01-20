
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const client = new Client({ connectionString });

// Helper to run raw queries since we're mixed mode
const runQuery = async (query: string) => {
    return client.query(query);
};

const main = async () => {
    console.log('Running migration: Add Performance Indexes...');
    await client.connect();

    try {
        // 1. Index on logs(endpoint_id) - needed for all analytics filtering
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_endpoint_id ON logs (endpoint_id)`);
        console.log('✅ Created index: idx_logs_endpoint_id');

        // 2. Index on logs(created_at) - needed for date range filtering and sorting
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs (created_at)`);
        console.log('✅ Created index: idx_logs_created_at');

        // 3. Composite Index on logs(endpoint_id, created_at, response_status)
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_logs_analytics_composite ON logs (endpoint_id, created_at, response_status)`);
        console.log('✅ Created index: idx_logs_analytics_composite');

        // 4. Index on endpoints(user_id)
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON endpoints (user_id)`);
        console.log('✅ Created index: idx_endpoints_user_id');

        // 5. Index on api_keys(key_hash)
        await runQuery(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash)`);
        console.log('✅ Created index: idx_api_keys_hash');

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();

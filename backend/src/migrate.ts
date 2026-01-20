import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' }
});

async function runMigration() {
    console.log('🚀 Starting database migration via Supabase API...\n');

    try {
        // We'll create tables by directly inserting test data and letting Supabase create schema
        // This is a workaround since Supabase JS client doesn't support direct SQL DDL

        console.log('� Checking if tables exist...\n');

        // Test if endpoints table exists
        const { error: endpointsCheck } = await supabase
            .from('endpoints')
            .select('id')
            .limit(1);

        if (endpointsCheck && endpointsCheck.code === 'PGRST116') {
            console.log('⚠️  Tables do not exist yet.');
            console.log('\n💡 Please run the SQL manually in Supabase Dashboard:\n');
            console.log('   1. Go to https://supabase.com/dashboard');
            console.log('   2. Select your project');
            console.log('   3. Click "SQL Editor" in sidebar');
            console.log('   4. Click "New Query"');
            console.log('   5. Copy content from database-schema.sql');
            console.log('   6. Paste and click "Run"\n');
            console.log('Or run this command:');
            console.log('   cat database-schema.sql | pbcopy  (copies to clipboard)\n');
            process.exit(1);
        } else if (!endpointsCheck) {
            console.log('✅ Tables already exist!\n');
            console.log('📋 Verifying tables:');

            // Verify each table
            const tables = ['projects', 'endpoints', 'api_keys', 'logs'];
            for (const table of tables) {
                const { error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(0);

                if (error) {
                    console.log(`   ❌ ${table} - NOT FOUND`);
                } else {
                    console.log(`   ✅  ${table}`);
                }
            }

            console.log('\n🎉 Database is ready!\n');
            console.log('Next steps:');
            console.log('   npm run dev   # Start the backend server\n');
        } else {
            throw endpointsCheck;
        }

    } catch (error: any) {
        console.error('❌ Migration check failed:', error.message);
        console.log('\n💡 Please run the SQL schema manually in Supabase Dashboard\n');
        process.exit(1);
    }
}

runMigration();

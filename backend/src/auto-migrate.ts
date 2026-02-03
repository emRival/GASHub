#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runAutoMigration() {
    console.log('🚀 GAS Bridge Hub - Auto Migration\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing environment variables:');
        console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
        console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
        console.error('\n💡 Please check your .env file\n');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('📊 Checking database status...\n');

        // Check if tables exist
        const { error: checkError } = await supabase
            .from('endpoints')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === 'PGRST116') {
            console.log('⚠️  Tables not found. Running migration...\n');

            // Read SQL schema
            const sqlPath = join(__dirname, '../../database-schema.sql');
            const sql = readFileSync(sqlPath, 'utf-8');

            console.log('📄 Executing database-schema.sql...');
            console.log('   File size:', (sql.length / 1024).toFixed(2), 'KB\n');

            // Split SQL into individual statements
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            console.log('📝 Found', statements.length, 'SQL statements\n');

            // Execute each statement
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];

                // Skip comments
                if (statement.startsWith('--')) continue;

                try {
                    // Use rpc to execute raw SQL
                    const { error } = await supabase.rpc('exec_sql', {
                        query: statement + ';'
                    });

                    if (error) {
                        // If exec_sql doesn't exist, try direct query
                        console.log(`   [${i + 1}/${statements.length}] Executing...`);
                        // Most statements will need to be run manually
                        throw new Error('exec_sql function not available');
                    }
                } catch (err) {
                    // Expected - Supabase doesn't allow DDL via API
                    if (i === 0) {
                        console.log('⚠️  Cannot execute DDL via Supabase API\n');
                        console.log('📋 Please run the SQL manually:\n');
                        console.log('   1. Go to: https://supabase.com/dashboard');
                        console.log('   2. Select your project');
                        console.log('   3. Click "SQL Editor" → "New Query"');
                        console.log('   4. Copy content from: database-schema.sql');
                        console.log('   5. Paste and click "Run"\n');
                        console.log('Or use this command to copy to clipboard:');
                        console.log('   cat database-schema.sql | pbcopy\n');
                        process.exit(1);
                    }
                }
            }

            console.log('✅ Migration completed!\n');
        } else if (!checkError) {
            console.log('✅ Database already initialized!\n');

            // Verify all tables
            const tables = ['endpoints', 'api_keys', 'logs'];
            console.log('📋 Verifying tables:');

            for (const table of tables) {
                const { error } = await supabase
                    .from(table)
                    .select('id')
                    .limit(0);

                if (error) {
                    console.log(`   ❌ ${table}`);
                } else {
                    console.log(`   ✅ ${table}`);
                }
            }

            console.log('\n🎉 Database is ready!\n');
        } else {
            throw checkError;
        }

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n💡 Please run the SQL schema manually in Supabase Dashboard\n');
        process.exit(1);
    }
}

// Only run if called directly
// Only run if called directly
if (process.argv[1] === __filename) {
    runAutoMigration();
}

export { runAutoMigration };

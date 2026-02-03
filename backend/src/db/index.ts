import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_URL?.replace('https://', 'postgresql://postgres:') + ':5432/postgres?sslmode=require',
    max: 1, // Limit pool for serverless to prevent exhaustion
    connectionTimeoutMillis: 3000, // Fail fast after 3s if can't connect
    idleTimeoutMillis: 3000,
});

export const db = drizzle(pool, { schema });

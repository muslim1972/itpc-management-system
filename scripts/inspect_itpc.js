
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
    envContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => {
            const index = line.indexOf('=');
            return [line.slice(0, index).trim(), line.slice(index + 1).replace(/^"|"$/g, '').trim()];
        })
);

const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    { db: { schema: 'itpc' } }
);

async function inspectSchema() {
    console.log('Inspecting itpc schema...');
    
    // 1. Get all tables in itpc schema
    const { data: tables, error: tableErr } = await supabase.from('organizations').select('*').limit(0);
    if (tableErr) {
        console.error('Error accessing organizations:', tableErr);
    }

    // 2. Try to get details via information_schema if allowed (often restricted for anon)
    // 3. Fallback: query each suspected table to see columns
    const tablesToTry = [
        'organizations', 
        'provider_companies', 
        'provider_subscriptions', 
        'service_ranges', 
        'users',
        'app_news'
    ];

    for (const table of tablesToTry) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table}: Error - ${error.message}`);
        } else {
            if (data.length > 0) {
                console.log(`✅ Table ${table}: Columns - [${Object.keys(data[0]).join(', ')}]`);
            } else {
                console.log(`⚠️ Table ${table}: Exists but is EMPTY (cannot see columns)`);
            }
        }
    }
}

inspectSchema();

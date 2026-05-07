import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'itpc' } });

const tables = [
    'users',
    'organizations',
    'provider_companies',
    'provider_subscriptions',
    'organization_services',
    'service_items',
    'payments',
    'service_ranges',
    'service_contract_periods',
    'app_news',
    'provider_subscription_price_history'
];

async function inspectSchema() {
    console.log('--- Inspecting all 11 tables in itpc schema ---\n');
    
    for (const table of tables) {
        // Query 1 row to get columns
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
            console.log(`❌ Table ${table}: Error - ${error.message}`);
        } else {
            if (data && data.length > 0) {
                console.log(`✅ Table ${table}: Columns - [${Object.keys(data[0]).join(', ')}]`);
            } else {
                console.log(`⚠️ Table ${table}: Exists but is EMPTY (cannot determine columns via REST API).`);
            }
        }
    }
}

inspectSchema();

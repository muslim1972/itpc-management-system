
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    // Query information_schema via RPC or directly if possible
    // Since direct query might be blocked, we can try to query the table and see the keys of the first row
    const { data, error } = await supabase.from('itpc.users').select('*').limit(1);
    if (error) {
        // Try without itpc. prefix if schema is set in client (but it's not here)
        const supabaseItpc = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { db: { schema: 'itpc' } });
        const { data: data2, error: error2 } = await supabaseItpc.from('users').select('*').limit(1);
        if (error2) {
            console.log('Error:', error2.message);
        } else {
            console.log('Columns:', Object.keys(data2[0] || {}));
        }
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}
run();

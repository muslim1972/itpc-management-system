
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
    const { data, error } = await supabase
        .from('departments')
        .select('name')
        .eq('id', '33333333-2222-2222-2222-222222222222')
        .single();
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Dept Name:', data.name);
    }
}
run();

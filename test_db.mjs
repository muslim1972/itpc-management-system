import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvnjkqxpnhridlbczkgw.supabase.co';
const supabaseAnonKey = 'sb_publishable_WSFpLJv1U6t-VezOuSWwZw_Dr8PvoyS';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'itpc'
  }
});

async function run() {
  const { data, error } = await supabase.from('organizations').select('*');
  console.log('Organizations Data length:', data?.length);
  console.log('Organizations Error:', error);
}

run();

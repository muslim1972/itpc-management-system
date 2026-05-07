const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jvnjkqxpnhridlbczkgw.supabase.co';
const supabaseKey = 'sb_publishable_WSFpLJv1U6t-VezOuSWwZw_Dr8PvoyS';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'itpc' }
});

async function checkCols() {
  const { data, error } = await supabase.from('organization_services').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || {}));
}

checkCols();

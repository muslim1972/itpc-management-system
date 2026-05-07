const { createClient } = require('@supabase/supabase-js');

const VITE_SUPABASE_URL="https://jvnjkqxpnhridlbczkgw.supabase.co";
const VITE_SUPABASE_ANON_KEY="sb_publishable_WSFpLJv1U6t-VezOuSWwZw_Dr8PvoyS";

async function listAllTables() {
  const schemas = ['itpc', 'public'];
  for (const schema of schemas) {
    const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
      db: { schema }
    });
    
    // We try to list tables by querying postgres catalog if we can, 
    // but anon key usually can't do that.
    // So we'll just check common names in each schema.
    const commonNames = ['audit_logs', 'logs', 'history', 'activities', 'audit', 'system_logs', 'app_logs', 'logs_all'];
    console.log(`Checking schema: ${schema}`);
    for (const t of commonNames) {
      try {
        const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: true }).limit(1);
        if (!error) {
          console.log(`  [FOUND] ${schema}.${t} exists with ${count} records`);
        } else {
          if (!error.message.includes('not find')) {
             console.log(`  [EXISTS?] ${schema}.${t} - error: ${error.message}`);
          }
        }
      } catch (e) {}
    }
  }
}

listAllTables();

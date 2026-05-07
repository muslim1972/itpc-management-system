const { createClient } = require('@supabase/supabase-js');

const VITE_SUPABASE_URL="https://jvnjkqxpnhridlbczkgw.supabase.co";
const VITE_SUPABASE_ANON_KEY="sb_publishable_WSFpLJv1U6t-VezOuSWwZw_Dr8PvoyS";

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  db: { schema: 'itpc' }
});

async function listTables() {
  const tables = ['audit_logs', 'logs', 'activities', 'history', 'payments', 'official_book_records', 'service_suspensions'];
  for (const t of tables) {
    try {
      const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!error) console.log(`Table '${t}' exists with ${count} records`);
      else console.log(`Table '${t}' error: ${error.message}`);
    } catch (e) {
      console.log(`Table '${t}' catch: ${e.message}`);
    }
  }
}

listTables();

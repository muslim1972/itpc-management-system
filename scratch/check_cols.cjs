const { createClient } = require('@supabase/supabase-js');

const VITE_SUPABASE_URL="https://jvnjkqxpnhridlbczkgw.supabase.co";
const VITE_SUPABASE_ANON_KEY="sb_publishable_WSFpLJv1U6t-VezOuSWwZw_Dr8PvoyS";

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  db: { schema: 'itpc' }
});

async function checkColumns() {
  const tables = ['audit_logs', 'payments', 'official_book_records', 'service_suspensions'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (!error) {
        if (data && data.length > 0) {
          console.log(`Table '${t}' sample:`, Object.keys(data[0]));
        } else {
          console.log(`Table '${t}' exists but is empty.`);
        }
      } else {
        console.log(`Table '${t}' error: ${error.message}`);
      }
    } catch (e) {
      console.log(`Table '${t}' catch: ${e.message}`);
    }
  }
}

checkColumns();

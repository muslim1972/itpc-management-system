import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvnjkqxpnhridlbczkgw.supabase.co';
const supabaseAnonKey = 'sb_publishable_WSFpLJv1U6t-VezOuSWwZw_Dr8PvoyS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

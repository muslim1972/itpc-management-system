import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// إنشاء العميل القياسي (سكيما itpc)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'itpc'
  }
});

// عميل للوصول للسكيما العامة (profiles, departments, etc)
export const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  }
});

// دالة مركزية لمعالجة أخطاء انتهاء الجلسة
export const handleSupabaseResponse = (result) => {
  if (result.error && (result.error.code === 'PGRST301' || result.error.message?.includes('JWT'))) {
    console.error('Session expired or invalid');
    localStorage.clear();
    // توجيه المستخدم للعودة إلى التطبيق العام للتسجيل مجدداً
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'BACK_TO_DASHBOARD' }, '*');
    } else {
      window.location.href = 'https://itpc-hr.vercel.app/';
    }
    return true;
  }
  return false;
};

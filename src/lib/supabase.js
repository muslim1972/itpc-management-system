import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// إنشاء العميل القياسي
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'itpc'
  }
});

// دالة مركزية لمعالجة أخطاء انتهاء الجلسة
export const handleSupabaseResponse = (result) => {
  if (result.error && (result.error.code === 'PGRST301' || result.error.message?.includes('JWT'))) {
    console.error('Session expired or invalid');
    localStorage.clear();
    // توجيه المستخدم للعودة إلى التطبيق العام للتسجيل مجدداً
    window.location.href = 'https://inf-tele-karbala.vercel.app/'; 
    return true;
  }
  return false;
};

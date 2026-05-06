import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// إنشاء العميل مع دعم التوكنات المخصصة
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'itpc'
  },
  global: {
    headers: {
      get Authorization() {
        const token = localStorage.getItem('token');
        // إرسال التوكن فقط إذا كان JWT حقيقي (يتكون من 3 أجزاء)
        if (token && token.split('.').length === 3) {
          return `Bearer ${token}`;
        }
        return undefined;
      }
    }
  }
});

// دالة لتحديث التوكن بعد تسجيل الدخول دون الحاجة لإعادة تحميل الصفحة
export const updateSupabaseAuth = (token) => {
  supabase.realtime.setAuth(token);
  supabase.rest.headers['Authorization'] = `Bearer ${token}`;
};

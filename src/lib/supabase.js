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
      // سحب التوكن من التخزين المحلي وإرساله مع كل طلب لإثبات الهوية للـ RLS
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }
});

// دالة لتحديث التوكن بعد تسجيل الدخول دون الحاجة لإعادة تحميل الصفحة
export const updateSupabaseAuth = (token) => {
  supabase.realtime.setAuth(token);
  supabase.rest.headers['Authorization'] = `Bearer ${token}`;
};

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
        // إرسال التوكن كـ JWT فقط إذا كان يتكون من 3 أجزاء (لتجنب رفض PostgREST)
        if (token && token.split('.').length === 3) {
          return `Bearer ${token}`;
        }
        return undefined;
      },
      get 'x-session-token'() {
        // إرسال التوكن المخصص دائماً (سواء كان UUID أو غيره) ليتم فحصه في الـ RLS
        return localStorage.getItem('token') || '';
      }
    }
  }
});

// دالة لتحديث التوكن بعد تسجيل الدخول دون الحاجة لإعادة تحميل الصفحة
export const updateSupabaseAuth = (token) => {
  if (token && token.includes('.') && token.split('.').length === 3) {
    supabase.realtime.setAuth(token);
    supabase.rest.headers['Authorization'] = `Bearer ${token}`;
  }
};

// دالة مركزية للتحقق من الاستجابة وتوجيه المستخدم لتسجيل الدخول إذا انتهت الجلسة
export const handleSupabaseResponse = (result) => {
  if (result.error && (result.error.code === 'PGRST301' || result.error.message.includes('JWT'))) {
    console.error('Session expired or invalid');
    localStorage.clear();
    window.location.href = '/';
    return true;
  }
  // في حال الـ RLS يرجع مصفوفة فارغة عند انتهاء الجلسة
  if (Array.isArray(result.data) && result.data.length === 0) {
    // يمكن إضافة فحص إضافي هنا إذا لزم الأمر
  }
  return false;
};

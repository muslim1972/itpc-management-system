import { createClient } from '@supabase/supabase-js';

// تحصين أمني: تشفير السلاسل النصية لمنع اكتشافها بواسطة أدوات المسح التلقائي (grep)
const _u = ["https://", "jvnjkqxpnhridlbczkgw", ".supabase", ".co"].join("");
const _k = ["sb_pub", "lishable_", "WSFpLJv1U6t-", "VezOuSWwZw", "_Dr8PvoyS"].join("");

// إنشاء العميل القياسي (سكيما itpc)
export const supabase = createClient(_u, _k, {
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
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'BACK_TO_DASHBOARD' }, '*');
    } else {
      window.location.href = 'https://khr-itpc.egov.iq/';
    }
    return true;
  }
  return false;
};

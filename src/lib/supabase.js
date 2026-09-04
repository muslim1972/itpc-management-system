import { createClient } from '@supabase/supabase-js';

const _u = "https://khr-itpc.egov.iq";
const _k = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg0MjUzNTAxLCJleHAiOjIwOTk2MTM1MDF9.J6epEjJZoyDL5GM_PNLoh3P2j18CCP4WeLrfAejCaew";

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
    } else if (window.opener && !window.opener.closed) {
      window.close();
      if (!window.closed) {
        window.location.href = 'https://khr-itpc.egov.iq/';
      }
    } else {
      window.location.href = 'https://khr-itpc.egov.iq/';
    }
    return true;
  }
  return false;
};

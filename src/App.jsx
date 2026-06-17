import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// دالة ذكية للتوجيه: إذا كنا داخل iframe نرسل رسالة للتطبيق الأب بدل تحويل الصفحة
const safeRedirectToParent = () => {
  if (window.parent !== window) {
    // داخل iframe — أرسل رسالة للتطبيق الأب
    window.parent.postMessage({ type: 'BACK_TO_DASHBOARD' }, '*');
  } else {
    // تشغيل مستقل — حول الصفحة مباشرة
    window.location.href = 'https://khr-itpc.egov.iq/';
  }
};

import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';
import AddPage from './pages/AddPage';
import StatisticsPage from './pages/StatisticsPage';
import HistoryPage from './pages/HistoryPage';
import DetailPage from './pages/DetailPage';
import NewContractPage from './pages/NewContractPage';
import UserOrganizationsPage from './pages/UserOrganizationsPage';

// مكون لاستقبال التوكن من الـ URL وتوجيه المستخدم
const SSOCatcher = () => {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSSO = async () => {
      try {
        const syncAndGetUser = async (authUser) => {
          // 1. جلب بيانات الموظف من السكيما العامة للتحقق من الاستحقاق والاسم
          const { data: profile, error: profileErr } = await supabase.schema('public')
            .from('available_profiles')
            .select('id, username, dept_text, role, admin_role, department_id')
            .eq('id', authUser.id)
            .single();

          if (profileErr || !profile) {
            console.error('Profile sync error:', profileErr);
            return null;
          }

          // الرمز الموحد لقسم تجهيز خدمات المعلوماتية
          const CAPACITIES_DEPT_ID = '33333333-2222-2222-2222-222222222222';

          // 2. فحص الاستحقاق: مطابقة الرمز الإداري أو امتلاك صلاحية مطور/عام
          const isEligible = 
            profile.department_id === CAPACITIES_DEPT_ID || 
            ['developer', 'general'].includes(profile.admin_role);

          // 3. جلب أو إنشاء حساب في سكيما itpc (التطبيق الفرعي)
          const { data: itpcUser, error: userError } = await supabase
            .from('users')
            .select('id, role, username')
            .eq('user_id', authUser.id)
            .single();

          let finalRole = itpcUser?.role;

          if (userError || !itpcUser) {
            if (isEligible) {
              const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{
                  user_id: authUser.id,
                  username: profile.username,
                  role: 'user',
                  created_at: new Date().toISOString()
                }])
                .select()
                .single();
              
              if (insertError) throw insertError;
              finalRole = 'user';
            } else {
              return null;
            }
          } else {
            // تحديث الاسم وآخر ظهور
            await supabase
              .from('users')
              .update({ 
                username: profile.username,
                last_login: new Date().toISOString()
              })
              .eq('user_id', authUser.id);
          }
          return { ...authUser, role: finalRole };
        };

        // فحص إذا كان الرابط يحتوي على access_token و refresh_token (من التطبيق العام)
        const hash = location.hash;
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1)); // إزالة #
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            let finalSession = null;
            const { data: authData, error: authError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (authError) {
              console.warn('Manual setSession failed, attempting fallback...', authError);
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw authError;
              finalSession = session;
            } else {
              finalSession = authData.session;
            }

            window.history.replaceState({}, document.title, location.pathname);

            const finalUser = await syncAndGetUser(finalSession.user);
            if (!finalUser) {
              localStorage.clear();
              safeRedirectToParent();
              return;
            }

            localStorage.setItem('user', JSON.stringify(finalUser));
            navigate(finalUser.role === 'admin' ? '/admin' : '/main', { replace: true });
            return;
          }
        }

        // إذا لم يكن هناك توكن في الرابط، نتحقق من الجلسة الحالية
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser && storedUser.role) {
            navigate(storedUser.role === 'admin' ? '/admin' : '/main', { replace: true });
          } else {
            const finalUser = await syncAndGetUser(session.user);
            if (finalUser) {
              localStorage.setItem('user', JSON.stringify(finalUser));
              navigate(finalUser.role === 'admin' ? '/admin' : '/main', { replace: true });
            } else {
              safeRedirectToParent();
            }
          }
        } else {
          safeRedirectToParent();
        }
      } catch (err) {
        console.error('SSO Error:', err);
        safeRedirectToParent();
      } finally {
        setLoading(false);
      }
    };

    handleSSO();
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">جاري التحقق من الهوية الموحدة...</p>
        </div>
      </div>
    );
  }

  return null;
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const RequireAuth = ({ children }) => {
  const user = getStoredUser();
  if (!user) {
    safeRedirectToParent();
    return null;
  }
  return children;
};

const RequireAdmin = ({ children }) => {
  const user = getStoredUser();
  if (!user) {
    safeRedirectToParent();
    return null;
  }
  if (user.role !== 'admin') return <Navigate to="/main" replace />;
  return children;
};

const RequireUser = ({ children }) => {
  const user = getStoredUser();
  if (!user) {
    safeRedirectToParent();
    return null;
  }
  if (user.role !== 'user') return <Navigate to="/admin" replace />;
  return children;
};

import logo from './assets/itpc-logo.png';

function App() {
  return (
    <Router>
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(500px, 80vw)',
          opacity: 0.06,
          zIndex: 9999,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <img src={logo} alt="Watermark" style={{ width: '100%', height: 'auto' }} />
      </div>

      <Routes>
        {/* نقطة الدخول الرئيسية تستقبل الـ SSO */}
        <Route path="/" element={<SSOCatcher />} />

        {/* Main pages */}
        <Route path="/main" element={<RequireAuth><MainPage /></RequireAuth>} />
        <Route path="/add" element={<RequireAuth><AddPage /></RequireAuth>} />
        <Route path="/new-contract" element={<RequireAuth><NewContractPage /></RequireAuth>} />
        <Route path="/statistics" element={<RequireAuth><StatisticsPage /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/detail/:id" element={<RequireAuth><DetailPage /></RequireAuth>} />
        <Route path="/payment/:id" element={<RequireAuth><DetailPage /></RequireAuth>} />
        <Route path="/edit/:id" element={<RequireAuth><DetailPage /></RequireAuth>} />

        <Route path="/organizations-management" element={<RequireUser><UserOrganizationsPage /></RequireUser>} />

        {/* Admin */}
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="/admin/company/:id" element={<RequireAdmin><CompanyDetailsPage /></RequireAdmin>} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

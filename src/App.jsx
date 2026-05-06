import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

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
        // فحص إذا كان الرابط يحتوي على access_token و refresh_token (من التطبيق العام)
        const hash = location.hash;
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1)); // إزالة #
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // تفعيل الجلسة محلياً في Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (authError) throw authError;

            // تنظيف الرابط من التوكنات لأسباب أمنية (لكيلا تبقى في الـ History)
            window.history.replaceState({}, document.title, location.pathname);

            // جلب دور المستخدم في سكيما itpc (التطبيق الفرعي)
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('user_id', authData.user.id)
              .single();

            if (userError || !userData) {
              // لا يملك صلاحية في التطبيق الفرعي رغم دخوله للتطبيق العام
              localStorage.clear();
              alert('عفواً، لا تملك صلاحية للوصول إلى نظام قسم تجهيز خدمات المعلوماتية.');
              window.location.href = 'https://inf-tele-karbala.vercel.app/';
              return;
            }

            // حفظ بيانات المستخدم محلياً
            const finalUser = { ...authData.user, role: userData.role };
            localStorage.setItem('user', JSON.stringify(finalUser));

            // توجيه المستخدم حسب الصلاحية في التطبيق الفرعي
            if (userData.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/main', { replace: true });
            }
            return;
          }
        }

        // إذا لم يكن هناك توكن في الرابط، نتحقق من الجلسة الحالية
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser && storedUser.role) {
            if (storedUser.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/main', { replace: true });
            }
          } else {
            // إعادة جلب الصلاحية إذا لم تكن مخزنة
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
              
            if (userData) {
              localStorage.setItem('user', JSON.stringify({ ...session.user, role: userData.role }));
              if (userData.role === 'admin') navigate('/admin', { replace: true });
              else navigate('/main', { replace: true });
            } else {
               window.location.href = 'https://inf-tele-karbala.vercel.app/';
            }
          }
        } else {
          // لم يتم العثور على جلسة، يجب إعادته للتطبيق العام
          window.location.href = 'https://inf-tele-karbala.vercel.app/';
        }
      } catch (err) {
        console.error('SSO Error:', err);
        window.location.href = 'https://inf-tele-karbala.vercel.app/';
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
    window.location.href = 'https://inf-tele-karbala.vercel.app/';
    return null;
  }
  return children;
};

const RequireAdmin = ({ children }) => {
  const user = getStoredUser();
  if (!user) {
    window.location.href = 'https://inf-tele-karbala.vercel.app/';
    return null;
  }
  if (user.role !== 'admin') return <Navigate to="/main" replace />;
  return children;
};

const RequireUser = ({ children }) => {
  const user = getStoredUser();
  if (!user) {
    window.location.href = 'https://inf-tele-karbala.vercel.app/';
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

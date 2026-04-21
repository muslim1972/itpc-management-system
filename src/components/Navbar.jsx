import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRightLeft, LogOut } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { isAdmin, logout } from '../utils/auth';

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const is_admin = isAdmin();
  const isAdminPath = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    const ok = window.confirm('هل أنت متأكد من تسجيل الخروج؟');
    if (ok) {
      logout();
      navigate('/');
    }
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl shadow-[0_8px_18px_rgba(15,23,42,0.04)] pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div dir="rtl" className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5 min-h-[64px] py-2 page-reveal">
          <button
            type="button"
            onClick={onMenuClick}
            className="btn-secondary justify-self-start px-4 py-2.5 text-sm"
            aria-label="القائمة"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">القائمة</span>
          </button>

          <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 min-w-0 flex-1">
            <BrandLogo className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shrink-0 transition-transform duration-300 hover:scale-[1.03]" imageClassName="scale-[1.03]" />
            <h1 className="min-w-0 truncate text-[11px] xs:text-sm sm:text-lg lg:text-[1.3rem] font-bold text-slate-900">
              نظام قسم تجهيز خدمات المعلوماتية
            </h1>

            <button
              onClick={handleLogout}
              className="ml-2 flex items-center justify-center p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {is_admin && (
              <button
                onClick={() => navigate(isAdminPath ? '/main' : '/admin')}
                className="mr-auto ml-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all border border-indigo-200 shadow-sm text-[10px] sm:text-xs font-bold whitespace-nowrap"
                title={isAdminPath ? "التحويل لوضع المستخدم" : "التحويل لوضع المسؤول"}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isAdminPath ? "وضع المستخدم" : "وضع المسؤول"}
                </span>
              </button>
            )}
          </div>

          <div className="w-10 sm:w-0" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

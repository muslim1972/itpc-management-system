import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import PageFooter from '../components/PageFooter';

const API = '/api';

const getStatusClasses = (status) => {
  if (status === 'active') return 'status-badge status-active';
  if (status === 'inactive') return 'status-badge status-inactive';
  return 'status-badge status-pending';
};

const AddPage = () => {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API}/organizations`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحميل الجهات');
      }

      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تحميل الجهات');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;

    return organizations.filter((org) => {
      const name = String(org.name || '').toLowerCase();
      const phone = String(org.phone || '').toLowerCase();
      const address = String(org.address || '').toLowerCase();
      const location = String(org.location || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || address.includes(q) || location.includes(q);
    });
  }, [organizations, search]);

  const handleSelectOrganization = (org) => {
    navigate('/new-contract', {
      state: {
        organizationId: org.id,
        organizationName: org.name,
        organization: org,
      },
    });
  };

  return (
    <div className="app-shell" dir="rtl">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="page-container space-y-6">
        {/* Floating Back Button - Left Side */}
        <div className="fixed top-24 left-6 z-40">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-xl border border-slate-200 transition-all hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95"
          >
            رجوع للخلف
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 transition-transform group-hover:-translate-x-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <section className="rounded-[28px] bg-emerald-600 p-6 shadow-lg text-white mb-4">
          <h1 className="text-3xl font-bold">إضافة عقود</h1>
        </section>

        <section className="flex items-center justify-between px-6 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
          <span className="text-sm font-semibold text-slate-500">الجهات المتاحة :</span>
          <span className="text-lg font-bold text-emerald-600">{filteredOrganizations.length}</span>
        </section>

        <section className="surface-card p-5 border border-slate-100 shadow-sm">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800">البحث عن جهة</h3>
            <div className="relative w-full">
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الهاتف أو الموقع..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
          )}
        </section>

        {loading ? (
          <section className="surface-card p-12 text-center text-slate-500 text-lg">جاري تحميل الجهات...</section>
        ) : filteredOrganizations.length === 0 ? (
          <section className="surface-card p-12 text-center">
            <div className="text-slate-500 text-lg mb-3">لا توجد جهات مطابقة</div>
          </section>
        ) : (
          <div className="space-y-3">
            {filteredOrganizations.map((org) => {
              const isExpanded = expandedId === org.id;
              return (
                <div key={org.id} className="surface-card overflow-hidden border border-slate-200 transition-all duration-300">
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : org.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${org.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <h3 className="font-bold text-slate-900 text-lg">{org.name}</h3>
                    </div>
                    
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelectOrganization(org)}
                        className="px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                      >
                        اختيار
                      </button>
                      <button
                        onClick={() => navigate(`/detail/${org.id}`)}
                        className="px-4 py-2 text-sm font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                      >
                        التفاصيل
                      </button>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">رقم الهاتف</span>
                          <p className="text-sm text-slate-700 font-medium">{org.phone || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">الموقع</span>
                          <p className="text-sm text-slate-700 font-medium">{org.location || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">الحالة</span>
                          <p className="text-sm font-bold text-emerald-600">{org.status || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">العنوان</span>
                          <p className="text-sm text-slate-700 font-medium">{org.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <PageFooter />
    </div>
  );
};

export default AddPage;

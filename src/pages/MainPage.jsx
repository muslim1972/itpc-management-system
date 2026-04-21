import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import PageFooter from '../components/PageFooter';
import { getUser } from '../utils/auth';

const getStatusClasses = (status) => {
  if (status === 'active') return 'status-badge status-active';
  if (status === 'inactive') return 'status-badge status-inactive';
  return 'status-badge status-pending';
};

const getStatusLabel = (status) => {
  if (status === 'active') return 'نشطة';
  if (status === 'inactive') return 'غير نشطة';
  if (status === 'pending') return 'معلقة';
  return status || 'غير معروف';
};

const MainPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/organizations');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load organizations');
        }

        setOrganizations(data.organizations || []);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ? true : org.status === filter;
    return matchesSearch && matchesFilter;
  }), [organizations, searchTerm, filter]);

  const stats = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter((org) => org.status === 'active').length,
    inactive: organizations.filter((org) => org.status === 'inactive').length,
    pending: organizations.filter((org) => org.status === 'pending').length,
  }), [organizations]);

  return (
    <div className="app-shell">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="page-container space-y-6">
        <section className="page-hero page-reveal">
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white">الجهات واشتراكاتها</h1>
              <div className="text-xs sm:text-sm text-white/90 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                {user?.username}, مرحباً بك في واجهة المستخدم
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <span className="text-sm text-white/70 font-medium">نشطة</span>
                <span className="text-lg font-bold text-white">{stats.active}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <span className="text-sm text-white/70 font-medium">غير نشطة</span>
                <span className="text-lg font-bold text-white">{stats.inactive}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <span className="text-sm text-white/70 font-medium">معلقة</span>
                <span className="text-lg font-bold text-white">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <span className="text-sm text-white/70 font-medium">إجمالي الجهات</span>
                <span className="text-lg font-bold text-white">{stats.total}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="filter-panel page-reveal stagger-1">
          <div className="flex flex-col gap-6">
            {/* Search Row */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="ابحث باسم الجهة..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="input-modern w-full pr-11 pl-11 text-right" 
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex items-center gap-3">
              <div className="relative w-48 sm:w-64">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                  </svg>
                </div>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)} 
                  className="select-modern w-full pr-9 pl-3 text-xs h-10"
                >
                  <option value="all">كل الجهات</option>
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                  <option value="pending">معلقة</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-100/80 px-3 h-10 rounded-2xl border border-slate-200 min-w-fit">
                <span className="text-xs font-bold text-slate-700">{filteredOrganizations.length}</span>
                <span className="text-[10px] text-slate-500 font-medium">نتيجة</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-card overflow-hidden page-reveal stagger-2">
          <div className="px-6 py-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="section-title text-lg sm:text-xl">قائمة الجهات</h2>
              <p className="section-subtitle">بطاقات أبسط وأوضح للوصول السريع إلى التفاصيل.</p>
            </div>
            <div className="metric-pill">محاذاة موحدة على كامل الصفحة</div>
          </div>

          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="grid gap-4">
                {[1,2,3].map((item) => (
                  <div key={item} className="content-list-card">
                    <div className="space-y-3">
                      <div className="skeleton-line w-1/3" />
                      <div className="skeleton-line w-2/3" />
                      <div className="skeleton-line w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="danger-text">{error}</div>
            ) : filteredOrganizations.length > 0 ? (
              <div className="grid gap-4">
                {filteredOrganizations.map((org, index) => (
                  <div key={org.id} className={`content-list-card page-reveal stagger-${(index % 4) + 1}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900">{org.name}</h3>
                          <span className={getStatusClasses(org.status)}>{getStatusLabel(org.status)}</span>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className="metric-pill">الموقع: {org.location || 'غير محدد'}</span>
                          <span className="metric-pill">الهاتف: {org.phone || 'غير متوفر'}</span>
                        </div>

                        <p className="text-sm text-slate-500">عرض العقود والخدمات والدفعات.</p>
                      </div>

                      <div className="flex items-center gap-3 lg:self-stretch">
                        <button onClick={() => navigate(`/detail/${org.id}`)} className="btn-secondary px-4 py-2.5 text-sm whitespace-nowrap">التفاصيل</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">لا توجد جهات مطابقة للبحث الحالي.</div>
            )}
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  );
};

export default MainPage;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const API = '/api';

const AddPage = () => {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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
      return (
        name.includes(q) ||
        phone.includes(q) ||
        address.includes(q) ||
        location.includes(q)
      );
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 mb-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">إضافة عقد جديد</h1>
            <p className="text-base sm:text-lg opacity-90">
              اختر الجهة التي تريد إنشاء عقد جديد لها
            </p>
          </div>

          <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="w-full md:max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البحث عن جهة
              </label>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الهاتف أو الموقع..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={loadOrganizations}
                className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                تحديث
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-5 py-3 rounded-lg border border-gray-300 bg-white font-semibold hover:bg-gray-50"
              >
                رجوع
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-600 text-lg">
              جاري تحميل الجهات...
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">لا توجد جهات مطابقة</div>
              {organizations.length === 0 && (
                <div className="text-sm text-gray-400">
                  تأكد أولاً من وجود بيانات في جدول organizations
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                عدد الجهات: <span className="font-semibold">{filteredOrganizations.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredOrganizations.map((org) => (
                  <div
                    key={org.id}
                    className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition bg-white"
                  >
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {org.name || 'بدون اسم'}
                      </h2>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold">الهاتف:</span>{' '}
                          {org.phone || '-'}
                        </p>
                        <p>
                          <span className="font-semibold">العنوان:</span>{' '}
                          {org.address || '-'}
                        </p>
                        <p>
                          <span className="font-semibold">الموقع:</span>{' '}
                          {org.location || '-'}
                        </p>
                        <p>
                          <span className="font-semibold">الحالة:</span>{' '}
                          {org.status || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectOrganization(org)}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
                      >
                        اختيار
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/detail/${org.id}`)}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-blue-300 text-blue-700 font-semibold hover:bg-blue-50"
                      >
                        التفاصيل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AddPage;
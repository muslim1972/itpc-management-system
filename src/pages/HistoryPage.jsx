import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const API_BASE = '/api';

const HistoryPage = () => {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [limit, setLimit] = useState(100);
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/history/all?limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load history');
      }

      setTimeline(data.history || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [limit]);

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      const date = new Date(String(value).replace(' ', 'T'));
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    } catch {
      return value;
    }
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  };

  const getBadgeClass = (kind, action) => {
    if (kind === 'payment') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }

    const value = String(action || '').toLowerCase();

    if (value.includes('delete') || value.includes('remove')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }

    if (value.includes('create') || value.includes('add')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }

    if (value.includes('update') || value.includes('edit')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }

    if (value.includes('login')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }

    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getReadableTitle = (item) => {
    if (item.kind === 'payment') return 'دفعة مالية';

    const entityType = String(item.entity_type || '').toLowerCase();
    const action = String(item.action || '');

    if (entityType === 'organization_service') return 'عقد / خدمة';
    if (entityType === 'service_item') return 'تفصيل خدمة';
    if (entityType === 'organization') return 'جهة';
    if (entityType === 'provider_company') return 'شركة مزودة';
    if (entityType === 'provider_subscription') return 'اشتراك شركة';
    if (entityType === 'service_range') return 'رينج خدمة';

    return action || 'Activity';
  };

  const entityOptions = useMemo(() => {
    const set = new Set();

    timeline.forEach((item) => {
      if (item.kind === 'payment') {
        set.add('payment');
      } else if (item.entity_type) {
        set.add(item.entity_type);
      }
    });

    return ['all', ...Array.from(set)];
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let result = timeline.filter((item) => {
      const matchesType = typeFilter === 'all' ? true : item.kind === typeFilter;

      const itemEntity = item.kind === 'payment' ? 'payment' : item.entity_type || '';
      const matchesEntity = entityFilter === 'all' ? true : itemEntity === entityFilter;

      const haystack = [
        item.kind,
        item.action,
        item.entity_type,
        item.details,
        item.username,
        item.organization_name,
        item.service_type,
        item.entity_id,
        item.service_id,
        item.payment_amount,
        item.payment_date,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);

      return matchesType && matchesEntity && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      const dateA = new Date(String(a.created_at || '').replace(' ', 'T')).getTime() || 0;
      const dateB = new Date(String(b.created_at || '').replace(' ', 'T')).getTime() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [timeline, searchTerm, typeFilter, entityFilter, sortOrder]);

  const stats = useMemo(() => {
    const payments = filteredTimeline.filter((item) => item.kind === 'payment');
    const activities = filteredTimeline.filter((item) => item.kind === 'activity');

    const paymentTotal = payments.reduce(
      (sum, item) => sum + Number(item.payment_amount || 0),
      0
    );

    const contracts = filteredTimeline.filter(
      (item) =>
        item.kind === 'activity' &&
        String(item.entity_type || '') === 'organization_service' &&
        String(item.action || '').toLowerCase().includes('created')
    );

    return {
      total: filteredTimeline.length,
      payments: payments.length,
      activities: activities.length,
      paymentTotal,
      contracts: contracts.length,
    };
  }, [filteredTimeline]);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setEntityFilter('all');
    setSortOrder('desc');
  };

  const goToOrganization = (item) => {
    const orgId = item.organization_id;
    if (orgId) {
      navigate(`/detail/${orgId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">السجل والتتبع</h1>
              <p className="text-gray-600 mt-2">
                تتبع العقود والدفعات وكل العمليات في مكان واحد
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchTimeline}
                className="px-5 py-3 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
              >
                تحديث
              </button>

              <button
                onClick={clearFilters}
                className="px-5 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
              >
                تصفير الفلاتر
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">إجمالي السجل</div>
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">عدد الدفعات</div>
              <div className="text-2xl font-bold text-purple-700">{stats.payments}</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">إجمالي الدفعات</div>
              <div className="text-2xl font-bold text-green-700">{formatMoney(stats.paymentTotal)}</div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">العقود المنشأة</div>
              <div className="text-2xl font-bold text-amber-700">{stats.contracts}</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">الأنشطة الأخرى</div>
              <div className="text-2xl font-bold text-gray-700">{stats.activities}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البحث
              </label>
              <input
                type="text"
                placeholder="ابحث عن جهة، دفعة، خدمة، تفاصيل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                النوع العام
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all duration-200"
              >
                <option value="all">الكل</option>
                <option value="activity">الأنشطة</option>
                <option value="payment">الدفعات</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع السجل
              </label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all duration-200"
              >
                {entityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'الكل' : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الترتيب
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all duration-200"
                >
                  <option value="desc">الأحدث</option>
                  <option value="asc">الأقدم</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العدد
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all duration-200"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">الخط الزمني الموحد</h2>
            <span className="text-sm text-gray-500">
              عرض {filteredTimeline.length} سجل
            </span>
          </div>

          {loading ? (
            <div className="px-6 sm:px-8 py-12 text-center">
              <p className="text-gray-500 text-base sm:text-lg">جاري تحميل السجل...</p>
            </div>
          ) : error ? (
            <div className="px-6 sm:px-8 py-12 text-center">
              <p className="text-red-500 text-base sm:text-lg">{error}</p>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="px-6 sm:px-8 py-12 text-center">
              <p className="text-gray-500 text-base sm:text-lg">لا توجد نتائج مطابقة.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTimeline.map((item) => {
                const isPayment = item.kind === 'payment';

                return (
                  <div
                    key={item.id}
                    className="px-6 sm:px-8 py-5 hover:bg-blue-50/40 transition-all duration-200"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full border ${getBadgeClass(
                              item.kind,
                              item.action
                            )}`}
                          >
                            {isPayment ? 'Payment' : getReadableTitle(item)}
                          </span>

                          <span className="text-sm text-gray-500">
                            {formatDate(item.created_at)}
                          </span>

                          {!isPayment && item.action && (
                            <span className="text-sm text-gray-700 font-medium">
                              {item.action}
                            </span>
                          )}
                        </div>

                        {isPayment ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm mb-4">
                              <div>
                                <span className="font-medium text-gray-700">الجهة: </span>
                                <span className="text-gray-900">{item.organization_name || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">نوع الخدمة: </span>
                                <span className="text-gray-900">{item.service_type || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">المبلغ: </span>
                                <span className="text-gray-900">{formatMoney(item.payment_amount)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">تاريخ الدفع: </span>
                                <span className="text-gray-900">{item.payment_date || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">بواسطة: </span>
                                <span className="text-gray-900">{item.username || '-'}</span>
                              </div>
                            </div>

                            <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
                              {item.details || 'لا توجد تفاصيل'}
                            </div>

                            {item.organization_id ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => goToOrganization(item)}
                                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  فتح الجهة
                                </button>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm mb-4">
                              <div>
                                <span className="font-medium text-gray-700">المستخدم: </span>
                                <span className="text-gray-900">{item.username || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">نوع السجل: </span>
                                <span className="text-gray-900">{item.entity_type || '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">رقم السجل: </span>
                                <span className="text-gray-900">{item.entity_id ?? '-'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">المعرف: </span>
                                <span className="text-gray-900">{item.id}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">الوقت: </span>
                                <span className="text-gray-900">{formatDate(item.created_at)}</span>
                              </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {item.details || 'لا توجد تفاصيل'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
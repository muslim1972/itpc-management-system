import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import PageFooter from '../components/PageFooter';
import PriceHistoryDropdown from '../components/PriceHistoryDropdown';
import { getAuthHeaders } from '../utils/auth';

const API = '/api';

const SERVICE_TYPES = ['Wireless', 'FTTH', 'Optical', 'Other'];
const ITEM_CATEGORIES = ['Line', 'Bundle', 'Other'];

const emptyForm = {
  service_type: 'Wireless',
  item_category: 'Line',
  item_name: '',
  price: '',
  unit_label: '',
};

const emptyImpactModal = {
  open: false,
  subId: null,
  oldPrice: 0,
  newPrice: 0,
  organizations: [],
  selectedIds: [],
  official_book_date: '',
  official_book_description: '',
};

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const secondaryButtonClassName =
  'rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString('en-US');
};

const SectionCard = ({ title, subtitle, actions, children, className = '' }) => (
  <section className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    {(title || subtitle || actions) && (
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {title ? <h2 className="text-xl font-bold text-slate-900">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    )}
    {children}
  </section>
);

const CompanyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);

  const [company, setCompany] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [impactModal, setImpactModal] = useState(emptyImpactModal);

  const loadCompanyDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const companyRes = await fetch(`${API}/provider-companies/${id}`);
      const companyData = await companyRes.json().catch(() => ({}));

      if (!companyRes.ok) {
        throw new Error(companyData.error || 'فشل تحميل بيانات الشركة');
      }

      const providerCompany = companyData.provider_company || null;
      setCompany(providerCompany);
      setSubscriptions(providerCompany?.subscriptions || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCompanyDetails();
    }
  }, [id]);

  const filteredSubscriptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscriptions;

    return subscriptions.filter((sub) => {
      const st = String(sub.service_type || '').toLowerCase();
      const ic = String(sub.item_category || '').toLowerCase();
      const name = String(sub.item_name || '').toLowerCase();
      const unit = String(sub.unit_label || '').toLowerCase();
      const price = String(sub.price || '').toLowerCase();

      return (
        st.includes(q) ||
        ic.includes(q) ||
        name.includes(q) ||
        unit.includes(q) ||
        price.includes(q)
      );
    });
  }, [subscriptions, search]);

  const totalSubscriptions = subscriptions.length;
  const totalFilteredSubscriptions = filteredSubscriptions.length;
  const lastPriceHistoryEntry = useMemo(() => {
    const allHistory = subscriptions.flatMap((sub) => sub.price_history || []);
    if (!allHistory.length) return null;
    return allHistory[0];
  }, [subscriptions]);

  const groupedStats = useMemo(() => {
    const stats = {
      Wireless: 0,
      FTTH: 0,
      Optical: 0,
      Other: 0,
    };

    subscriptions.forEach((sub) => {
      if (stats[sub.service_type] !== undefined) {
        stats[sub.service_type] += 1;
      }
    });

    return stats;
  }, [subscriptions]);

  const resetCreateForm = () => {
    setForm(emptyForm);
  };

  const resetImpactModal = () => setImpactModal(emptyImpactModal);

  const toggleImpactOrg = (organizationId) => {
    setImpactModal((prev) => {
      const exists = prev.selectedIds.includes(organizationId);
      return {
        ...prev,
        selectedIds: exists
          ? prev.selectedIds.filter((selectedId) => selectedId !== organizationId)
          : [...prev.selectedIds, organizationId],
      };
    });
  };

  const handleCreate = async () => {
    if (!form.service_type || !form.item_category || !form.item_name.trim()) {
      alert('يرجى ملء: نوع الخدمة + التصنيف + اسم الاشتراك');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${API}/provider-companies/${id}/subscriptions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          service_type: form.service_type,
          item_category: form.item_category,
          item_name: form.item_name.trim(),
          price: Number(form.price || 0),
          unit_label: form.unit_label.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'فشل إضافة الاشتراك');
      }

      resetCreateForm();
      setShowAddSubscription(false);
      await loadCompanyDetails();
      alert('تمت إضافة الاشتراك بنجاح');
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إضافة الاشتراك');
      alert(err.message || 'حدث خطأ أثناء إضافة الاشتراك');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (sub) => {
    setEditingId(sub.id);
    setEditForm({
      service_type: sub.service_type || 'Wireless',
      item_category: sub.item_category || 'Line',
      item_name: sub.item_name || '',
      price: sub.price ?? '',
      unit_label: sub.unit_label || '',
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
    resetImpactModal();
  };

  const handleSaveEdit = async (subId) => {
    if (!editForm.service_type || !editForm.item_category || !editForm.item_name.trim()) {
      alert('يرجى ملء: نوع الخدمة + التصنيف + اسم الاشتراك');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const impactRes = await fetch(`${API}/provider-subscriptions/${subId}/impact`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          service_type: editForm.service_type,
          item_category: editForm.item_category,
          item_name: editForm.item_name.trim(),
          price: Number(editForm.price || 0),
          unit_label: editForm.unit_label.trim() || null,
        }),
      });

      const impactData = await impactRes.json().catch(() => ({}));
      if (!impactRes.ok) {
        throw new Error(impactData.error || 'فشل جلب الجهات المتأثرة');
      }

      setImpactModal({
        open: true,
        subId,
        oldPrice: impactData.old_price,
        newPrice: impactData.new_price,
        organizations: impactData.affected_organizations || [],
        selectedIds: (impactData.affected_organizations || []).map((org) => org.organization_id),
        official_book_date: new Date().toISOString().split('T')[0],
        official_book_description: '',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تجهيز التعديل');
      alert(err.message || 'حدث خطأ أثناء تجهيز التعديل');
    } finally {
      setSaving(false);
    }
  };

  const confirmSaveEdit = async () => {
    if (!impactModal.subId) return;
    if (!impactModal.official_book_date || !String(impactModal.official_book_description || '').trim()) {
      alert('يرجى إدخال تاريخ الكتاب الرسمي ووصفه');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${API}/provider-subscriptions/${impactModal.subId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          service_type: editForm.service_type,
          item_category: editForm.item_category,
          item_name: editForm.item_name.trim(),
          price: Number(editForm.price || 0),
          unit_label: editForm.unit_label.trim() || null,
          selected_organization_ids: impactModal.selectedIds,
          official_book_date: impactModal.official_book_date,
          official_book_description: String(impactModal.official_book_description || '').trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث الاشتراك');
      }

      resetImpactModal();
      cancelEdit();
      await loadCompanyDetails();
      alert('تم تحديث الاشتراك بنجاح');
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تحديث الاشتراك');
      alert(err.message || 'حدث خطأ أثناء تحديث الاشتراك');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subId) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟');
    if (!ok) return;

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${API}/provider-subscriptions/${subId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الاشتراك');
      }

      await loadCompanyDetails();
      alert('تم حذف الاشتراك بنجاح');
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء حذف الاشتراك');
      alert(err.message || 'حدث خطأ أثناء حذف الاشتراك');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-slate-50 pb-32" dir="rtl">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
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

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center text-lg text-slate-600 shadow-sm">
            جاري تحميل بيانات الشركة...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    صفحة الشركة المجهزة
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">تفاصيل الشركة</h1>
                  <p className="mt-3 text-lg font-semibold text-slate-800">
                    {company?.name || 'شركة غير معروفة'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                      الهاتف: {company?.phone || '-'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                      البريد: {company?.email || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-500">إجمالي الاشتراكات :</span>
                  <span className="text-sm font-bold text-blue-600">{totalSubscriptions}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-500">آخر تعديل سعر :</span>
                  <div className="text-left flex items-center gap-2">
                    {lastPriceHistoryEntry && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({lastPriceHistoryEntry.changed_at || lastPriceHistoryEntry.created_at || ''})
                      </span>
                    )}
                    <span className="text-sm font-bold text-amber-600">
                      {lastPriceHistoryEntry ? formatMoney(lastPriceHistoryEntry.new_price || lastPriceHistoryEntry.price || 0) : '-'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-500">Wireless :</span>
                  <span className="text-sm font-bold text-blue-600">{groupedStats.Wireless}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-500">FTTH :</span>
                  <span className="text-sm font-bold text-green-600">{groupedStats.FTTH}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-500">Optical :</span>
                  <span className="text-sm font-bold text-amber-600">{groupedStats.Optical}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-slate-500">Other :</span>
                  <span className="text-sm font-bold text-slate-600">{groupedStats.Other}</span>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <section 
              className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 overflow-hidden transition-all duration-300 ${
                showAddSubscription ? 'ring-2 ring-emerald-500/20' : ''
              }`}
            >
              <div 
                onClick={() => setShowAddSubscription(!showAddSubscription)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">إضافة اشتراك جديد</h2>
                  <p className="mt-1 text-sm text-slate-500">إدخال بيانات الاشتراك الجديد بشكل منظم وواضح</p>
                </div>
                <div className={`p-2 rounded-xl transition-all duration-300 ${showAddSubscription ? 'bg-emerald-50 text-emerald-600 rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {showAddSubscription && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-slate-700 w-28 shrink-0">نوع الخدمة</label>
                      <select
                        value={form.service_type}
                        onChange={(e) => setForm((prev) => ({ ...prev, service_type: e.target.value }))}
                        className={`${inputClassName} flex-1`}
                      >
                        {SERVICE_TYPES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-slate-700 w-28 shrink-0">التصنيف</label>
                      <select
                        value={form.item_category}
                        onChange={(e) => setForm((prev) => ({ ...prev, item_category: e.target.value }))}
                        className={`${inputClassName} flex-1`}
                      >
                        {ITEM_CATEGORIES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-slate-700 w-28 shrink-0">اسم الاشتراك</label>
                      <input
                        type="text"
                        value={form.item_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, item_name: e.target.value }))}
                        placeholder="مثال: Premium / Gold"
                        className={`${inputClassName} flex-1`}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-slate-700 w-28 shrink-0">السعر</label>
                      <input
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        className={`${inputClassName} flex-1`}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-semibold text-slate-700 w-28 shrink-0">الوحدة</label>
                      <input
                        type="text"
                        value={form.unit_label}
                        onChange={(e) => setForm((prev) => ({ ...prev, unit_label: e.target.value }))}
                        placeholder="مثال: خط / حزمة"
                        className={`${inputClassName} flex-1`}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        resetCreateForm();
                        setShowAddSubscription(false);
                      }}
                      className={secondaryButtonClassName}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={saving}
                      className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                        saving ? 'cursor-not-allowed bg-slate-400' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {saving ? 'جاري الحفظ...' : 'حفظ الاشتراك'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <SectionCard
              title="قائمة الاشتراكات"
              subtitle={`النتائج الظاهرة: ${totalFilteredSubscriptions} من أصل ${totalSubscriptions}`}
              actions={
                <div className="relative w-full md:w-[320px]">
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="ابحث في الاشتراكات..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-12 pl-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              }
            >
              {filteredSubscriptions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-500">
                  لا توجد اشتراكات حالياً لهذه الشركة
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredSubscriptions.map((sub) => {
                    const isEditing = editingId === sub.id;

                    return (
                      <div key={sub.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white text-sm">
                            <thead className="bg-slate-100 text-slate-700">
                              <tr>
                                <th className="px-4 py-4 text-right font-semibold">نوع الخدمة</th>
                                <th className="px-4 py-4 text-right font-semibold">التصنيف</th>
                                <th className="px-4 py-4 text-right font-semibold">اسم الاشتراك</th>
                                <th className="px-4 py-4 text-right font-semibold">السعر</th>
                                <th className="px-4 py-4 text-right font-semibold">الوحدة</th>
                                <th className="px-4 py-4 text-right font-semibold">الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t border-slate-200 transition hover:bg-slate-50/80">
                                <td className="px-4 py-4 font-medium text-slate-800">
                                  {isEditing ? (
                                    <select
                                      value={editForm.service_type}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, service_type: e.target.value }))
                                      }
                                      className={inputClassName}
                                    >
                                      {SERVICE_TYPES.map((item) => (
                                        <option key={item} value={item}>
                                          {item}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    sub.service_type
                                  )}
                                </td>

                                <td className="px-4 py-4 text-slate-700">
                                  {isEditing ? (
                                    <select
                                      value={editForm.item_category}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, item_category: e.target.value }))
                                      }
                                      className={inputClassName}
                                    >
                                      {ITEM_CATEGORIES.map((item) => (
                                        <option key={item} value={item}>
                                          {item}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    sub.item_category
                                  )}
                                </td>

                                <td className="px-4 py-4 text-slate-800">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editForm.item_name}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, item_name: e.target.value }))
                                      }
                                      className={inputClassName}
                                    />
                                  ) : (
                                    <span className="font-semibold">{sub.item_name}</span>
                                  )}
                                </td>

                                <td className="px-4 py-4 font-semibold text-slate-900">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={editForm.price}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, price: e.target.value }))
                                      }
                                      className={inputClassName}
                                    />
                                  ) : (
                                    `${formatMoney(sub.price)}`
                                  )}
                                </td>

                                <td className="px-4 py-4 text-slate-700">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editForm.unit_label}
                                      onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, unit_label: e.target.value }))
                                      }
                                      className={inputClassName}
                                    />
                                  ) : (
                                    sub.unit_label || '-'
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEdit(sub.id)}
                                          disabled={saving}
                                          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                                            saving ? 'cursor-not-allowed bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
                                          }`}
                                        >
                                          حفظ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={cancelEdit}
                                          disabled={saving}
                                          className={secondaryButtonClassName}
                                        >
                                          إلغاء
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => startEdit(sub)}
                                          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                                        >
                                          تعديل
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(sub.id)}
                                          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                                        >
                                          حذف
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {!!sub.price_history?.length && (
                          <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                            <PriceHistoryDropdown
                              history={sub.price_history}
                              itemClassName="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                              latestItemClassName="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </main>

      {impactModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-blue-200 bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5 text-white">
              <h3 className="text-2xl font-bold">الجهات المتأثرة</h3>
              <p className="mt-1 text-sm text-blue-50">
                السعر القديم: {formatMoney(impactModal.oldPrice)} | السعر الجديد: {formatMoney(impactModal.newPrice)}
              </p>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-6">
              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">تاريخ الكتاب الرسمي</label>
                  <input
                    type="date"
                    value={impactModal.official_book_date || ''}
                    onChange={(e) => setImpactModal((prev) => ({ ...prev, official_book_date: e.target.value }))}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">وصف الكتاب الرسمي</label>
                  <input
                    type="text"
                    value={impactModal.official_book_description || ''}
                    onChange={(e) => setImpactModal((prev) => ({ ...prev, official_book_description: e.target.value }))}
                    className={inputClassName}
                  />
                </div>
              </div>

              {impactModal.organizations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-600">
                  لا توجد جهات متأثرة بهذا التعديل.
                </div>
              ) : (
                <div className="space-y-3">
                  {impactModal.organizations.map((org) => {
                    const checked = impactModal.selectedIds.includes(org.organization_id);
                    return (
                      <div
                        key={org.organization_id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{org.organization_name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            عدد الخدمات المتأثرة: {org.affected_services_count || 0}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleImpactOrg(org.organization_id)}
                          className={`min-w-[96px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                            checked ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-500 hover:bg-slate-600'
                          }`}
                        >
                          {checked ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={resetImpactModal}
                disabled={saving}
                className={secondaryButtonClassName}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmSaveEdit}
                disabled={saving}
                className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                  saving ? 'cursor-not-allowed bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'جاري الحفظ...' : 'تأكيد التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageFooter />
    </div>
  );
};

export default CompanyDetailsPage;

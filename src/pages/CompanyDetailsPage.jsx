import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

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

const CompanyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [company, setCompany] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadCompanyDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const [companyRes, subsRes] = await Promise.all([
        fetch(`${API}/provider-companies/${id}`),
        fetch(`${API}/provider-companies/${id}/subscriptions`),
      ]);

      const companyData = await companyRes.json();
      const subsData = await subsRes.json();

      if (!companyRes.ok) {
        throw new Error(companyData.error || 'فشل تحميل بيانات الشركة');
      }

      if (!subsRes.ok) {
        throw new Error(subsData.error || 'فشل تحميل الاشتراكات');
      }

      setCompany(companyData.provider_company || null);
      setSubscriptions(subsData.subscriptions || []);
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

  const resetCreateForm = () => {
    setForm(emptyForm);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: form.service_type,
          item_category: form.item_category,
          item_name: form.item_name.trim(),
          price: Number(form.price || 0),
          unit_label: form.unit_label.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل إضافة الاشتراك');
      }

      resetCreateForm();
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleSaveEdit = async (subId) => {
    if (!editForm.service_type || !editForm.item_category || !editForm.item_name.trim()) {
      alert('يرجى ملء: نوع الخدمة + التصنيف + اسم الاشتراك');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${API}/provider-subscriptions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: editForm.service_type,
          item_category: editForm.item_category,
          item_name: editForm.item_name.trim(),
          price: Number(editForm.price || 0),
          unit_label: editForm.unit_label.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث الاشتراك');
      }

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
      });

      const data = await res.json();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {loading ? (
            <div className="text-center py-12 text-gray-600 text-lg">
              جاري تحميل بيانات الشركة...
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 mb-8 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">تفاصيل الشركة</h1>
                <p className="text-lg opacity-90">
                  {company?.name || 'شركة غير معروفة'}
                </p>
                <p className="text-sm opacity-80 mt-1">
                  الهاتف: {company?.phone || '-'} | البريد: {company?.email || '-'}
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">إضافة اشتراك جديد</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">نوع الخدمة</label>
                    <select
                      value={form.service_type}
                      onChange={(e) => setForm((prev) => ({ ...prev, service_type: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                    >
                      {SERVICE_TYPES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">التصنيف</label>
                    <select
                      value={form.item_category}
                      onChange={(e) => setForm((prev) => ({ ...prev, item_category: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                    >
                      {ITEM_CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">اسم الاشتراك</label>
                    <input
                      type="text"
                      value={form.item_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, item_name: e.target.value }))}
                      placeholder="مثال: Premium / Gold"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">السعر</label>
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">الوحدة</label>
                    <input
                      type="text"
                      value={form.unit_label}
                      onChange={(e) => setForm((prev) => ({ ...prev, unit_label: e.target.value }))}
                      placeholder="مثال: line / bundle"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={saving}
                    className={`px-6 py-3 rounded-lg text-white font-semibold ${
                      saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {saving ? 'جاري الحفظ...' : 'إضافة الاشتراك'}
                  </button>

                  <button
                    type="button"
                    onClick={resetCreateForm}
                    disabled={saving}
                    className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
                  >
                    تفريغ
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
                  >
                    رجوع
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <h2 className="text-xl font-bold text-gray-900">قائمة الاشتراكات</h2>

                <div className="w-full md:max-w-sm">
                  <input
                    type="text"
                    placeholder="ابحث في الاشتراكات..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {filteredSubscriptions.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-xl">
                  لا توجد اشتراكات حالياً لهذه الشركة
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">نوع الخدمة</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">التصنيف</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">اسم الاشتراك</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">السعر</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الوحدة</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscriptions.map((sub) => {
                        const isEditing = editingId === sub.id;

                        return (
                          <tr key={sub.id} className="border-t border-gray-200">
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select
                                  value={editForm.service_type}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, service_type: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
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

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select
                                  value={editForm.item_category}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, item_category: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
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

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.item_name}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, item_name: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              ) : (
                                sub.item_name
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.price}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, price: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              ) : (
                                sub.price
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.unit_label}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, unit_label: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              ) : (
                                sub.unit_label || '-'
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(sub.id)}
                                      disabled={saving}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      disabled={saving}
                                      className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                                    >
                                      إلغاء
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(sub)}
                                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                                    >
                                      تعديل
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(sub.id)}
                                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                      حذف
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CompanyDetailsPage;
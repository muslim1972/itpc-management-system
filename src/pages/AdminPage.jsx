import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import PageFooter from '../components/PageFooter';
import PriceHistoryDropdown from '../components/PriceHistoryDropdown';
import { logout } from '../utils/auth';

const API = '/api';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const user = getCurrentUser();
  return {
    'Content-Type': 'application/json',
    'X-User-Id': user?.id ? String(user.id) : '',
  };
};

const OrganizationsSection = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    address: '',
    status: 'active',
    notes: '',
  });
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    location: '',
    address: '',
    status: 'active',
    notes: '',
  });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/organizations`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'فشل تحميل الجهات');

      setOrganizations(data.organizations || []);
    } catch (e) {
      setOrganizations([]);
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!addForm.name?.trim()) {
      setError('اسم الجهة مطلوب');
      return;
    }

    setError('');
    try {
      const res = await fetch(`${API}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل الحفظ');
        return;
      }

      setAddForm({
        name: '',
        phone: '',
        location: '',
        address: '',
        status: 'active',
        notes: '',
      });
      setShowAddForm(false);
      load();
    } catch (e) {
      setError('خطأ في الاتصال');
    }
  };

  const startEdit = (org) => {
    setEditingId(org.id);
    setEditForm({
      name: org.name || '',
      phone: org.phone || '',
      location: org.location || '',
      address: org.address || '',
      status: org.status || 'active',
      notes: org.notes || '',
    });
  };

  const handleSave = async () => {
    if (!editForm.name?.trim()) {
      setError('اسم الجهة مطلوب');
      return;
    }

    setError('');
    try {
      const res = await fetch(`${API}/organizations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل التحديث');
        return;
      }

      setEditingId(null);
      load();
    } catch (e) {
      setError('خطأ في الاتصال');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الجهة؟')) return;

    setError('');
    try {
      const res = await fetch(`${API}/organizations/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'فشل الحذف');
        return;
      }

      load();
    } catch (e) {
      setError('خطأ في الاتصال');
    }
  };

  return (
    <div className="surface-card p-6 sm:p-7 page-reveal">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="section-title text-xl sm:text-2xl">إدارة الجهات</h2>
          <p className="section-subtitle">تنظيم وإدارة الجهات المستفيدة</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError('');
          }}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm shadow-md transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="font-bold">إضافة جهة</span>
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-[22px] border border-slate-200 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">اسم الجهة</label>
            <input
              placeholder="اسم الجهة"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">رقم الهاتف</label>
            <input
              placeholder="رقم الهاتف"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الموقع</label>
            <input
              placeholder="الموقع"
              value={addForm.location}
              onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">العنوان</label>
            <input
              placeholder="العنوان"
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">ملاحظات</label>
            <input
              placeholder="ملاحظات"
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الحالة</label>
            <select
              value={addForm.status}
              onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
              className="select-modern flex-1"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="pending">pending</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={handleAdd}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : organizations.length === 0 ? (
        <p className="text-slate-500 py-4">لا توجد جهات</p>
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => {
            const isExpanded = expandedId === org.id;
            const isEditing = editingId === org.id;

            return (
              <div key={org.id} className="surface-card overflow-hidden transition-all duration-300">
                {isEditing ? (
                  <div className="p-5 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">اسم الجهة</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="اسم الجهة"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">رقم الهاتف</label>
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="رقم الهاتف"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الموقع</label>
                        <input
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="الموقع"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">العنوان</label>
                        <input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="العنوان"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">ملاحظات</label>
                        <input
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="ملاحظات"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الحالة</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="select-modern flex-1 bg-white"
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                          <option value="pending">pending</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary px-5 py-2.5 text-sm"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleSave}
                        className="btn-primary px-5 py-2.5 text-sm"
                      >
                        حفظ التعديلات
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : org.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${org.status === 'active' ? 'bg-emerald-500' : org.status === 'inactive' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">{org.name}</h3>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => startEdit(org)}
                          className="p-2.5 text-blue-600 bg-blue-50 sm:bg-transparent hover:bg-blue-50 rounded-xl transition-colors"
                          title="تعديل"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(org.id)}
                          className="p-2.5 text-rose-600 bg-rose-50 sm:bg-transparent hover:bg-rose-50 rounded-xl transition-colors"
                          title="حذف"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
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
                          <div className="sm:col-span-2 space-y-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ملاحظات</span>
                            <p className="text-sm text-slate-600 leading-relaxed bg-white/50 p-3 rounded-xl border border-slate-100">{org.notes || 'لا توجد ملاحظات'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CompaniesSection = ({ onDetails }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    is_active: true,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    is_active: true,
  });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/provider-companies`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'فشل تحميل الشركات');

      setCompanies(data.provider_companies || []);
    } catch (e) {
      setCompanies([]);
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddCompany = async () => {
    if (!addForm.name.trim()) {
      setError('اسم الشركة مطلوب');
      return;
    }

    setError('');
    try {
      const res = await fetch(`${API}/provider-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل الحفظ');
        return;
      }

      setAddForm({
        name: '',
        phone: '',
        address: '',
        email: '',
        is_active: true,
      });
      setShowAddForm(false);
      load();
    } catch (e) {
      setError('خطأ في الاتصال');
    }
  };

  const startEdit = (company) => {
    setEditingId(company.id);
    setEditForm({
      name: company.name || '',
      phone: company.phone || '',
      address: company.address || '',
      email: company.email || '',
      is_active: Boolean(company.is_active),
    });
  };

  const handleSaveCompany = async () => {
    if (!editForm.name.trim()) {
      setError('اسم الشركة مطلوب');
      return;
    }

    setError('');
    try {
      const res = await fetch(`${API}/provider-companies/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل التحديث');
        return;
      }

      setEditingId(null);
      load();
    } catch (e) {
      setError('خطأ في الاتصال');
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${company.name}"؟ سيتم حذف كل اشتراكاتها أيضاً.`)) {
      return;
    }

    setError('');
    try {
      const res = await fetch(`${API}/provider-companies/${company.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'فشل الحذف');
        return;
      }

      load();
    } catch (e) {
      setError('خطأ في الاتصال');
    }
  };

  return (
    <div className="surface-card p-6 sm:p-7 page-reveal">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="section-title text-xl sm:text-2xl">إدارة الشركات المزودة</h2>
          <p className="section-subtitle">إجمالي الشركات: {companies.length}</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError('');
          }}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm shadow-md transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="font-bold">إضافة شركة</span>
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-[22px] border border-slate-200 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">اسم الشركة</label>
            <input
              placeholder="اسم الشركة"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">رقم الهاتف</label>
            <input
              placeholder="رقم الهاتف"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">العنوان</label>
            <input
              placeholder="العنوان"
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">البريد الإلكتروني</label>
            <input
              placeholder="البريد الإلكتروني"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="input-modern flex-1"
            />
          </div>
          <div className="md:col-span-2 flex gap-3 items-center">
            <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الحالة</label>
            <select
              value={String(addForm.is_active)}
              onChange={(e) =>
                setAddForm({ ...addForm, is_active: e.target.value === 'true' })
              }
              className="select-modern flex-1"
            >
              <option value="true">نشطة</option>
              <option value="false">غير نشطة</option>
            </select>
            <button
              onClick={handleAddCompany}
              className="btn-primary px-5 py-2.5 text-sm mr-auto"
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : companies.length === 0 ? (
        <p className="text-slate-500 py-4">لا توجد شركات</p>
      ) : (
        <div className="space-y-3">
          {companies.map((company) => {
            const isExpanded = expandedId === company.id;
            const isEditing = editingId === company.id;

            return (
              <div key={company.id} className="surface-card overflow-hidden transition-all duration-300">
                {isEditing ? (
                  <div className="p-5 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">اسم الشركة</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="اسم الشركة"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الهاتف</label>
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="الهاتف"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">العنوان</label>
                        <input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="العنوان"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">البريد</label>
                        <input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input-modern flex-1"
                          placeholder="البريد"
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-3 items-center">
                        <label className="text-sm font-medium text-slate-700 w-[110px] shrink-0">الحالة</label>
                        <select
                          value={String(editForm.is_active)}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_active: e.target.value === 'true' })
                          }
                          className="select-modern flex-1 bg-white"
                        >
                          <option value="true">نشطة</option>
                          <option value="false">غير نشطة</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary px-5 py-2.5 text-sm"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleSaveCompany}
                        className="btn-primary px-5 py-2.5 text-sm"
                      >
                        حفظ التعديلات
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : company.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${company.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">{company.name}</h3>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onDetails(company)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          التفاصيل
                        </button>
                        <button
                          onClick={() => startEdit(company)}
                          className="p-2.5 text-blue-600 bg-blue-50 sm:bg-transparent hover:bg-blue-50 rounded-xl transition-colors"
                          title="تعديل"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company)}
                          className="p-2.5 text-rose-600 bg-rose-50 sm:bg-transparent hover:bg-rose-50 rounded-xl transition-colors"
                          title="حذف"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
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
                            <p className="text-sm text-slate-700 font-medium">{company.phone || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">البريد الإلكتروني</span>
                            <p className="text-sm text-slate-700 font-medium">{company.email || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">الحالة</span>
                            <p className={`text-sm font-bold ${company.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {company.is_active ? 'نشطة' : 'غير نشطة'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">العنوان</span>
                            <p className="text-sm text-slate-700 font-medium">{company.address || '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PriceImpactModal = ({
  open,
  title,
  oldPrice,
  newPrice,
  organizations,
  selectedIds,
  officialBookDate,
  officialBookDescription,
  setOfficialBookDate,
  setOfficialBookDescription,
  onToggle,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="surface-card w-full max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">السعر القديم: {oldPrice} | السعر الجديد: {newPrice}</p>
          <p className="text-sm text-amber-700 mt-2">اختر الجهات المتأثرة التي تريد تطبيق التعديل عليها. الافتراضي ON ويمكن إيقاف أي جهة.</p>
        </div>

        <div className="p-5 overflow-y-auto max-h-[55vh] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">تاريخ الكتاب الرسمي</label>
              <input
                type="date"
                value={officialBookDate || ''}
                onChange={(e) => setOfficialBookDate?.(e.target.value)}
                className="w-full input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">وصف الكتاب الرسمي</label>
              <input
                type="text"
                value={officialBookDescription || ''}
                onChange={(e) => setOfficialBookDescription?.(e.target.value)}
                className="w-full input-modern"
              />
            </div>
          </div>

          {!organizations?.length ? (
            <p className="text-slate-500">لا توجد جهات متأثرة بهذا التعديل</p>
          ) : organizations.map((org) => {
            const isOn = selectedIds.includes(org.organization_id);
            return (
              <div key={org.organization_id} className="flex items-center justify-between border rounded-xl p-3">
                <div>
                  <p className="font-semibold text-slate-900">{org.organization_name}</p>
                  <p className="text-xs text-slate-500">الخدمات المتأثرة: {org.services_count} | العناصر: {org.items_count}</p>
                </div>
                <button
                  onClick={() => onToggle(org.organization_id)}
                  className={`px-4 py-2 rounded-lg text-white ${isOn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 hover:bg-slate-50/800'}`}
                >
                  {isOn ? 'ON' : 'OFF'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary px-4 py-2.5 text-sm">إلغاء</button>
          <button onClick={onConfirm} className="btn-primary px-4 py-2.5 text-sm">تأكيد التعديل</button>
        </div>
      </div>
      
    </div>
  );
};

const PackagesSection = () => {
  const serviceNames = ['fna', 'gcc', 'انترانيت', 'دولي', 'LTE'];
  const [serviceRanges, setServiceRanges] = useState(() => Object.fromEntries(serviceNames.map((s) => [s, []])));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForService, setShowAddForService] = useState({});
  const [editingRangeId, setEditingRangeId] = useState(null);
  const [editingRangeForm, setEditingRangeForm] = useState({ from: '', to: '', price: '' });
  const [drafts, setDrafts] = useState(() => Object.fromEntries(serviceNames.map((s) => [s, [{ from: '', to: '', price: '' }]])));
  const [impactModal, setImpactModal] = useState({ open: false, serviceName: '', rangeId: null, oldPrice: 0, newPrice: 0, organizations: [], selectedIds: [], official_book_date: '', official_book_description: '' });
  const [expandedServiceName, setExpandedServiceName] = useState(null);

  const closeImpactModal = () => setImpactModal({ open: false, serviceName: '', rangeId: null, oldPrice: 0, newPrice: 0, organizations: [], selectedIds: [] });

  const loadRanges = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/service-ranges`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحميل الرينجات');

      const grouped = Object.fromEntries(serviceNames.map((s) => [s, []]));
      (data.ranges || []).forEach((row) => {
        if (grouped[row.service_name]) {
          grouped[row.service_name].push({
            id: row.id,
            from: row.range_from,
            to: row.range_to,
            price: row.price,
            price_history: row.price_history || [],
          });
        }
      });
      setServiceRanges(grouped);
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRanges(); }, []);

  const addRangeRow = (serviceName) => setDrafts((prev) => ({ ...prev, [serviceName]: [...(prev[serviceName] || []), { from: '', to: '', price: '' }] }));
  const removeRangeRow = (serviceName, index) => setDrafts((prev) => ({ ...prev, [serviceName]: (prev[serviceName] || []).filter((_, i) => i !== index) }));
  const updateRangeRow = (serviceName, index, field, value) => setDrafts((prev) => ({ ...prev, [serviceName]: (prev[serviceName] || []).map((row, i) => i === index ? { ...row, [field]: value } : row) }));

  const handleSaveRanges = async (serviceName) => {
    const rows = (drafts[serviceName] || []).filter((row) => row.from !== '' && row.to !== '' && row.price !== '' && Number(row.from) <= Number(row.to));
    if (!rows.length) {
      setError('يرجى إدخال رينج واحد صحيح على الأقل');
      return;
    }
    setError('');
    try {
      for (const row of rows) {
        const res = await fetch(`${API}/service-ranges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_name: serviceName, range_from: Number(row.from), range_to: Number(row.to), price: Number(row.price) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل حفظ الرينج');
      }
      setDrafts((prev) => ({ ...prev, [serviceName]: [{ from: '', to: '', price: '' }] }));
      setShowAddForService((prev) => ({ ...prev, [serviceName]: false }));
      loadRanges();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  const startEditSavedRange = (row) => {
    setEditingRangeId(row.id);
    setEditingRangeForm({ from: String(row.from ?? ''), to: String(row.to ?? ''), price: String(row.price ?? '') });
    setError('');
  };

  const cancelEditSavedRange = () => {
    setEditingRangeId(null);
    setEditingRangeForm({ from: '', to: '', price: '' });
  };

  const handleUpdateSavedRange = async (serviceName, rangeId) => {
    if (editingRangeForm.from === '' || editingRangeForm.to === '' || editingRangeForm.price === '' || Number(editingRangeForm.from) > Number(editingRangeForm.to)) {
      setError('يرجى إدخال قيم صحيحة لتعديل الرينج');
      return;
    }
    setError('');
    try {
      const res = await fetch(`${API}/service-ranges/${rangeId}/impact`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ service_name: serviceName, range_from: Number(editingRangeForm.from), range_to: Number(editingRangeForm.to), price: Number(editingRangeForm.price) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل جلب الجهات المتأثرة');
      setImpactModal({
        open: true,
        serviceName,
        rangeId,
        oldPrice: data.old_price,
        newPrice: data.new_price,
        organizations: data.affected_organizations || [],
        selectedIds: (data.affected_organizations || []).map((org) => org.organization_id),
        official_book_date: new Date().toISOString().split('T')[0],
        official_book_description: '',
      });
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  const confirmUpdateSavedRange = async () => {
    if (!impactModal.official_book_date || !String(impactModal.official_book_description || '').trim()) {
      setError('يرجى إدخال تاريخ الكتاب الرسمي ووصفه');
      return;
    }
    try {
      const res = await fetch(`${API}/service-ranges/${impactModal.rangeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          service_name: impactModal.serviceName,
          range_from: Number(editingRangeForm.from),
          range_to: Number(editingRangeForm.to),
          price: Number(editingRangeForm.price),
          selected_organization_ids: impactModal.selectedIds,
          official_book_date: impactModal.official_book_date,
          official_book_description: String(impactModal.official_book_description || '').trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل تعديل الرينج');
      closeImpactModal();
      cancelEditSavedRange();
      loadRanges();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  const handleDeleteSavedRange = async (rangeId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الرينج؟')) return;
    setError('');
    try {
      const res = await fetch(`${API}/service-ranges/${rangeId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل حذف الرينج');
      loadRanges();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  return (
    <div className="surface-card p-6 sm:p-7 page-reveal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="section-title">إدارة الباقات والرينجات</h2>
          <p className="section-subtitle">إدارة أسعار الرينجات للخدمات النوعية</p>
        </div>
        <button 
          onClick={loadRanges} 
          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
          title="تحديث"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-500">جاري تحميل البيانات...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {serviceNames.map((serviceName) => {
            const isExpanded = expandedServiceName === serviceName;
            const ranges = serviceRanges[serviceName] || [];
            
            return (
              <div key={serviceName} className="surface-card overflow-hidden border border-slate-200 transition-all duration-300">
                <div 
                  onClick={() => setExpandedServiceName(isExpanded ? null : serviceName)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
                      {serviceName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{serviceName}</h3>
                      <p className="text-xs text-slate-500 font-medium">عدد الرينجات المسجلة: {ranges.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setShowAddForService((prev) => ({ ...prev, [serviceName]: !prev[serviceName] }))}
                      className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                    >
                      {showAddForService[serviceName] ? 'إلغاء الإضافة' : 'إضافة رينج'}
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

                {showAddForService[serviceName] && (
                  <div className="p-5 border-t border-emerald-100 bg-emerald-50/20 animate-in slide-in-from-top-2">
                    <div className="space-y-4">
                      {(drafts[serviceName] || []).map((row, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">من (Mb)</label>
                            <input type="number" value={row.from} onChange={(e) => updateRangeRow(serviceName, index, 'from', e.target.value)} className="input-modern w-full" placeholder="0" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">إلى (Mb)</label>
                            <input type="number" value={row.to} onChange={(e) => updateRangeRow(serviceName, index, 'to', e.target.value)} className="input-modern w-full" placeholder="100" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">السعر</label>
                            <input type="number" value={row.price} onChange={(e) => updateRangeRow(serviceName, index, 'price', e.target.value)} className="input-modern w-full" placeholder="0.00" />
                          </div>
                          <button onClick={() => removeRangeRow(serviceName, index)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-100 flex items-center justify-center gap-2 font-bold text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            حذف السطر
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => addRangeRow(serviceName)} className="px-4 py-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm">
                        + إضافة سطر آخر
                      </button>
                      <button onClick={() => handleSaveRanges(serviceName)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md active:scale-95">
                        حفظ الرينجات الجديدة
                      </button>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
                    {ranges.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-medium">
                        لا توجد رينجات معرفة لهذه الخدمة حالياً.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="hidden lg:grid lg:grid-cols-5 gap-4 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <div>من (Mb)</div>
                          <div>إلى (Mb)</div>
                          <div>السعر (د.ع)</div>
                          <div className="lg:col-span-2 text-center">الإجراءات</div>
                        </div>
                        
                        {ranges.map((row) => {
                          const isEditing = editingRangeId === row.id;
                          return (
                            <div key={row.id} className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                                <div className="flex items-center gap-2 lg:block">
                                  <span className="lg:hidden text-[10px] font-bold text-slate-400 w-12 shrink-0">من:</span>
                                  <input type="number" value={isEditing ? editingRangeForm.from : row.from} readOnly={!isEditing} onChange={(e) => setEditingRangeForm((prev) => ({ ...prev, from: e.target.value }))} className={`input-modern w-full ${isEditing ? 'border-emerald-500' : 'bg-slate-50 border-transparent font-bold text-slate-700'}`} />
                                </div>
                                <div className="flex items-center gap-2 lg:block">
                                  <span className="lg:hidden text-[10px] font-bold text-slate-400 w-12 shrink-0">إلى:</span>
                                  <input type="number" value={isEditing ? editingRangeForm.to : row.to} readOnly={!isEditing} onChange={(e) => setEditingRangeForm((prev) => ({ ...prev, to: e.target.value }))} className={`input-modern w-full ${isEditing ? 'border-emerald-500' : 'bg-slate-50 border-transparent font-bold text-slate-700'}`} />
                                </div>
                                <div className="flex items-center gap-2 lg:block">
                                  <span className="lg:hidden text-[10px] font-bold text-slate-400 w-12 shrink-0">السعر:</span>
                                  <input type="number" value={isEditing ? editingRangeForm.price : row.price} readOnly={!isEditing} onChange={(e) => setEditingRangeForm((prev) => ({ ...prev, price: e.target.value }))} className={`input-modern w-full ${isEditing ? 'border-emerald-500' : 'bg-slate-50 border-transparent font-bold text-emerald-700'}`} />
                                </div>
                                
                                <div className="lg:col-span-2 flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <button onClick={() => handleUpdateSavedRange(serviceName, row.id)} className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm">حفظ</button>
                                      <button onClick={cancelEditSavedRange} className="flex-1 bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => startEditSavedRange(row)} className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-100">تعديل</button>
                                      <button onClick={() => handleDeleteSavedRange(row.id)} className="flex-1 bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all border border-rose-100">حذف</button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {!!row.price_history?.length && (
                                <div className="mt-3 pt-3 border-t border-slate-50">
                                  <PriceHistoryDropdown
                                    history={row.price_history}
                                    itemClassName="text-[10px] text-slate-500 bg-slate-50/50 rounded-lg p-2 mb-1"
                                    latestItemClassName="text-[10px] text-emerald-700 bg-emerald-50/50 rounded-lg p-2 mb-1 font-bold"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PriceImpactModal
        open={impactModal.open}
        title="تحديث أسعار الرينجات"
        oldPrice={impactModal.oldPrice}
        newPrice={impactModal.newPrice}
        organizations={impactModal.organizations}
        selectedIds={impactModal.selectedIds}
        officialBookDate={impactModal.official_book_date}
        officialBookDescription={impactModal.official_book_description}
        setOfficialBookDate={(value) => setImpactModal((prev) => ({ ...prev, official_book_date: value }))}
        setOfficialBookDescription={(value) => setImpactModal((prev) => ({ ...prev, official_book_description: value }))}
        onToggle={(orgId) => setImpactModal((prev) => ({ ...prev, selectedIds: prev.selectedIds.includes(orgId) ? prev.selectedIds.filter((id) => id !== orgId) : [...prev.selectedIds, orgId] }))}
        onClose={closeImpactModal}
        onConfirm={confirmUpdateSavedRange}
      />
    </div>
  );
};

const UsersSection = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/users`, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحميل المستخدمين');
      }

      setUsers(data.users || []);
    } catch (e) {
      setUsers([]);
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setError('اسم المستخدم وكلمة المرور مطلوبان');
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل إضافة المستخدم');
      }

      setForm({ username: '', password: '', role: 'user' });
      setSuccess('تمت إضافة المستخدم بنجاح');
      load();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${userToDelete.username}"؟`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف المستخدم');
      }

      setSuccess('تم حذف المستخدم بنجاح');
      load();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  return (
    <div className="surface-card p-6 sm:p-7 page-reveal">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">إدارة المستخدمين</h2>
        <div className="flex gap-2">
          <button 
            onClick={load} 
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
            title="تحديث"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setError('');
              setSuccess('');
            }}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v6h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            إضافة مستخدم
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
      {success && <p className="text-emerald-600 text-sm mb-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100 font-bold">{success}</p>}

      {showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50/80 rounded-[22px] border border-slate-200 mb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">اسم المستخدم</label>
            <input
              placeholder="مثلاً: ahmad_2024"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="input-modern w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">كلمة المرور</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-modern w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">الصلاحية</label>
            <div className="flex gap-2">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="select-modern flex-1 bg-white"
              >
                <option value="user">User (مستخدم)</option>
                <option value="admin">Admin (مدير نظام)</option>
              </select>
              <button
                onClick={createUser}
                disabled={saving}
                className="btn-primary px-6 transition-all shadow-md active:scale-95"
              >
                {saving ? '...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-500">جاري تحميل قائمة المستخدمين...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          لا يوجد مستخدمون حالياً
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => {
            const isAdmin = u.role === 'admin';
            return (
              <div key={u.id} className="surface-card p-5 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group relative overflow-hidden">
                {/* Role Badge Decor */}
                <div className={`absolute top-0 right-0 w-1.5 h-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${isAdmin ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{u.username}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isAdmin ? 'مدير نظام' : 'مستخدم'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteUser(u)}
                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="حذف المستخدم"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">آخر نشاط</span>
                    <span className="text-slate-600 font-medium">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('ar-EG') : 'لم يسجل دخول بعد'}
                    </span>
                  </div>
                  {u.last_login && (
                    <p className="text-[10px] text-slate-400 text-left dir-ltr">
                      {new Date(u.last_login).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CompanyDetailsSection = ({ company, onBack }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ service_type: 'Wireless', item_category: 'Line', item_name: '', price: '', unit_label: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);
  const [editingSubForm, setEditingSubForm] = useState({ item_name: '', price: '', unit_label: '', service_type: 'Wireless', item_category: 'Line' });
  const [impactModal, setImpactModal] = useState({ open: false, subId: null, oldPrice: 0, newPrice: 0, organizations: [], selectedIds: [], official_book_date: '', official_book_description: '' });

  const closeImpactModal = () => setImpactModal({ open: false, subId: null, oldPrice: 0, newPrice: 0, organizations: [], selectedIds: [] });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/provider-companies/${company.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحميل تفاصيل الشركة');
      setDetails(data.provider_company || data);
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [company?.id]);

  const handleAddSubscription = async () => {
    if (!form.item_name.trim() || form.price === '') {
      setError('يرجى إدخال اسم الاشتراك والسعر');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/provider-companies/${company.id}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة الاشتراك');
      setForm({ service_type: 'Wireless', item_category: 'Line', item_name: '', price: '', unit_label: '', notes: '' });
      load();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const startEditSubscription = (sub) => {
    setEditingSubId(sub.id);
    setEditingSubForm({
      item_name: sub.item_name || '',
      price: String(sub.price ?? ''),
      unit_label: sub.unit_label || '',
      service_type: sub.service_type || 'Wireless',
      item_category: sub.item_category || 'Line',
    });
    setError('');
  };

  const cancelEditSubscription = () => {
    setEditingSubId(null);
    setEditingSubForm({ item_name: '', price: '', unit_label: '', service_type: 'Wireless', item_category: 'Line' });
  };

  const handleEditSubscription = async (subId) => {
    try {
      const res = await fetch(`${API}/provider-subscriptions/${subId}/impact`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...editingSubForm, price: Number(editingSubForm.price) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل جلب الجهات المتأثرة');
      setImpactModal({
        open: true,
        subId,
        oldPrice: data.old_price,
        newPrice: data.new_price,
        organizations: data.affected_organizations || [],
        selectedIds: (data.affected_organizations || []).map((org) => org.organization_id),
        official_book_date: new Date().toISOString().split('T')[0],
        official_book_description: '',
      });
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  const confirmEditSubscription = async () => {
    if (!impactModal.official_book_date || !String(impactModal.official_book_description || '').trim()) {
      setError('يرجى إدخال تاريخ الكتاب الرسمي ووصفه');
      return;
    }
    try {
      const res = await fetch(`${API}/provider-subscriptions/${impactModal.subId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...editingSubForm, price: Number(editingSubForm.price), selected_organization_ids: impactModal.selectedIds, official_book_date: impactModal.official_book_date, official_book_description: String(impactModal.official_book_description || '').trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل تعديل الاشتراك');
      closeImpactModal();
      cancelEditSubscription();
      load();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  const handleDeleteSubscription = async (subId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return;
    setError('');
    try {
      const res = await fetch(`${API}/provider-subscriptions/${subId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل حذف الاشتراك');
      load();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  return (
    <div className="surface-card p-6 sm:p-7 page-reveal">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">تفاصيل الشركة المجهزة</h2>
          <p className="text-sm text-slate-500 mt-1">{company?.name}</p>
        </div>
        <button onClick={onBack} className="btn-secondary px-4 py-2.5 text-sm">رجوع</button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-[22px] border border-slate-200 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-28 shrink-0">نوع الخدمة</label>
          <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="select-modern flex-1">
            <option value="Wireless">Wireless</option>
            <option value="FTTH">FTTH</option>
            <option value="Optical">Optical</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-28 shrink-0">فئة العنصر</label>
          <select value={form.item_category} onChange={(e) => setForm({ ...form, item_category: e.target.value })} className="select-modern flex-1">
            <option value="Line">Line</option>
            <option value="Bundle">Bundle</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-28 shrink-0">الاشتراك</label>
          <input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="اسم الاشتراك" className="input-modern flex-1" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-28 shrink-0">السعر</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="السعر" className="input-modern flex-1" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-28 shrink-0">القياس</label>
          <input value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} placeholder="وحدة القياس" className="input-modern flex-1" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-28 shrink-0">ملاحظات</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات" className="input-modern flex-1" />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button onClick={handleAddSubscription} disabled={saving} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">{saving ? 'جاري الحفظ...' : 'إضافة اشتراك'}</button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 py-4">جاري التحميل...</p>
      ) : !details?.subscriptions || details.subscriptions.length === 0 ? (
        <p className="text-slate-500 py-4">لا توجد اشتراكات لهذه الشركة</p>
      ) : (
        <div className="space-y-3">
          {details.subscriptions.map((sub) => {
            const isEditing = editingSubId === sub.id;
            return (
              <div key={sub.id} className="content-list-card flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-24 shrink-0">الاشتراك</label>
                    <input value={isEditing ? editingSubForm.item_name : sub.item_name} onChange={(e) => setEditingSubForm((prev) => ({ ...prev, item_name: e.target.value }))} disabled={!isEditing} className="input-modern flex-1 disabled:bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-24 shrink-0">نوع الخدمة</label>
                    <select value={isEditing ? editingSubForm.service_type : sub.service_type} onChange={(e) => setEditingSubForm((prev) => ({ ...prev, service_type: e.target.value }))} disabled={!isEditing} className="select-modern flex-1 disabled:bg-slate-100">
                      <option value="Wireless">Wireless</option>
                      <option value="FTTH">FTTH</option>
                      <option value="Optical">Optical</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-24 shrink-0">فئة العنصر</label>
                    <select value={isEditing ? editingSubForm.item_category : sub.item_category} onChange={(e) => setEditingSubForm((prev) => ({ ...prev, item_category: e.target.value }))} disabled={!isEditing} className="select-modern flex-1 disabled:bg-slate-100">
                      <option value="Line">Line</option>
                      <option value="Bundle">Bundle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-24 shrink-0">السعر</label>
                    <input type="number" value={isEditing ? editingSubForm.price : sub.price} onChange={(e) => setEditingSubForm((prev) => ({ ...prev, price: e.target.value }))} disabled={!isEditing} className="input-modern flex-1 disabled:bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-24 shrink-0">وحدة القياس</label>
                    <input value={isEditing ? editingSubForm.unit_label : (sub.unit_label || '')} onChange={(e) => setEditingSubForm((prev) => ({ ...prev, unit_label: e.target.value }))} disabled={!isEditing} className="input-modern flex-1 disabled:bg-slate-100" />
                  </div>
                </div>

                {sub.notes && <p className="text-sm text-slate-500">ملاحظات: {sub.notes}</p>}

                <div className="flex flex-wrap gap-2">
                  {!isEditing ? (
                    <button onClick={() => startEditSubscription(sub)} className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">تعديل</button>
                  ) : (
                    <>
                      <button onClick={() => handleEditSubscription(sub.id)} className="btn-primary px-4 py-2.5 text-sm">حفظ</button>
                      <button onClick={cancelEditSubscription} className="btn-secondary px-4 py-2.5 text-sm">إلغاء</button>
                    </>
                  )}
                  <button onClick={() => handleDeleteSubscription(sub.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">حذف</button>
                </div>

                {!!sub.price_history?.length && (
                  <PriceHistoryDropdown
                    history={sub.price_history}
                    className="border-t pt-3"
                    itemClassName="text-xs text-slate-500 bg-white rounded-lg border p-2"
                    latestItemClassName="text-xs text-slate-700 bg-white rounded-lg border p-2"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <PriceImpactModal
        open={impactModal.open}
        title="الجهات المتأثرة بتعديل سعر الاشتراك"
        oldPrice={impactModal.oldPrice}
        newPrice={impactModal.newPrice}
        organizations={impactModal.organizations}
        selectedIds={impactModal.selectedIds}
        officialBookDate={impactModal.official_book_date}
        officialBookDescription={impactModal.official_book_description}
        setOfficialBookDate={(value) => setImpactModal((prev) => ({ ...prev, official_book_date: value }))}
        setOfficialBookDescription={(value) => setImpactModal((prev) => ({ ...prev, official_book_description: value }))}
        onToggle={(orgId) => setImpactModal((prev) => ({ ...prev, selectedIds: prev.selectedIds.includes(orgId) ? prev.selectedIds.filter((id) => id !== orgId) : [...prev.selectedIds, orgId] }))}
        onClose={closeImpactModal}
        onConfirm={confirmEditSubscription}
      />
    </div>
  );
};

const AdminPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('organizations');

  const currentUser = getCurrentUser();

  useEffect(() => {
    const storedUser = getCurrentUser();

    if (!storedUser) {
      navigate('/login');
      return;
    }

    if (storedUser.role !== 'admin') {
      navigate('/main');
      return;
    }
  }, [navigate]);

  const sectionButtonClass = (key) =>
    `relative px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 rounded-full whitespace-nowrap flex-shrink-0 ${
      activeSection === key
        ? 'bg-white text-emerald-700 shadow-[0_4px_12px_rgba(255,255,255,0.3)]'
        : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;

  return (
    <div className="app-shell" dir="rtl">
      <Navbar onMenuClick={() => setMenuOpen(true)} />

      <SlideMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(path) => {
          setMenuOpen(false);
          navigate(path);
        }}
      />

      <div className="page-container">
        <div className="page-hero mb-8 relative overflow-hidden min-h-[110px] sm:min-h-[160px] flex flex-col justify-center">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
            <div className="pointer-events-none">
              <h1 className="hero-title">لوحة تحكم الإدارة</h1>
              <p className="hero-subtitle">
                مرحباً <span className="font-bold text-white underline decoration-white/30 underline-offset-4">{currentUser?.username || 'Admin'}</span>
              </p>
            </div>

            <div className="relative z-20 flex flex-nowrap items-center gap-1.5 bg-black/15 p-1 rounded-full w-full overflow-x-auto scrollbar-hide backdrop-blur-md border border-white/10 sm:w-fit">
              <button
                type="button"
                onClick={() => setActiveSection('organizations')}
                className={sectionButtonClass('organizations')}
              >
                الجهات
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('companies')}
                className={sectionButtonClass('companies')}
              >
                الشركات
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('packages')}
                className={sectionButtonClass('packages')}
              >
                الباقات
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('users')}
                className={sectionButtonClass('users')}
              >
                المستخدمون
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-0">
          {activeSection === 'organizations' && <OrganizationsSection />}

          {activeSection === 'companies' && (
            <CompaniesSection
              onDetails={(company) => {
                navigate(`/admin/company/${company.id}`);
              }}
            />
          )}

          {activeSection === 'packages' && <PackagesSection />}

          {activeSection === 'users' && <UsersSection />}
        </div>
      </div>
      <PageFooter />
    </div>
  );
};

export default AdminPage;

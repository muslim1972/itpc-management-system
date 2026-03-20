import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const API = '/api';

const OrganizationsSection = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
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
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">إدارة الجهات</h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError('');
          }}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          إضافة جهة
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg mb-4">
          <input
            placeholder="اسم الجهة"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="رقم الهاتف"
            value={addForm.phone}
            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="الموقع"
            value={addForm.location}
            onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="العنوان"
            value={addForm.address}
            onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <select
            value={addForm.status}
            onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="pending">pending</option>
          </select>
          <input
            placeholder="ملاحظات"
            value={addForm.notes}
            onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <div className="md:col-span-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 py-4">جاري التحميل...</p>
      ) : organizations.length === 0 ? (
        <p className="text-gray-500 py-4">لا توجد جهات</p>
      ) : (
        <ul className="space-y-3">
          {organizations.map((org) => (
            <li
              key={org.id}
              className="p-4 bg-gray-50 rounded-lg border"
            >
              {editingId === org.id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="اسم الجهة"
                  />
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="الهاتف"
                  />
                  <input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="الموقع"
                  />
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="العنوان"
                  />
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="px-3 py-2 border rounded bg-white"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="pending">pending</option>
                  </select>
                  <input
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="ملاحظات"
                  />
                  <div className="md:col-span-2 flex gap-2">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg"
                    >
                      حفظ التعديلات
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-600">
                      الهاتف: {org.phone || '—'} | الموقع: {org.location || '—'}
                    </p>
                    <p className="text-sm text-gray-600">
                      الحالة: {org.status || '—'} | العنوان: {org.address || '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(org)}
                      className="px-3 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(org.id)}
                      className="px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CompaniesSection = ({ onDetails }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
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
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">شركات مقدمة الخدمة</h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError('');
          }}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          إضافة شركة
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {showAddForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg mb-4">
          <input
            placeholder="اسم الشركة"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="رقم الهاتف"
            value={addForm.phone}
            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="العنوان"
            value={addForm.address}
            onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="البريد الإلكتروني"
            value={addForm.email}
            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <div className="md:col-span-2 flex gap-3 items-center">
            <label className="text-sm text-gray-700">الحالة</label>
            <select
              value={String(addForm.is_active)}
              onChange={(e) =>
                setAddForm({ ...addForm, is_active: e.target.value === 'true' })
              }
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="true">نشطة</option>
              <option value="false">غير نشطة</option>
            </select>
            <button
              onClick={handleAddCompany}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 py-4">جاري التحميل...</p>
      ) : companies.length === 0 ? (
        <p className="text-gray-500 py-4">لا توجد شركات</p>
      ) : (
        <ul className="space-y-3">
          {companies.map((company) => (
            <li
              key={company.id}
              className="p-4 bg-gray-50 rounded-lg border"
            >
              {editingId === company.id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="اسم الشركة"
                  />
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="الهاتف"
                  />
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="العنوان"
                  />
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="px-3 py-2 border rounded"
                    placeholder="البريد"
                  />
                  <select
                    value={String(editForm.is_active)}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.value === 'true' })
                    }
                    className="px-3 py-2 border rounded bg-white"
                  >
                    <option value="true">نشطة</option>
                    <option value="false">غير نشطة</option>
                  </select>
                  <div className="md:col-span-2 flex gap-2">
                    <button
                      onClick={handleSaveCompany}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg"
                    >
                      حفظ التعديلات
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{company.name}</p>
                    <p className="text-sm text-gray-600">
                      الهاتف: {company.phone || '—'} | البريد: {company.email || '—'}
                    </p>
                    <p className="text-sm text-gray-600">
                      العنوان: {company.address || '—'} | الحالة:{' '}
                      {company.is_active ? 'نشطة' : 'غير نشطة'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onDetails(company)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      التفاصيل
                    </button>
                    <button
                      onClick={() => startEdit(company)}
                      className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(company)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PackagesSection = () => {
  const serviceNames = ['fna', 'gcc', 'انترانيت', 'دولي'];

  const [serviceRanges, setServiceRanges] = useState(() => {
    const initial = {};
    serviceNames.forEach((service) => {
      initial[service] = [];
    });
    return initial;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForService, setShowAddForService] = useState({});
  const [drafts, setDrafts] = useState(() => {
    const initial = {};
    serviceNames.forEach((service) => {
      initial[service] = [{ from: '', to: '', price: '' }];
    });
    return initial;
  });

  const loadRanges = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/service-ranges`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحميل الرينجات');
      }

      const grouped = {};
      serviceNames.forEach((service) => {
        grouped[service] = [];
      });

      (data.ranges || []).forEach((row) => {
        if (grouped[row.service_name]) {
          grouped[row.service_name].push({
            id: row.id,
            from: row.range_from,
            to: row.range_to,
            price: row.price,
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

  useEffect(() => {
    loadRanges();
  }, []);

  const addRangeRow = (serviceName) => {
    setDrafts((prev) => ({
      ...prev,
      [serviceName]: [...(prev[serviceName] || []), { from: '', to: '', price: '' }],
    }));
  };

  const removeRangeRow = (serviceName, index) => {
    setDrafts((prev) => ({
      ...prev,
      [serviceName]: (prev[serviceName] || []).filter((_, i) => i !== index),
    }));
  };

  const updateRangeRow = (serviceName, index, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [serviceName]: (prev[serviceName] || []).map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const handleSaveRanges = async (serviceName) => {
    const rows = drafts[serviceName] || [];

    const validRows = rows.filter(
      (row) =>
        row.from !== '' &&
        row.to !== '' &&
        row.price !== '' &&
        Number(row.from) <= Number(row.to)
    );

    if (validRows.length === 0) {
      setError('يرجى إدخال رينج واحد صحيح على الأقل');
      return;
    }

    setError('');

    try {
      for (const row of validRows) {
        const res = await fetch(`${API}/service-ranges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_name: serviceName,
            range_from: Number(row.from),
            range_to: Number(row.to),
            price: Number(row.price),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'فشل حفظ الرينج');
        }
      }

      setDrafts((prev) => ({
        ...prev,
        [serviceName]: [{ from: '', to: '', price: '' }],
      }));

      setShowAddForService((prev) => ({
        ...prev,
        [serviceName]: false,
      }));

      loadRanges();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  const handleDeleteSavedRange = async (rangeId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الرينج؟')) return;

    setError('');

    try {
      const res = await fetch(`${API}/service-ranges/${rangeId}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الرينج');
      }

      loadRanges();
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">إدارة الباقات والرينجات</h2>
        <button
          onClick={loadRanges}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          تحديث
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        هذه section مستقلة عن شركات مقدمة الخدمة، ومخصصة فقط للخدمات:
        fna / gcc / انترانيت / دولي
      </p>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-500 py-4">جاري التحميل...</p>
      ) : (
        <div className="space-y-5">
          {serviceNames.map((serviceName) => (
            <div key={serviceName} className="border rounded-xl p-4 bg-gray-50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{serviceName}</h3>
                  <p className="text-sm text-gray-600">
                    عدد الرينجات: {(serviceRanges[serviceName] || []).length}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowAddForService((prev) => ({
                      ...prev,
                      [serviceName]: !prev[serviceName],
                    }))
                  }
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  إضافة رينج
                </button>
              </div>

              {(serviceRanges[serviceName] || []).length > 0 ? (
                <div className="space-y-2 mb-4">
                  {(serviceRanges[serviceName] || []).map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 bg-white rounded-lg border"
                    >
                      <input
                        value={row.from}
                        readOnly
                        className="px-3 py-2 border rounded-lg bg-gray-100"
                        placeholder="from"
                      />
                      <input
                        value={row.to}
                        readOnly
                        className="px-3 py-2 border rounded-lg bg-gray-100"
                        placeholder="to"
                      />
                      <input
                        value={row.price}
                        readOnly
                        className="px-3 py-2 border rounded-lg bg-gray-100"
                        placeholder="price"
                      />
                      <button
                        onClick={() => handleDeleteSavedRange(row.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">لا توجد رينجات لهذه الخدمة.</p>
              )}

              {showAddForService[serviceName] && (
                <div className="bg-white border-2 border-indigo-200 rounded-xl p-4">
                  <div className="space-y-3">
                    {(drafts[serviceName] || []).map((row, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center"
                      >
                        <input
                          type="number"
                          value={row.from}
                          onChange={(e) =>
                            updateRangeRow(serviceName, index, 'from', e.target.value)
                          }
                          placeholder="from"
                          className="px-3 py-2 border rounded-lg"
                        />
                        <input
                          type="number"
                          value={row.to}
                          onChange={(e) =>
                            updateRangeRow(serviceName, index, 'to', e.target.value)
                          }
                          placeholder="to"
                          className="px-3 py-2 border rounded-lg"
                        />
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) =>
                            updateRangeRow(serviceName, index, 'price', e.target.value)
                          }
                          placeholder="price"
                          className="px-3 py-2 border rounded-lg"
                        />
                        <button
                          onClick={() => removeRangeRow(serviceName, index)}
                          className="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                        >
                          حذف الرينج
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => addRangeRow(serviceName)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      إضافة رينج آخر
                    </button>

                    <button
                      onClick={() => handleSaveRanges(serviceName)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const AdminPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleCompanyDetails = (company) => {
    navigate(`/admin/company/${company.id}`, { state: { company } });
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          لوحة التحكم الإدارية
        </h1>

        <div className="space-y-6">
          <OrganizationsSection />
          <CompaniesSection onDetails={handleCompanyDetails} />
          <PackagesSection />
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
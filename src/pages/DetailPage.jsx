import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const API = '/api';

const PAYMENT_METHODS = ['شهري', 'كل 3 أشهر', 'سنوي'];
const DEVICE_OPTIONS = ['مدفوع الثمن', 'ايجار', 'الوزارة'];

const mapBackendDeviceToUi = (value) => {
  if (value === 'الشركة') return 'ايجار';
  if (value === 'المنظمة') return 'مدفوع الثمن';
  return value || 'مدفوع الثمن';
};

const mapUiDeviceToBackend = (value) => {
  if (value === 'ايجار') return 'الشركة';
  if (value === 'مدفوع الثمن') return 'المنظمة';
  return value || 'المنظمة';
};

const formatMoney = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const toDateInput = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const addMonthsToDate = (dateString, monthsToAdd) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const result = new Date(date);
  result.setMonth(result.getMonth() + monthsToAdd);
  return result.toISOString().split('T')[0];
};

const calculateNextDueDate = (createdAt, paymentMethod) => {
  if (!createdAt) return '';

  if (paymentMethod === 'شهري') {
    return addMonthsToDate(createdAt, 1);
  }

  if (paymentMethod === 'كل 3 أشهر') {
    return addMonthsToDate(createdAt, 3);
  }

  if (paymentMethod === 'سنوي') {
    return addMonthsToDate(createdAt, 12);
  }

  return '';
};

const DetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [organization, setOrganization] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [orgForm, setOrgForm] = useState({
    name: '',
    phone: '',
    address: '',
    location: '',
    status: 'active',
    notes: '',
  });

  const [serviceEdits, setServiceEdits] = useState({});
  const [itemEdits, setItemEdits] = useState({});
  const [paymentForms, setPaymentForms] = useState({});

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API}/organizations/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحميل تفاصيل الجهة');
      }

      const org = data.organization;
      setOrganization(org);

      setOrgForm({
        name: org.name || '',
        phone: org.phone || '',
        address: org.address || '',
        location: org.location || '',
        status: org.status || 'active',
        notes: org.notes || '',
      });

      const serviceMap = {};
      const itemMap = {};
      const paymentMap = {};

      (org.services || []).forEach((service) => {
        const createdAtDate = toDateInput(service.created_at);
        const dueDate = service.due_date
          ? toDateInput(service.due_date)
          : calculateNextDueDate(createdAtDate, service.payment_method || 'شهري');

        serviceMap[service.id] = {
          service_type: service.service_type || '',
          payment_method: service.payment_method || 'شهري',
          device_ownership: mapBackendDeviceToUi(service.device_ownership),
          annual_amount: service.annual_amount ?? 0,
          contract_created_at: createdAtDate,
          due_date: dueDate || '',
          notes: service.notes || '',
          is_active: !!service.is_active,
        };

        paymentMap[service.id] = {
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          note: '',
        };

        (service.service_items || []).forEach((item) => {
          itemMap[item.id] = {
            item_category: item.item_category || '',
            provider_company_id: item.provider_company_id || '',
            item_name: item.item_name || '',
            line_type: item.line_type || '',
            bundle_type: item.bundle_type || '',
            quantity: item.quantity ?? 1,
            unit_price: item.unit_price ?? 0,
            notes: item.notes || '',
          };
        });
      });

      setServiceEdits(serviceMap);
      setItemEdits(itemMap);
      setPaymentForms(paymentMap);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تحميل التفاصيل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadDetails();
    }
  }, [id]);

  const groupedServices = useMemo(() => {
    if (!organization?.services) {
      return { wireless: [], ftth: [], optical: [], other: [] };
    }

    return {
      wireless: organization.services.filter((s) => s.service_type === 'Wireless'),
      ftth: organization.services.filter((s) => s.service_type === 'FTTH'),
      optical: organization.services.filter((s) => s.service_type === 'Optical'),
      other: organization.services.filter((s) => s.service_type === 'Other'),
    };
  }, [organization]);

  const totalContractAmount = useMemo(() => {
    if (!organization?.services) return 0;
    return organization.services.reduce((sum, s) => sum + Number(s.annual_amount || 0), 0);
  }, [organization]);

  const totalPaidAmount = useMemo(() => {
    if (!organization?.services) return 0;
    return organization.services.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
  }, [organization]);

  const totalDueAmount = useMemo(() => {
    if (!organization?.services) return 0;
    return organization.services.reduce((sum, s) => sum + Number(s.due_amount || 0), 0);
  }, [organization]);

  const isContractFullyPaid = totalDueAmount <= 0;

  const handleEnableEdit = () => {
    const ok = window.confirm('هل انت متاكد من التعديل ؟');
    if (!ok) return;
    setEditMode(true);
  };

  const handlePaymentMethodChange = (serviceId, newMethod) => {
    setServiceEdits((prev) => {
      const current = prev[serviceId] || {};
      const createdAt = current.contract_created_at || '';
      const nextDueDate = calculateNextDueDate(createdAt, newMethod);

      return {
        ...prev,
        [serviceId]: {
          ...current,
          payment_method: newMethod,
          due_date: nextDueDate || current.due_date || '',
        },
      };
    });
  };

  const handleContractCreatedAtChange = (serviceId, newDate) => {
    setServiceEdits((prev) => {
      const current = prev[serviceId] || {};
      const nextDueDate = calculateNextDueDate(newDate, current.payment_method || 'شهري');

      return {
        ...prev,
        [serviceId]: {
          ...current,
          contract_created_at: newDate,
          due_date: nextDueDate || '',
        },
      };
    });
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError('');

      const orgRes = await fetch(`${API}/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm),
      });

      const orgData = await orgRes.json();
      if (!orgRes.ok) {
        throw new Error(orgData.error || 'فشل تحديث بيانات الجهة');
      }

      for (const serviceId of Object.keys(serviceEdits)) {
        const service = serviceEdits[serviceId];

        const res = await fetch(`${API}/organization-services/${serviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_type: service.service_type,
            payment_method: service.payment_method,
            device_ownership: mapUiDeviceToBackend(service.device_ownership),
            annual_amount: Number(service.annual_amount || 0),
            due_date: service.due_date || null,
            notes: service.notes || '',
            is_active: !!service.is_active,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `فشل تحديث الخدمة ${serviceId}`);
        }
      }

      for (const itemId of Object.keys(itemEdits)) {
        const item = itemEdits[itemId];

        const res = await fetch(`${API}/service-items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_category: item.item_category,
            provider_company_id: item.provider_company_id || null,
            item_name: item.item_name,
            line_type: item.line_type || null,
            bundle_type: item.bundle_type || null,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            notes: item.notes || '',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `فشل تحديث العنصر ${itemId}`);
        }
      }

      alert('تم حفظ التعديلات بنجاح');
      setEditMode(false);
      await loadDetails();
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الحفظ');
      alert(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذه الخدمة بالكامل؟');
    if (!ok) return;

    try {
      const res = await fetch(`${API}/organization-services/${serviceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الخدمة');
      }

      await loadDetails();
      alert('تم حذف الخدمة');
    } catch (err) {
      console.error(err);
      alert(err.message || 'حدث خطأ أثناء حذف الخدمة');
    }
  };

  const handleDeleteItem = async (itemId) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذا العنصر؟');
    if (!ok) return;

    try {
      const res = await fetch(`${API}/service-items/${itemId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف العنصر');
      }

      await loadDetails();
      alert('تم حذف العنصر');
    } catch (err) {
      console.error(err);
      alert(err.message || 'حدث خطأ أثناء حذف العنصر');
    }
  };

  const handleRecordPayment = async (serviceId, currentDueAmount) => {
    const form = paymentForms[serviceId];
    const amount = Number(form?.amount || 0);

    if (!amount || !form?.payment_date) {
      alert('يرجى إدخال مبلغ الدفع وتاريخ الدفع');
      return;
    }

    if (amount <= 0) {
      alert('مبلغ الدفع يجب أن يكون أكبر من صفر');
      return;
    }

    if (amount > Number(currentDueAmount || 0)) {
      alert('مبلغ الدفع أكبر من المبلغ المتبقي ولا يمكن قبوله');
      return;
    }

    try {
      const res = await fetch(`${API}/organization-services/${serviceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_date: form.payment_date,
          note: form.note || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدفعة');
      }

      setPaymentForms((prev) => ({
        ...prev,
        [serviceId]: {
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          note: '',
        },
      }));

      await loadDetails();

      const remainingAfterPayment = Number(currentDueAmount || 0) - amount;
      if (remainingAfterPayment <= 0) {
        alert('تم دفع اجور العقد');
      } else {
        alert('تم تسجيل الدفعة بنجاح');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  const renderServiceCard = (service) => {
    const edit = serviceEdits[service.id] || {};
    const items = service.service_items || [];
    const payments = service.payments || [];
    const serviceDueAmount = Number(service.due_amount || 0);
    const servicePaidAmount = Number(service.paid_amount || 0);
    const serviceAmount = Number(service.annual_amount || 0);
    const serviceIsFullyPaid = serviceDueAmount <= 0;

    return (
      <div key={service.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {service.service_type}
            </h3>
            <p className="text-sm text-gray-500">Service ID: {service.id}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDeleteService(service.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              حذف الخدمة
            </button>
          </div>
        </div>

        {serviceIsFullyPaid && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 font-semibold">
            تم دفع اجور العقد
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">نوع الخدمة</label>
            <input
              type="text"
              value={edit.service_type || ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">آلية الدفع</label>
            <select
              value={edit.payment_method || 'شهري'}
              disabled={!editMode}
              onChange={(e) => handlePaymentMethodChange(service.id, e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                editMode ? 'bg-white' : 'bg-gray-100'
              }`}
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">عائدية الاجهزة</label>
            <select
              value={edit.device_ownership || 'مدفوع الثمن'}
              disabled={!editMode}
              onChange={(e) =>
                setServiceEdits((prev) => ({
                  ...prev,
                  [service.id]: { ...prev[service.id], device_ownership: e.target.value },
                }))
              }
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                editMode ? 'bg-white' : 'bg-gray-100'
              }`}
            >
              {DEVICE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">مبلغ الخدمة</label>
            <input
              type="number"
              value={edit.annual_amount ?? 0}
              disabled={!editMode}
              onChange={(e) =>
                setServiceEdits((prev) => ({
                  ...prev,
                  [service.id]: { ...prev[service.id], annual_amount: e.target.value },
                }))
              }
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                editMode ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">تاريخ انشاء العقد</label>
            <input
              type="date"
              value={edit.contract_created_at || ''}
              disabled={!editMode}
              onChange={(e) => handleContractCreatedAtChange(service.id, e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                editMode ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={edit.due_date || ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">المبلغ المتبقي</label>
            <input
              type="text"
              readOnly
              value={formatMoney(serviceDueAmount)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">إجمالي هذه الخدمة</div>
            <div className="text-xl font-bold text-blue-700">{formatMoney(serviceAmount)}</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">المدفوع لهذه الخدمة</div>
            <div className="text-xl font-bold text-green-700">{formatMoney(servicePaidAmount)}</div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">المتبقي لهذه الخدمة</div>
            <div className="text-xl font-bold text-red-700">{formatMoney(serviceDueAmount)}</div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">ملاحظات الخدمة</label>
          <textarea
            rows="2"
            value={edit.notes || ''}
            disabled={!editMode}
            onChange={(e) =>
              setServiceEdits((prev) => ({
                ...prev,
                [service.id]: { ...prev[service.id], notes: e.target.value },
              }))
            }
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
              editMode ? 'bg-white' : 'bg-gray-100'
            }`}
          />
        </div>

        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">تفاصيل الخدمة</h4>

          {items.length === 0 ? (
            <div className="text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
              لا توجد عناصر لهذه الخدمة
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const itemEdit = itemEdits[item.id] || {};

                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">التصنيف</label>
                        <input
                          type="text"
                          value={itemEdit.item_category || ''}
                          disabled
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">اسم العنصر</label>
                        <input
                          type="text"
                          value={itemEdit.item_name || ''}
                          disabled={!editMode}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], item_name: e.target.value },
                            }))
                          }
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white' : 'bg-gray-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Line Type</label>
                        <input
                          type="text"
                          value={itemEdit.line_type || ''}
                          disabled={!editMode}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], line_type: e.target.value },
                            }))
                          }
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white' : 'bg-gray-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Bundle Type</label>
                        <input
                          type="text"
                          value={itemEdit.bundle_type || ''}
                          disabled={!editMode}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], bundle_type: e.target.value },
                            }))
                          }
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white' : 'bg-gray-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">العدد</label>
                        <input
                          type="number"
                          value={itemEdit.quantity ?? 0}
                          disabled={!editMode}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], quantity: e.target.value },
                            }))
                          }
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white' : 'bg-gray-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">سعر الوحدة</label>
                        <input
                          type="number"
                          value={itemEdit.unit_price ?? 0}
                          disabled={!editMode}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], unit_price: e.target.value },
                            }))
                          }
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white' : 'bg-gray-100'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">الملاحظات</label>
                        <input
                          type="text"
                          value={itemEdit.notes || ''}
                          disabled={!editMode}
                          onChange={(e) =>
                            setItemEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], notes: e.target.value },
                            }))
                          }
                          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                            editMode ? 'bg-white' : 'bg-gray-100'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">المجموع</label>
                        <input
                          type="text"
                          readOnly
                          value={formatMoney(
                            Number(itemEdit.quantity || 0) * Number(itemEdit.unit_price || 0)
                          )}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        حذف العنصر
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">الدفعات</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">المبلغ</label>
              <input
                type="number"
                value={paymentForms[service.id]?.amount || ''}
                onChange={(e) =>
                  setPaymentForms((prev) => ({
                    ...prev,
                    [service.id]: { ...prev[service.id], amount: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">تاريخ الدفع</label>
              <input
                type="date"
                value={paymentForms[service.id]?.payment_date || ''}
                onChange={(e) =>
                  setPaymentForms((prev) => ({
                    ...prev,
                    [service.id]: { ...prev[service.id], payment_date: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">ملاحظة</label>
              <input
                type="text"
                value={paymentForms[service.id]?.note || ''}
                onChange={(e) =>
                  setPaymentForms((prev) => ({
                    ...prev,
                    [service.id]: { ...prev[service.id], note: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleRecordPayment(service.id, serviceDueAmount)}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                تسجيل دفعة
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
              لا توجد دفعات مسجلة
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold">المبلغ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">تاريخ الدفع</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">الملاحظة</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-gray-200">
                      <td className="px-4 py-3">{formatMoney(payment.amount)}</td>
                      <td className="px-4 py-3">{payment.payment_date || '-'}</td>
                      <td className="px-4 py-3">{payment.note || '-'}</td>
                      <td className="px-4 py-3">{payment.created_by_username || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
        <Navbar onMenuClick={() => setIsMenuOpen(true)} />
        <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <main className="max-w-7xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow-lg p-10 text-center text-gray-600">
            جاري تحميل التفاصيل...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 mb-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {organization?.name || 'تفاصيل الجهة'}
            </h1>
            <p className="text-base sm:text-lg opacity-90">
              عرض وتعديل بيانات الجهة والخدمات والدفعات
            </p>
          </div>

          {isContractFullyPaid && (
            <div className="mb-8 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-700 font-bold text-lg">
              تم دفع اجور العقد
            </div>
          )}

          <div className="mb-8 border border-gray-200 rounded-xl p-6 bg-gray-50">
            <div className="flex flex-wrap gap-3 mb-6">
              {!editMode ? (
                <button
                  type="button"
                  onClick={handleEnableEdit}
                  className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600"
                >
                  امكانيه التعديل
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className={`px-6 py-3 rounded-lg text-white font-semibold ${
                    saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'جاري الحفظ...' : 'حفض التعديل'}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 bg-white rounded-lg font-semibold hover:bg-gray-50"
              >
                رجوع
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">بيانات الجهة</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم الجهة</label>
                <input
                  type="text"
                  value={orgForm.name}
                  disabled={!editMode}
                  onChange={(e) => setOrgForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                    editMode ? 'bg-white' : 'bg-gray-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                <input
                  type="text"
                  value={orgForm.phone}
                  disabled={!editMode}
                  onChange={(e) => setOrgForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                    editMode ? 'bg-white' : 'bg-gray-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الموقع</label>
                <input
                  type="text"
                  value={orgForm.location}
                  disabled={!editMode}
                  onChange={(e) => setOrgForm((prev) => ({ ...prev, location: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                    editMode ? 'bg-white' : 'bg-gray-100'
                  }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">العنوان</label>
                <input
                  type="text"
                  value={orgForm.address}
                  disabled={!editMode}
                  onChange={(e) => setOrgForm((prev) => ({ ...prev, address: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                    editMode ? 'bg-white' : 'bg-gray-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الحالة</label>
                <select
                  value={orgForm.status}
                  disabled={!editMode}
                  onChange={(e) => setOrgForm((prev) => ({ ...prev, status: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                    editMode ? 'bg-white' : 'bg-gray-100'
                  }`}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="pending">pending</option>
                </select>
              </div>

              <div className="xl:col-span-3">
                <label className="block text-sm font-medium mb-2">ملاحظات</label>
                <textarea
                  rows="2"
                  value={orgForm.notes}
                  disabled={!editMode}
                  onChange={(e) => setOrgForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                    editMode ? 'bg-white' : 'bg-gray-100'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="text-sm text-gray-600 mb-1">إجمالي العقد</div>
              <div className="text-2xl font-bold text-blue-700">{formatMoney(totalContractAmount)}</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="text-sm text-gray-600 mb-1">المدفوع الكلي</div>
              <div className="text-2xl font-bold text-green-700">{formatMoney(totalPaidAmount)}</div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="text-sm text-gray-600 mb-1">المبلغ المتبقي الكلي</div>
              <div className="text-2xl font-bold text-red-700">{formatMoney(totalDueAmount)}</div>
            </div>
          </div>

          <div className="space-y-8">
            {groupedServices.wireless.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Wireless</h2>
                <div className="space-y-5">
                  {groupedServices.wireless.map(renderServiceCard)}
                </div>
              </section>
            )}

            {groupedServices.ftth.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">FTTH</h2>
                <div className="space-y-5">
                  {groupedServices.ftth.map(renderServiceCard)}
                </div>
              </section>
            )}

            {groupedServices.optical.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Optical</h2>
                <div className="space-y-5">
                  {groupedServices.optical.map(renderServiceCard)}
                </div>
              </section>
            )}

            {groupedServices.other.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">اخرى</h2>
                <div className="space-y-5">
                  {groupedServices.other.map(renderServiceCard)}
                </div>
              </section>
            )}

            {organization?.services?.length === 0 && (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl text-gray-500">
                لا توجد خدمات حالياً لهذه الجهة
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DetailPage;
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const API = '/api';

const WIRELESS_BUNDLE_TYPES = ['انترنت', 'انترانيت', 'دولي', 'fna', 'gcc'];
const PAYMENT_METHODS = ['شهري', 'كل 3 أشهر', 'سنوي'];
const DEVICE_UI_OPTIONS = ['مدفوع الثمن', 'ايجار'];

const emptySubscriptionRow = () => ({
  quantity: '',
  provider_company_id: '',
  subscription_id: '',
  unit_price: 0,
});

const emptyBundleRow = () => ({
  bundle_type: '',
  quantity: '',
  provider_company_id: '',
  subscription_id: '',
  amount: '',
  unit_price: 0,
});

const emptyOtherRow = () => ({
  service_name: '',
  quantity: '',
  unit_price: '',
});

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const mapDeviceChoiceToBackend = (value) => {
  // because backend currently accepts: الشركة / المنظمة / الوزارة
  // while UI you want: مدفوع الثمن / ايجار
  if (value === 'ايجار') return 'الشركة';
  return 'المنظمة';
};

const getRangePrice = (ranges, serviceName, amount) => {
  const numericAmount = parseInt(amount, 10);
  if (!numericAmount || !serviceName) return 0;

  const matched = ranges.find((item) => {
    const sameService =
      String(item.service_name || '').trim().toLowerCase() ===
      String(serviceName || '').trim().toLowerCase();

    return (
      sameService &&
      numericAmount >= Number(item.range_from) &&
      numericAmount <= Number(item.range_to)
    );
  });

  return matched ? Number(matched.price || 0) : 0;
};

const rowTotal = (quantity, unitPrice) => toNumber(quantity) * toNumber(unitPrice);

const NewContractPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const organizationId =
    location.state?.organizationId ||
    location.state?.organization?.id ||
    location.state?.orgId ||
    '';

  const organizationName =
    location.state?.organizationName ||
    location.state?.organization?.name ||
    location.state?.companyName ||
    '';

  const [providerCompanies, setProviderCompanies] = useState([]);
  const [subscriptionCache, setSubscriptionCache] = useState({});
  const [serviceRanges, setServiceRanges] = useState([]);

  const [wireless, setWireless] = useState(false);
  const [ftth, setFtth] = useState(false);
  const [optical, setOptical] = useState(false);
  const [other, setOther] = useState(false);

  const [wirelessLine, setWirelessLine] = useState(false);
  const [wirelessBundle, setWirelessBundle] = useState(false);

  const [wirelessLineRows, setWirelessLineRows] = useState([emptySubscriptionRow()]);
  const [ftthLineRows, setFtthLineRows] = useState([emptySubscriptionRow()]);
  const [wirelessBundleRows, setWirelessBundleRows] = useState([emptyBundleRow()]);
  const [otherRows, setOtherRows] = useState([emptyOtherRow()]);

  const [paymentMethod, setPaymentMethod] = useState('شهري');
  const [deviceChoice, setDeviceChoice] = useState('مدفوع الثمن');
  const [useCurrentDate, setUseCurrentDate] = useState(true);
  const [contractDate, setContractDate] = useState('');

  useEffect(() => {
    if (useCurrentDate) {
      const today = new Date().toISOString().split('T')[0];
      setContractDate(today);
    }
  }, [useCurrentDate]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const [companiesRes, rangesRes] = await Promise.all([
          fetch(`${API}/provider-companies?active=1`),
          fetch(`${API}/service-ranges`),
        ]);

        const companiesData = await companiesRes.json();
        const rangesData = await rangesRes.json();

        if (!companiesRes.ok) {
          throw new Error(companiesData.error || 'فشل تحميل شركات الخدمة');
        }

        if (!rangesRes.ok) {
          throw new Error(rangesData.error || 'فشل تحميل الرينجات');
        }

        setProviderCompanies(companiesData.provider_companies || []);
        setServiceRanges(rangesData.ranges || []);
      } catch (err) {
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const fetchCompanySubscriptions = async (companyId) => {
    if (!companyId || subscriptionCache[companyId]) return;

    try {
      const res = await fetch(`${API}/provider-companies/${companyId}/subscriptions`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحميل الاشتراكات');
      }

      setSubscriptionCache((prev) => ({
        ...prev,
        [companyId]: data.subscriptions || [],
      }));
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحميل الاشتراكات');
    }
  };

  const getSubscriptionsForRow = (companyId, serviceType, itemCategory) => {
    const all = subscriptionCache[companyId] || [];
    return all.filter(
      (sub) => sub.service_type === serviceType && sub.item_category === itemCategory
    );
  };

  const updateRow = (setter, index, field, value) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRow = (setter, factory) => setter((prev) => [...prev, factory()]);
  const removeRow = (setter, index) =>
    setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handleSubscriptionCompanyChange = async (
    setter,
    index,
    companyId,
    serviceType,
    itemCategory
  ) => {
    await fetchCompanySubscriptions(companyId);

    setter((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        provider_company_id: companyId,
        subscription_id: '',
        unit_price: 0,
      };
      return next;
    });
  };

  const handleSubscriptionSelect = (setter, index, companyId, subscriptionId) => {
    const subs = subscriptionCache[companyId] || [];
    const selected = subs.find((sub) => String(sub.id) === String(subscriptionId));

    setter((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        subscription_id: subscriptionId,
        unit_price: selected ? Number(selected.price || 0) : 0,
      };
      return next;
    });
  };

  const handleBundleTypeChange = (index, value) => {
    setWirelessBundleRows((prev) => {
      const next = [...prev];
      const current = next[index];

      next[index] = {
        ...current,
        bundle_type: value,
        quantity: '',
        provider_company_id: '',
        subscription_id: '',
        amount: '',
        unit_price: 0,
      };

      return next;
    });
  };

  const handleRangeAmountChange = (index, amount) => {
    setWirelessBundleRows((prev) => {
      const next = [...prev];
      const current = next[index];
      const unitPrice = getRangePrice(serviceRanges, current.bundle_type, amount);

      next[index] = {
        ...current,
        amount,
        unit_price: unitPrice,
      };

      return next;
    });
  };

  const wirelessLineTotal = useMemo(
    () =>
      wirelessLineRows.reduce(
        (sum, row) => sum + rowTotal(row.quantity, row.unit_price),
        0
      ),
    [wirelessLineRows]
  );

  const ftthTotal = useMemo(
    () =>
      ftthLineRows.reduce((sum, row) => sum + rowTotal(row.quantity, row.unit_price), 0),
    [ftthLineRows]
  );

  const wirelessBundleTotal = useMemo(
    () =>
      wirelessBundleRows.reduce((sum, row) => {
        if (row.bundle_type === 'انترنت') {
          return sum + rowTotal(row.quantity, row.unit_price);
        }
        return sum + toNumber(row.unit_price || 0);
      }, 0),
    [wirelessBundleRows]
  );

  const otherTotal = useMemo(
    () =>
      otherRows.reduce(
        (sum, row) => sum + rowTotal(row.quantity, row.unit_price),
        0
      ),
    [otherRows]
  );

  const grandTotal = useMemo(
    () => wirelessLineTotal + wirelessBundleTotal + ftthTotal + otherTotal,
    [wirelessLineTotal, wirelessBundleTotal, ftthTotal, otherTotal]
  );

  const createService = async (orgId, serviceType, amount) => {
    const serviceNotes = `عائدية الاجهزة: ${deviceChoice}`;

    const res = await fetch(`${API}/organizations/${orgId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type: serviceType,
        payment_method: paymentMethod,
        device_ownership: mapDeviceChoiceToBackend(deviceChoice),
        annual_amount: amount,
        due_date: contractDate,
        notes: serviceNotes,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `فشل إنشاء خدمة ${serviceType}`);
    }

    return data.service;
  };

  const createServiceItem = async (serviceId, payload) => {
    const res = await fetch(`${API}/organization-services/${serviceId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'فشل إنشاء عنصر الخدمة');
    }

    return data.service_item;
  };

  const validateBeforeSave = () => {
    if (!organizationId) {
      return 'لم يتم استلام المنظمة من AddPage.jsx';
    }

    if (!contractDate) {
      return 'يرجى اختيار تاريخ العقد';
    }

    if (!wireless && !ftth && !optical && !other) {
      return 'يرجى اختيار خدمة واحدة على الأقل';
    }

    if (wireless && !wirelessLine && !wirelessBundle) {
      return 'خدمة Wireless تحتاج اختيار خط أو حزمة';
    }

    if (wireless && wirelessLine) {
      for (const row of wirelessLineRows) {
        if (!row.quantity || !row.provider_company_id || !row.subscription_id) {
          return 'يرجى إكمال جميع حقول خطوط Wireless';
        }
      }
    }

    if (ftth) {
      for (const row of ftthLineRows) {
        if (!row.quantity || !row.provider_company_id || !row.subscription_id) {
          return 'يرجى إكمال جميع حقول FTTH';
        }
      }
    }

    if (wireless && wirelessBundle) {
      for (const row of wirelessBundleRows) {
        if (!row.bundle_type) {
          return 'يرجى اختيار نوع الحزمة';
        }

        if (row.bundle_type === 'انترنت') {
          if (!row.quantity || !row.provider_company_id || !row.subscription_id) {
            return 'يرجى إكمال جميع حقول حزم الانترنت';
          }
        } else {
          if (!row.amount) {
            return `يرجى إدخال مقدار الحزمة لخدمة ${row.bundle_type}`;
          }
          if (!row.unit_price) {
            return `لا يوجد سعر مطابق في الرينجات لخدمة ${row.bundle_type}`;
          }
        }
      }
    }

    if (other) {
      for (const row of otherRows) {
        if (!row.service_name || !row.quantity || row.unit_price === '') {
          return 'يرجى إكمال جميع حقول خدمة أخرى';
        }
      }
    }

    return '';
  };

  const handleDone = async () => {
    const validationMessage = validateBeforeSave();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    if (optical) {
      alert('خدمة Optical غير مفعلة بعد في هذا الكود. أزل التحديد عنها حالياً أو نكملها لاحقاً.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (wireless) {
        const wirelessAmount = wirelessLineTotal + wirelessBundleTotal;
        const wirelessService = await createService(
          organizationId,
          'Wireless',
          wirelessAmount
        );

        if (wirelessLine) {
          for (const row of wirelessLineRows) {
            const companyId = row.provider_company_id;
            const sub = (subscriptionCache[companyId] || []).find(
              (s) => String(s.id) === String(row.subscription_id)
            );

            await createServiceItem(wirelessService.id, {
              item_category: 'Line',
              provider_company_id: companyId,
              item_name: sub?.item_name || 'Wireless Line',
              line_type: sub?.item_name || '',
              quantity: toNumber(row.quantity),
              unit_price: toNumber(row.unit_price),
              notes: `Wireless Line`,
            });
          }
        }

        if (wirelessBundle) {
          for (const row of wirelessBundleRows) {
            if (row.bundle_type === 'انترنت') {
              const companyId = row.provider_company_id;
              const sub = (subscriptionCache[companyId] || []).find(
                (s) => String(s.id) === String(row.subscription_id)
              );

              await createServiceItem(wirelessService.id, {
                item_category: 'Bundle',
                provider_company_id: companyId,
                item_name: sub?.item_name || 'Wireless Internet Bundle',
                bundle_type: 'انترنت',
                quantity: toNumber(row.quantity),
                unit_price: toNumber(row.unit_price),
                notes: `Wireless Bundle - انترنت`,
              });
            } else {
              await createServiceItem(wirelessService.id, {
                item_category: 'Bundle',
                item_name: `${row.bundle_type} - ${row.amount}`,
                bundle_type: row.bundle_type,
                quantity: 1,
                unit_price: toNumber(row.unit_price),
                notes: `مقدار الحزمة: ${row.amount}`,
              });
            }
          }
        }
      }

      if (ftth) {
        const ftthService = await createService(organizationId, 'FTTH', ftthTotal);

        for (const row of ftthLineRows) {
          const companyId = row.provider_company_id;
          const sub = (subscriptionCache[companyId] || []).find(
            (s) => String(s.id) === String(row.subscription_id)
          );

          await createServiceItem(ftthService.id, {
            item_category: 'Line',
            provider_company_id: companyId,
            item_name: sub?.item_name || 'FTTH Line',
            line_type: sub?.item_name || '',
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            notes: `FTTH Line`,
          });
        }
      }

      if (other) {
        const otherService = await createService(organizationId, 'Other', otherTotal);

        for (const row of otherRows) {
          await createServiceItem(otherService.id, {
            item_category: 'Other',
            item_name: row.service_name,
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            notes: `Custom service`,
          });
        }
      }

      alert('تم حفظ العقد بنجاح');
      navigate(`/detail/${organizationId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء حفظ العقد');
      alert(err.message || 'حدث خطأ أثناء حفظ العقد');
    } finally {
      setSaving(false);
    }
  };

  const renderProviderOptions = () => (
    <>
      <option value="">اختر الشركة</option>
      {providerCompanies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </>
  );

  const renderSubscriptionOptions = (companyId, serviceType, itemCategory) => {
    const subs = getSubscriptionsForRow(companyId, serviceType, itemCategory);

    return (
      <>
        <option value="">اختر نوع الاشتراك</option>
        {subs.map((sub) => (
          <option key={sub.id} value={sub.id}>
            {sub.item_name}
          </option>
        ))}
      </>
    );
  };

  const subscriptionPriceFromCache = (companyId, subId) => {
    const sub = (subscriptionCache[companyId] || []).find(
      (item) => String(item.id) === String(subId)
    );
    return Number(sub?.price || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 mb-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">عقد جديد</h1>
            <p className="text-base sm:text-lg opacity-90">
              {organizationName ? `المنظمة: ${organizationName}` : 'لم يتم تحديد المنظمة'}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {organizationId ? `ID: ${organizationId}` : 'يرجى تمرير organizationId من AddPage.jsx'}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-600">جاري تحميل البيانات...</div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">نوع الخدمة</h2>

                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'Wireless', value: wireless, setter: setWireless },
                    { label: 'FTTH', value: ftth, setter: setFtth },
                    { label: 'Optical', value: optical, setter: setOptical },
                    { label: 'اخرى', value: other, setter: setOther },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        item.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:bg-blue-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.value}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ml-3 font-medium text-gray-900">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {wireless && (
                <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Wireless</h3>

                  <div className="flex flex-wrap gap-4 mb-6">
                    <label
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                        wirelessLine
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={wirelessLine}
                        onChange={(e) => setWirelessLine(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ml-3 font-medium">خط</span>
                    </label>

                    <label
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                        wirelessBundle
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={wirelessBundle}
                        onChange={(e) => setWirelessBundle(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ml-3 font-medium">حزمة</span>
                    </label>
                  </div>

                  {wirelessLine && (
                    <div className="mb-8 p-4 bg-white rounded-lg shadow-sm">
                      <h4 className="font-semibold text-lg mb-4">Wireless - خط</h4>

                      {wirelessLineRows.map((row, index) => {
                        const currentUnitPrice = subscriptionPriceFromCache(
                          row.provider_company_id,
                          row.subscription_id
                        );
                        const currentTotal = rowTotal(row.quantity, currentUnitPrice);

                        return (
                          <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">عدد الخطوط</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    updateRow(setWirelessLineRows, index, 'quantity', e.target.value)
                                  }
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">الشركة</label>
                                <select
                                  value={row.provider_company_id}
                                  onChange={(e) =>
                                    handleSubscriptionCompanyChange(
                                      setWirelessLineRows,
                                      index,
                                      e.target.value,
                                      'Wireless',
                                      'Line'
                                    )
                                  }
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                                >
                                  {renderProviderOptions()}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">نوع الاشتراك</label>
                                <select
                                  value={row.subscription_id}
                                  onChange={(e) =>
                                    handleSubscriptionSelect(
                                      setWirelessLineRows,
                                      index,
                                      row.provider_company_id,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                                  disabled={!row.provider_company_id}
                                >
                                  {renderSubscriptionOptions(
                                    row.provider_company_id,
                                    'Wireless',
                                    'Line'
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">سعر الاشتراك</label>
                                <input
                                  type="number"
                                  readOnly
                                  value={currentUnitPrice}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">المجموع</label>
                                <input
                                  type="number"
                                  readOnly
                                  value={formatMoney(currentTotal)}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addRow(setWirelessLineRows, emptySubscriptionRow)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                اضافة خط اخر
                              </button>

                              {wirelessLineRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRow(setWirelessLineRows, index)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                  حذف
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {wirelessBundle && (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <h4 className="font-semibold text-lg mb-4">Wireless - حزمة</h4>

                      {wirelessBundleRows.map((row, index) => {
                        const internetUnitPrice = subscriptionPriceFromCache(
                          row.provider_company_id,
                          row.subscription_id
                        );

                        const currentTotal =
                          row.bundle_type === 'انترنت'
                            ? rowTotal(row.quantity, internetUnitPrice)
                            : toNumber(row.unit_price);

                        return (
                          <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">نوع الحزمة</label>
                              <select
                                value={row.bundle_type}
                                onChange={(e) => handleBundleTypeChange(index, e.target.value)}
                                className="w-full md:w-72 px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                              >
                                <option value="">اختر نوع الحزمة</option>
                                {WIRELESS_BUNDLE_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {row.bundle_type === 'انترنت' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">عدد الخطوط</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.quantity}
                                    onChange={(e) =>
                                      updateRow(
                                        setWirelessBundleRows,
                                        index,
                                        'quantity',
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">الشركة</label>
                                  <select
                                    value={row.provider_company_id}
                                    onChange={(e) =>
                                      handleSubscriptionCompanyChange(
                                        setWirelessBundleRows,
                                        index,
                                        e.target.value,
                                        'Wireless',
                                        'Bundle'
                                      )
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                                  >
                                    {renderProviderOptions()}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">نوع الاشتراك</label>
                                  <select
                                    value={row.subscription_id}
                                    onChange={(e) =>
                                      handleSubscriptionSelect(
                                        setWirelessBundleRows,
                                        index,
                                        row.provider_company_id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                                    disabled={!row.provider_company_id}
                                  >
                                    {renderSubscriptionOptions(
                                      row.provider_company_id,
                                      'Wireless',
                                      'Bundle'
                                    )}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">سعر الاشتراك</label>
                                  <input
                                    type="number"
                                    readOnly
                                    value={internetUnitPrice}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">المجموع</label>
                                  <input
                                    type="number"
                                    readOnly
                                    value={formatMoney(currentTotal)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                                  />
                                </div>
                              </div>
                            )}

                            {row.bundle_type &&
                              row.bundle_type !== 'انترنت' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-2">
                                      مقدار الحزمة
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={row.amount}
                                      onChange={(e) =>
                                        handleRangeAmountChange(index, e.target.value)
                                      }
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium mb-2">
                                      سعر الحزمة
                                    </label>
                                    <input
                                      type="number"
                                      readOnly
                                      value={row.unit_price}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium mb-2">المجموع</label>
                                    <input
                                      type="number"
                                      readOnly
                                      value={formatMoney(currentTotal)}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                                    />
                                  </div>
                                </div>
                              )}

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addRow(setWirelessBundleRows, emptyBundleRow)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                اضافة حزمة اخرى
                              </button>

                              {wirelessBundleRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRow(setWirelessBundleRows, index)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                  حذف
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {ftth && (
                <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">FTTH - خط</h3>

                  {ftthLineRows.map((row, index) => {
                    const currentUnitPrice = subscriptionPriceFromCache(
                      row.provider_company_id,
                      row.subscription_id
                    );
                    const currentTotal = rowTotal(row.quantity, currentUnitPrice);

                    return (
                      <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">عدد الخطوط</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(setFtthLineRows, index, 'quantity', e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">الشركة</label>
                            <select
                              value={row.provider_company_id}
                              onChange={(e) =>
                                handleSubscriptionCompanyChange(
                                  setFtthLineRows,
                                  index,
                                  e.target.value,
                                  'FTTH',
                                  'Line'
                                )
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                            >
                              {renderProviderOptions()}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">نوع الاشتراك</label>
                            <select
                              value={row.subscription_id}
                              onChange={(e) =>
                                handleSubscriptionSelect(
                                  setFtthLineRows,
                                  index,
                                  row.provider_company_id,
                                  e.target.value
                                )
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                              disabled={!row.provider_company_id}
                            >
                              {renderSubscriptionOptions(
                                row.provider_company_id,
                                'FTTH',
                                'Line'
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">سعر الاشتراك</label>
                            <input
                              type="number"
                              readOnly
                              value={currentUnitPrice}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">المجموع</label>
                            <input
                              type="number"
                              readOnly
                              value={formatMoney(currentTotal)}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addRow(setFtthLineRows, emptySubscriptionRow)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            اضافة خط اخر
                          </button>

                          {ftthLineRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(setFtthLineRows, index)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {optical && (
                <div className="mb-8 border-2 border-amber-200 rounded-xl p-6 bg-amber-50">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Optical</h3>
                  <p className="text-amber-700">
                    هذا القسم محجوز مؤقتاً لأنك قلت Optical coming soon.
                  </p>
                </div>
              )}

              {other && (
                <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">اخرى</h3>

                  {otherRows.map((row, index) => {
                    const currentTotal = rowTotal(row.quantity, row.unit_price);

                    return (
                      <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">اسم الخدمة</label>
                            <input
                              type="text"
                              value={row.service_name}
                              onChange={(e) =>
                                updateRow(setOtherRows, index, 'service_name', e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">عدد الخدمة</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(setOtherRows, index, 'quantity', e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">سعر الخدمة</label>
                            <input
                              type="number"
                              min="0"
                              value={row.unit_price}
                              onChange={(e) =>
                                updateRow(setOtherRows, index, 'unit_price', e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">المجموع</label>
                            <input
                              type="number"
                              readOnly
                              value={formatMoney(currentTotal)}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addRow(setOtherRows, emptyOtherRow)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            اضافة خدمة اخرى
                          </button>

                          {otherRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(setOtherRows, index)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">تفاصيل العقد</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عائدية الاجهزة
                    </label>
                    <select
                      value={deviceChoice}
                      onChange={(e) => setDeviceChoice(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                    >
                      {DEVICE_UI_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      آلية الدفع
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
                    >
                      {PAYMENT_METHODS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ العقد
                    </label>
                    <input
                      type="date"
                      value={contractDate}
                      onChange={(e) => setContractDate(e.target.value)}
                      disabled={useCurrentDate}
                      className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg ${
                        useCurrentDate ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المجموع الكلي
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={formatMoney(grandTotal)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 font-semibold"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-3 mb-6">
                  <input
                    type="checkbox"
                    checked={useCurrentDate}
                    onChange={(e) => {
                      setUseCurrentDate(e.target.checked);
                      if (e.target.checked) {
                        setContractDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="text-gray-800 font-medium">استخدام تاريخ اليوم تلقائياً</span>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDone}
                    disabled={saving}
                    className={`px-6 py-3 rounded-lg text-white font-semibold ${
                      saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ العقد'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    disabled={saving}
                    className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
                  >
                    رجوع
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewContractPage;
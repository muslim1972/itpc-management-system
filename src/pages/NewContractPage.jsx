import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import PageFooter from '../components/PageFooter';

const API = '/api';

const WIRELESS_BUNDLE_TYPES = ['انترنت', 'انترانيت', 'دولي', 'fna', 'gcc', 'LTE'];
const PAYMENT_METHODS = ['يومي', 'شهري', 'كل 3 أشهر', 'سنوي'];
const CONTRACT_DURATION_UNITS = ['يومي', 'شهري', 'سنوي'];
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
  total_price: 0,
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

const addMonthsToDate = (dateString, monthsToAdd) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const result = new Date(date);
  result.setMonth(result.getMonth() + monthsToAdd);
  return result.toISOString().split('T')[0];
};

const addDaysToDate = (dateString, daysToAdd) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const result = new Date(date);
  result.setDate(result.getDate() + Number(daysToAdd || 0));
  return result.toISOString().split('T')[0];
};

const calculateContractTotal = (baseMonthlyPrice, durationUnit, durationValue) => {
  const base = Number(baseMonthlyPrice || 0);
  const value = Number(durationValue || 1);

  if (!value || value < 1) return base;

  if (durationUnit === 'يومي') {
    return (base / 30) * value;
  }

  if (durationUnit === 'شهري') {
    return base * value;
  }

  if (durationUnit === 'سنوي') {
    return base * 12 * value;
  }

  return base;
};

const calculateNextDueDate = (baseDate, paymentMethod, paymentIntervalDays) => {
  if (!baseDate) return '';

  if (paymentMethod === 'يومي') {
    return addDaysToDate(baseDate, paymentIntervalDays || 1);
  }

  if (paymentMethod === 'شهري') {
    return addMonthsToDate(baseDate, 1);
  }

  if (paymentMethod === 'كل 3 أشهر') {
    return addMonthsToDate(baseDate, 3);
  }

  if (paymentMethod === 'سنوي') {
    return addMonthsToDate(baseDate, 12);
  }

  return '';
};

const mapDeviceChoiceToBackend = (value) => {
  if (value === 'ايجار') return 'الشركة';
  return 'المنظمة';
};

const getRangePricing = (ranges, serviceName, amount) => {
  const numericAmount = parseInt(amount, 10);

  if (!numericAmount || !serviceName) {
    return { unitPrice: 0, totalPrice: 0 };
  }

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

  if (!matched) {
    return { unitPrice: 0, totalPrice: 0 };
  }

  const unitPrice = Number(matched.price || 0);
  const totalPrice = numericAmount * unitPrice;

  return { unitPrice, totalPrice };
};

const rowTotal = (quantity, unitPrice) => toNumber(quantity) * toNumber(unitPrice);

const NewContractPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [organizations, setOrganizations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const loadOrganizations = async () => {
    try {
      const res = await fetch(`${API}/organizations`);
      const data = await res.json();
      if (res.ok) {
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const filteredOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(org => 
      (org.name || '').toLowerCase().includes(q) ||
      (org.phone || '').toLowerCase().includes(q) ||
      (org.location || '').toLowerCase().includes(q)
    );
  }, [organizations, search]);

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
  const [opticalLineRows, setOpticalLineRows] = useState([emptySubscriptionRow()]);
  const [wirelessBundleRows, setWirelessBundleRows] = useState([emptyBundleRow()]);
  const [otherRows, setOtherRows] = useState([emptyOtherRow()]);

  const [paymentMethod, setPaymentMethod] = useState('شهري');
  const [deviceChoice, setDeviceChoice] = useState('مدفوع الثمن');
  const [useCurrentDate, setUseCurrentDate] = useState(true);
  const [contractDate, setContractDate] = useState('');
  const [contractDurationUnit, setContractDurationUnit] = useState('شهري');
  const [contractDurationValue, setContractDurationValue] = useState(1);
  const [paymentIntervalDays, setPaymentIntervalDays] = useState(1);
  const [officialBookDate, setOfficialBookDate] = useState('');
  const [officialBookDescription, setOfficialBookDescription] = useState('');

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
    if (!itemCategory) return all.filter(sub => sub.service_type === serviceType);
    const categories = Array.isArray(itemCategory) ? itemCategory : [itemCategory];
    return all.filter(
      (sub) => sub.service_type === serviceType && categories.includes(sub.item_category)
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

      if ('total_price' in next[index]) {
        next[index].total_price = 0;
      }

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

      if ('total_price' in next[index] && next[index].bundle_type === 'انترنت') {
        next[index].total_price = rowTotal(next[index].quantity, next[index].unit_price);
      }

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
        total_price: 0,
      };

      return next;
    });
  };

  const handleInternetBundleQuantityChange = (index, quantity) => {
    setWirelessBundleRows((prev) => {
      const next = [...prev];
      const current = next[index];
      const internetUnitPrice =
        current.provider_company_id && current.subscription_id
          ? Number(
              (
                (subscriptionCache[current.provider_company_id] || []).find(
                  (sub) => String(sub.id) === String(current.subscription_id)
                ) || {}
              ).price || 0
            )
          : 0;

      next[index] = {
        ...current,
        quantity,
        total_price: rowTotal(quantity, internetUnitPrice),
      };

      return next;
    });
  };

  const handleRangeAmountChange = (index, amount) => {
    setWirelessBundleRows((prev) => {
      const next = [...prev];
      const current = next[index];
      const pricing = getRangePricing(serviceRanges, current.bundle_type, amount);

      next[index] = {
        ...current,
        amount,
        quantity: amount,
        unit_price: pricing.unitPrice,
        total_price: pricing.totalPrice,
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

  const opticalTotal = useMemo(
    () =>
      opticalLineRows.reduce((sum, row) => sum + rowTotal(row.quantity, row.unit_price), 0),
    [opticalLineRows]
  );

  const wirelessBundleTotal = useMemo(
    () =>
      wirelessBundleRows.reduce((sum, row) => {
        if (row.bundle_type === 'انترنت') {
          return sum + rowTotal(row.quantity, row.unit_price);
        }
        return sum + toNumber(row.total_price || 0);
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

  const wirelessBaseMonthlyTotal = useMemo(
    () => wirelessLineTotal + wirelessBundleTotal,
    [wirelessLineTotal, wirelessBundleTotal]
  );

  const wirelessContractTotal = useMemo(
    () => calculateContractTotal(wirelessBaseMonthlyTotal, contractDurationUnit, contractDurationValue),
    [wirelessBaseMonthlyTotal, contractDurationUnit, contractDurationValue]
  );

  const ftthContractTotal = useMemo(
    () => calculateContractTotal(ftthTotal, contractDurationUnit, contractDurationValue),
    [ftthTotal, contractDurationUnit, contractDurationValue]
  );

  const opticalContractTotal = useMemo(
    () => calculateContractTotal(opticalTotal, contractDurationUnit, contractDurationValue),
    [opticalTotal, contractDurationUnit, contractDurationValue]
  );

  const otherContractTotal = useMemo(
    () => calculateContractTotal(otherTotal, contractDurationUnit, contractDurationValue),
    [otherTotal, contractDurationUnit, contractDurationValue]
  );

  const baseMonthlyTotal = useMemo(
    () => wirelessBaseMonthlyTotal + ftthTotal + opticalTotal + otherTotal,
    [wirelessBaseMonthlyTotal, ftthTotal, opticalTotal, otherTotal]
  );

  const grandTotal = useMemo(
    () => wirelessContractTotal + ftthContractTotal + opticalContractTotal + otherContractTotal,
    [wirelessContractTotal, ftthContractTotal, opticalContractTotal, otherContractTotal]
  );

  const resolvedDueDate = useMemo(
    () => calculateNextDueDate(contractDate, paymentMethod, paymentIntervalDays),
    [contractDate, paymentMethod, paymentIntervalDays]
  );

  const createService = async (orgId, serviceType, amount) => {
    const serviceNotes = `عائدية الاجهزة: ${deviceChoice}`;

    const res = await fetch(`${API}/organizations/${orgId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type: serviceType,
        payment_method: paymentMethod,
        payment_interval_days: paymentMethod === 'يومي' ? Number(paymentIntervalDays || 1) : 1,
        device_ownership: mapDeviceChoiceToBackend(deviceChoice),
        annual_amount: Number(amount || 0),
        contract_created_at: contractDate,
        contract_duration_unit: contractDurationUnit,
        contract_duration_value: Number(contractDurationValue || 1),
        due_date: resolvedDueDate,
        notes: serviceNotes,
        official_book_date: officialBookDate,
        official_book_description: officialBookDescription.trim(),
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

    if (!officialBookDate) {
      return 'يرجى اختيار تاريخ الكتاب الرسمي';
    }

    if (!officialBookDescription.trim()) {
      return 'يرجى إدخال وصف الكتاب الرسمي';
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

    if (optical) {
      for (const row of opticalLineRows) {
        if (!row.quantity || !row.provider_company_id || !row.subscription_id) {
          return 'يرجى إكمال جميع حقول Optical';
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
          if (!row.unit_price || !row.total_price) {
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

    if (!contractDurationValue || Number(contractDurationValue) < 1) {
      return 'يرجى إدخال مدة العقد بشكل صحيح';
    }

    if (paymentMethod === 'يومي' && (!paymentIntervalDays || Number(paymentIntervalDays) < 1)) {
      return 'يرجى إدخال عدد الأيام لآلية الدفع اليومي';
    }

    return '';
  };

  const handleDone = async () => {
    const validationMessage = validateBeforeSave();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (wireless) {
        const wirelessAmount = wirelessContractTotal;
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
              notes: 'Wireless Line',
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
                notes: 'Wireless Bundle - انترنت',
              });
            } else {
              await createServiceItem(wirelessService.id, {
                item_category: 'Bundle',
                item_name: `${row.bundle_type} - ${row.amount}`,
                bundle_type: row.bundle_type,
                quantity: toNumber(row.amount),
                unit_price: toNumber(row.unit_price),
                notes: `مقدار الحزمة: ${row.amount} | المجموع: ${row.total_price}`,
              });
            }
          }
        }
      }

      if (ftth) {
        const ftthService = await createService(
          organizationId,
          'FTTH',
          calculateContractTotal(ftthTotal, contractDurationUnit, contractDurationValue)
        );

        for (const row of ftthLineRows) {
          const companyId = row.provider_company_id;
          const sub = (subscriptionCache[companyId] || []).find(
            (s) => String(s.id) === String(row.subscription_id)
          );

          await createServiceItem(ftthService.id, {
            item_category: sub?.item_category || 'Line',
            provider_company_id: companyId,
            item_name: sub?.item_name || 'FTTH Line',
            line_type: sub?.item_name || '',
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            notes: 'FTTH Line',
          });
        }
      }

      if (optical) {
        const opticalService = await createService(
          organizationId,
          'Optical',
          calculateContractTotal(opticalTotal, contractDurationUnit, contractDurationValue)
        );

        for (const row of opticalLineRows) {
          const companyId = row.provider_company_id;
          const sub = (subscriptionCache[companyId] || []).find(
            (s) => String(s.id) === String(row.subscription_id)
          );

          await createServiceItem(opticalService.id, {
            item_category: sub?.item_category || 'Line',
            provider_company_id: companyId,
            item_name: sub?.item_name || 'Optical Line',
            line_type: sub?.item_name || '',
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            notes: 'Optical Line',
          });
        }
      }

      if (other) {
        const otherService = await createService(
          organizationId,
          'Other',
          calculateContractTotal(otherTotal, contractDurationUnit, contractDurationValue)
        );

        for (const row of otherRows) {
          await createServiceItem(otherService.id, {
            item_category: 'Other',
            item_name: row.service_name,
            quantity: toNumber(row.quantity),
            unit_price: toNumber(row.unit_price),
            notes: 'Custom service',
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
    <div className="app-shell" dir="rtl">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="page-container space-y-6">
        {/* Floating Back Button - Left Side */}
        <div className="fixed top-[72px] left-6 z-40">
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

        <div className="surface-card p-6 sm:p-8">
        <section className="rounded-[28px] bg-emerald-600 p-6 shadow-lg text-white mb-4">
          <h1 className="text-3xl font-bold">إضافة عقود</h1>
        </section>

        {!organizationId && (
          <section className="flex items-center justify-between px-6 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
            <span className="text-sm font-semibold text-slate-500">الجهات المتاحة :</span>
            <span className="text-lg font-bold text-emerald-600">{organizations.length}</span>
          </section>
        )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="empty-state">جاري تحميل البيانات...</div>
          ) : (
            <>
              {!organizationId ? (
                <div className="space-y-6">
                  <div className="surface-card p-5 border border-slate-100 shadow-sm">
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
                  </div>

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
                                onClick={() => navigate('/new-contract', { state: { organizationId: org.id, organizationName: org.name } })}
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
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">نوع الخدمة</h2>

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
                          : 'border-slate-200 bg-white hover:bg-blue-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.value}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ms-3 font-medium text-slate-900">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {wireless && (
                <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Wireless</h3>

                  <div className="flex flex-wrap gap-4 mb-6">
                    <label
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                        wirelessLine
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={wirelessLine}
                        onChange={(e) => setWirelessLine(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ms-3 font-medium">خط</span>
                    </label>

                    <label
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                        wirelessBundle
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={wirelessBundle}
                        onChange={(e) => setWirelessBundle(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="ms-3 font-medium">حزمة</span>
                    </label>
                  </div>

                  {wirelessLine && (
                    <div className="mb-8 p-4 surface-card-soft">
                      <h4 className="font-semibold text-lg mb-4">Wireless - خط</h4>

                      {wirelessLineRows.map((row, index) => {
                        const currentUnitPrice = subscriptionPriceFromCache(
                          row.provider_company_id,
                          row.subscription_id
                        );
                        const currentTotal = rowTotal(row.quantity, currentUnitPrice);

                        return (
                          <div key={index} className="mb-4 p-4 soft-panel">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 w-28 shrink-0">عدد الخطوط</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    updateRow(setWirelessLineRows, index, 'quantity', e.target.value)
                                  }
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg flex-1"
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 w-28 shrink-0">الشركة</label>
                                <select
                                  value={row.provider_company_id}
                                  onChange={(e) =>
                                    handleSubscriptionCompanyChange(
                                      setWirelessLineRows,
                                      index,
                                      e.target.value,
                                      'Wireless',
                                      null
                                    )
                                  }
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                                >
                                  {renderProviderOptions()}
                                </select>
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 w-28 shrink-0">نوع الاشتراك</label>
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
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                                  disabled={!row.provider_company_id}
                                >
                                  {renderSubscriptionOptions(
                                    row.provider_company_id,
                                    'Wireless',
                                    null
                                  )}
                                </select>
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 w-28 shrink-0">سعر الاشتراك</label>
                                <input
                                  type="number"
                                  readOnly
                                  value={currentUnitPrice}
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 flex-1"
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-700 w-28 shrink-0">المجموع</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={formatMoney(currentTotal)}
                                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 flex-1"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addRow(setWirelessLineRows, emptySubscriptionRow)}
                                className="btn-success px-4 py-2.5 text-sm hover:bg-green-700"
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
                    <div className="p-4 surface-card-soft">
                      <h4 className="font-semibold text-lg mb-4">Wireless - حزمة</h4>

                      {wirelessBundleRows.map((row, index) => {
                        const internetUnitPrice = subscriptionPriceFromCache(
                          row.provider_company_id,
                          row.subscription_id
                        );

                        const currentTotal =
                          row.bundle_type === 'انترنت'
                            ? rowTotal(row.quantity, internetUnitPrice)
                            : toNumber(row.total_price);

                        return (
                          <div key={index} className="mb-4 p-4 soft-panel">
                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">نوع الحزمة</label>
                              <select
                                value={row.bundle_type}
                                onChange={(e) => handleBundleTypeChange(index, e.target.value)}
                                className="w-full md:w-72 px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
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
                                      handleInternetBundleQuantityChange(index, e.target.value)
                                    }
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                                        null
                                      )
                                    }
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
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
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
                                    disabled={!row.provider_company_id}
                                  >
                                    {renderSubscriptionOptions(
                                      row.provider_company_id,
                                      'Wireless',
                                      null
                                    )}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">سعر الاشتراك</label>
                                  <input
                                    type="number"
                                    readOnly
                                    value={internetUnitPrice}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">المجموع</label>
                                  <input
                                    type="number"
                                    readOnly
                                    value={formatMoney(currentTotal)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                                  />
                                </div>
                              </div>
                            )}

                            {row.bundle_type && row.bundle_type !== 'انترنت' && (
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
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">
                                    سعر الـ Mb
                                  </label>
                                  <input
                                    type="number"
                                    readOnly
                                    value={row.unit_price}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">المجموع</label>
                                  <input
                                    type="number"
                                    readOnly
                                    value={formatMoney(currentTotal)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addRow(setWirelessBundleRows, emptyBundleRow)}
                                className="btn-success px-4 py-2.5 text-sm hover:bg-green-700"
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
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">FTTH - خط</h3>

                  {ftthLineRows.map((row, index) => {
                    const currentUnitPrice = subscriptionPriceFromCache(
                      row.provider_company_id,
                      row.subscription_id
                    );
                    const currentTotal = rowTotal(row.quantity, currentUnitPrice);

                    return (
                      <div key={index} className="mb-4 p-4 surface-card-soft">
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
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                                  null
                                )
                              }
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
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
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
                              disabled={!row.provider_company_id}
                            >
                              {renderSubscriptionOptions(
                                row.provider_company_id,
                                'FTTH',
                                null
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">سعر الاشتراك</label>
                            <input
                              type="number"
                              readOnly
                              value={currentUnitPrice}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">المجموع</label>
                            <input
                              type="number"
                              readOnly
                              value={formatMoney(currentTotal)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addRow(setFtthLineRows, emptySubscriptionRow)}
                            className="btn-success px-4 py-2.5 text-sm hover:bg-green-700"
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
                <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Optical - خط</h3>

                  {opticalLineRows.map((row, index) => {
                    const currentUnitPrice = subscriptionPriceFromCache(
                      row.provider_company_id,
                      row.subscription_id
                    );
                    const currentTotal = rowTotal(row.quantity, currentUnitPrice);

                    return (
                      <div key={index} className="mb-4 p-4 surface-card-soft">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">عدد الخطوط</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(setOpticalLineRows, index, 'quantity', e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">الشركة</label>
                            <select
                              value={row.provider_company_id}
                              onChange={(e) =>
                                handleSubscriptionCompanyChange(
                                  setOpticalLineRows,
                                  index,
                                  e.target.value,
                                  'Optical',
                                  null
                                )
                              }
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
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
                                  setOpticalLineRows,
                                  index,
                                  row.provider_company_id,
                                  e.target.value
                                )
                              }
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white"
                              disabled={!row.provider_company_id}
                            >
                              {renderSubscriptionOptions(
                                row.provider_company_id,
                                'Optical',
                                null
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">سعر الاشتراك</label>
                            <input
                              type="number"
                              readOnly
                              value={currentUnitPrice}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">المجموع</label>
                            <input
                              type="text"
                              readOnly
                              value={formatMoney(currentTotal)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addRow(setOpticalLineRows, emptySubscriptionRow)}
                            className="btn-success px-4 py-2.5 text-sm hover:bg-green-700"
                          >
                            اضافة خط اخر
                          </button>

                          {opticalLineRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(setOpticalLineRows, index)}
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

              {other && (
                <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">اخرى</h3>

                  {otherRows.map((row, index) => {
                    const currentTotal = rowTotal(row.quantity, row.unit_price);

                    return (
                      <div key={index} className="mb-4 p-4 surface-card-soft">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">اسم الخدمة</label>
                            <input
                              type="text"
                              value={row.service_name}
                              onChange={(e) =>
                                updateRow(setOtherRows, index, 'service_name', e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
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
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">المجموع</label>
                            <input
                              type="number"
                              readOnly
                              value={formatMoney(currentTotal)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addRow(setOtherRows, emptyOtherRow)}
                            className="btn-success px-4 py-2.5 text-sm hover:bg-green-700"
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

              <div className="border-2 border-slate-200 rounded-xl p-6 bg-slate-50/80">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">تفاصيل العقد</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">عائدية الاجهزة</label>
                    <select
                      value={deviceChoice}
                      onChange={(e) => setDeviceChoice(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                    >
                      {DEVICE_UI_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">آلية الدفع</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                    >
                      {PAYMENT_METHODS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {paymentMethod === 'يومي' && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-700 w-32 shrink-0">كل كم يوم؟</label>
                      <input
                        type="number"
                        min="1"
                        value={paymentIntervalDays}
                        onChange={(e) => setPaymentIntervalDays(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">تاريخ العقد</label>
                    <input
                      type="date"
                      value={contractDate}
                      onChange={(e) => setContractDate(e.target.value)}
                      disabled={useCurrentDate}
                      className={`w-full px-4 py-2 border border-slate-300 rounded-lg flex-1 ${
                        useCurrentDate ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">مدة العقد</label>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="العدد (مثلاً: 12)"
                        value={contractDurationValue}
                        onChange={(e) => setContractDurationValue(e.target.value)}
                        className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg bg-white text-center"
                      />
                      <select
                        value={contractDurationUnit}
                        onChange={(e) => setContractDurationUnit(e.target.value)}
                        className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        {CONTRACT_DURATION_UNITS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      readOnly
                      value={resolvedDueDate}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">تاريخ الكتاب الرسمي</label>
                    <input
                      type="date"
                      value={officialBookDate}
                      onChange={(e) => setOfficialBookDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">وصف الكتاب الرسمي</label>
                    <input
                      type="text"
                      value={officialBookDescription}
                      onChange={(e) => setOfficialBookDescription(e.target.value)}
                      placeholder="أدخل وصف الكتاب الرسمي"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">السع الشهري</label>
                    <input
                      type="text"
                      readOnly
                      value={formatMoney(baseMonthlyTotal)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 w-32 shrink-0">المجموع الكلي</label>
                    <input
                      type="text"
                      readOnly
                      value={formatMoney(grandTotal)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-indigo-50 border-indigo-200 text-indigo-700 font-bold flex-1"
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
                  <span className="text-slate-900 font-medium">استخدام تاريخ اليوم تلقائياً</span>
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
                    className="px-6 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50/80 font-semibold"
                  >
                    رجوع
                  </button>
                </div>
              </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
      <PageFooter />
    </div>
  );
};

export default NewContractPage;

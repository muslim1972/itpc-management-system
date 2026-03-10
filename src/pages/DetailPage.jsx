import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import { organizationsData } from '../data/organizationsData';

const DetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(null);

  // Get organization data - useParams id or passed state via navigation
  const orgData = organizationsData[id] || organizationsData[1];
  const companyName = orgData?.name || location.state?.companyName || null;

  // Mutable services list (can remove in edit mode)
  const [services, setServices] = useState([]);
  // Mutable subscription data per service (اشتراكات)
  const [subscriptionData, setSubscriptionData] = useState({});
  // Mutable address and phone
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // Initialize from orgData
  useEffect(() => {
    setServices(orgData.services || [orgData.نوعالتجهيز || 'FTTH']);
    setAddress(orgData.address || '');
    setPhone(orgData.phone || '');
    const initialSubs = {};
    const svcs = orgData.services || [orgData.نوعالتجهيز || 'FTTH'];
    svcs.forEach((serviceName) => {
      const sd = orgData.serviceData?.[serviceName];
      if (sd?.اشتراكات) {
        initialSubs[serviceName] = JSON.parse(JSON.stringify(sd.اشتراكات));
      } else {
        initialSubs[serviceName] = { خطوط: [], خط: [], حزمة: [] };
      }
    });
    setSubscriptionData(initialSubs);
  }, [id, orgData]);

  // Initialize state for each service (payment data)
  const initializeServiceState = (serviceName) => {
    const serviceInfo = orgData.serviceData?.[serviceName] || orgData;
    return {
      نوعالتجهيز: serviceInfo.نوعالتجهيز || serviceName,
      آليةالدفع: serviceInfo.آليةالدفع || 'شهري',
      عائديةالأجهزة: serviceInfo.عائديةالأجهزة || 'الشركة',
      المبلغالسنوي: serviceInfo.المبلغالسنوي || 0,
      المبلغالمسدد: serviceInfo.المبلغالمسدد || 0,
      المبلغالمستحق: serviceInfo.المبلغالمستحق || 0,
      تاريخالاستحقاق: serviceInfo.تاريخالاستحقاق || '',
      مبلغآخردفعة: serviceInfo.مبلغآخردفعة || 0,
      تاريخآخردفعة: serviceInfo.تاريخآخردفعة || '',
      دفعةجديدة: '',
      تاريخالدفع: '',
    };
  };

  const [servicesState, setServicesState] = useState(() => {
    const svcs = orgData.services || [orgData.نوعالتجهيز || 'FTTH'];
    const initialState = {};
    svcs.forEach((serviceName) => {
      initialState[serviceName] = initializeServiceState(serviceName);
    });
    return initialState;
  });

  useEffect(() => {
    const svcs = orgData.services || [orgData.نوعالتجهيز || 'FTTH'];
    setServicesState((prev) => {
      const next = { ...prev };
      svcs.forEach((sn) => {
        if (!next[sn]) next[sn] = initializeServiceState(sn);
      });
      return next;
    });
  }, [id]);

  const updateServiceState = (serviceName, updates) => {
    setServicesState((prev) => ({
      ...prev,
      [serviceName]: { ...prev[serviceName], ...updates },
    }));
  };

  const getServiceCalculations = (serviceState) => {
    const المبلغالشهري = serviceState.المبلغالسنوي / 12;
    const المبلغالمتبقي = serviceState.المبلغالسنوي - serviceState.المبلغالمسدد;
    let المبلغالمستحق = 0;
    if (serviceState.آليةالدفع === 'شهري') المبلغالمستحق = المبلغالشهري;
    else if (serviceState.آليةالدفع === 'كل 3 أشهر') المبلغالمستحق = المبلغالشهري * 3;
    else if (serviceState.آليةالدفع === 'سنوي') المبلغالمستحق = serviceState.المبلغالسنوي;
    return { المبلغالشهري, المبلغالمتبقي, المبلغالمستحق };
  };

  const handleUpdatePayment = (serviceName) => {
    const serviceState = servicesState[serviceName];
    if (!serviceState?.دفعةجديدة || !serviceState?.تاريخالدفع) {
      alert('يرجى إدخال المبلغ وتاريخ الدفع');
      return;
    }
    const paymentAmount = parseFloat(serviceState.دفعةجديدة);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }
    updateServiceState(serviceName, {
      المبلغالمسدد: serviceState.المبلغالمسدد + paymentAmount,
      مبلغآخردفعة: paymentAmount,
      تاريخآخردفعة: serviceState.تاريخالدفع,
      دفعةجديدة: '',
      تاريخالدفع: '',
    });
  };

  const handleEditButtonClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmEdit = (confirmed) => {
    setShowConfirmDialog(false);
    if (confirmed) setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    setSaveSuccessMessage('تم حفظ التعديلات بنجاح');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const removeService = (serviceName) => {
    setServices((prev) => prev.filter((s) => s !== serviceName));
    setServicesState((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
    setSubscriptionData((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
  };

  const removeSubscriptionLine = (serviceName, type, index) => {
    setSubscriptionData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[serviceName]?.[type]) return prev;
      next[serviceName][type].splice(index, 1);
      return next;
    });
  };

  const updateSubscriptionLine = (serviceName, type, index, field, value) => {
    setSubscriptionData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[serviceName]?.[type]?.[index]) return prev;
      next[serviceName][type][index][field] = value;
      if (type === 'خطوط') {
        const line = next[serviceName].خطوط[index];
        const عدد = parseFloat(line.عددالخطوط) || 0;
        const سعر = parseFloat(line.السعر) || 0;
        line.المجموع = عدد * سعر;
      } else if (type === 'خط') {
        const line = next[serviceName].خط[index];
        const عدد = parseFloat(line.عددالخطوط) || 0;
        const سعر = parseFloat(line.سعرالاشتراك) || 0;
        line.المجموع = عدد * سعر;
      } else if (type === 'حزمة') {
        const line = next[serviceName].حزمة[index];
        const مقدار = parseFloat(line.مقدارالحزمة) || 0;
        const سعر = parseFloat(line.سعرالحزمة) || 0;
        line.المجموع = مقدار * سعر;
      }
      return next;
    });
  };

  const globalTotals = services.reduce(
    (totals, serviceName) => {
      const serviceState = servicesState[serviceName];
      if (!serviceState) return totals;
      const { المبلغالمتبقي } = getServiceCalculations(serviceState);
      return {
        المبلغالكليالمتبقي: totals.المبلغالكليالمتبقي + المبلغالمتبقي,
        المبلغالكليالمدفوع: totals.المبلغالكليالمدفوع + serviceState.المبلغالمسدد,
      };
    },
    { المبلغالكليالمتبقي: 0, المبلغالكليالمدفوع: 0 }
  );

  const isWireless = (serviceName) => {
    const sd = orgData.serviceData?.[serviceName] || servicesState[serviceName];
    return sd?.نوعالتجهيز === 'Wireless';
  };

  const isFTTH = (serviceName) => {
    const sd = orgData.serviceData?.[serviceName] || servicesState[serviceName];
    return sd?.نوعالتجهيز === 'FTTH';
  };

  const isOptical = (serviceName) => {
    const sd = orgData.serviceData?.[serviceName] || servicesState[serviceName];
    return sd?.نوعالتجهيز === 'Optical';
  };

  const providerCompanies = ['Huawei', 'ZTE', 'Nokia', 'FiberHome'];

  const getProviderValue = (item) => item?.الشركةالمجهزة || item?.الشركة || '';

  const inputClass = (readOnly) =>
    readOnly
      ? 'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed'
      : 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200';

  const selectClass = (readOnly) =>
    readOnly
      ? 'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed'
      : 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-all duration-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {/* Banner + Edit / Save Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center sm:text-left">
              الدفع
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleEditButtonClick}
                className="px-6 py-3 text-sm font-medium text-blue-700 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                امكانية التعديل
              </button>
              {isEditing && (
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-3 text-sm font-medium text-white bg-green-600 border-2 border-green-700 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
                >
                  حفظ التعديل
                </button>
              )}
            </div>
          </div>

          {saveSuccessMessage && (
            <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium text-center">
              {saveSuccessMessage}
            </div>
          )}

          {/* Confirm Dialog */}
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
                <p className="text-lg font-medium text-gray-900 mb-6 text-center">
                  هل انت متأكد من التعديل؟
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleConfirmEdit(true)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    نعم
                  </button>
                  <button
                    onClick={() => handleConfirmEdit(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    لا
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* اسم الشركة - Company Name */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-600 mb-2 text-center">اسم الشركة</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center border-b-2 border-gray-300 pb-4">
              {companyName || 'الشركة غير موجودة'}
            </h2>
          </div>

          {/* الاشتراكات Section - NEW - Before Payment */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-3">
              الاشتراكات
            </h2>

            {services.map((serviceName) => {
              if (isWireless(serviceName)) {
                const subs = subscriptionData[serviceName] || { خط: [], حزمة: [] };
                const خطCount = subs.خط?.length || 0;
                const حزمةCount = subs.حزمة?.length || 0;

                return (
                  <div
                    key={serviceName}
                    className="mb-6 p-6 bg-gray-50 border-2 border-gray-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Wireless - {serviceName}
                      </h3>
                      {isEditing && (
                        <button
                          onClick={() => removeService(serviceName)}
                          className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                        >
                          - حذف الخدمة
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      عدد خط: {خطCount} | عدد حزمة: {حزمةCount}
                    </p>

                    {subs.حزمة?.map((item, idx) => (
                      <div
                        key={`حزمة-${idx}`}
                        className="mb-4 p-4 bg-white rounded-lg border border-gray-200 flex flex-wrap items-end gap-4"
                      >
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            نوع الحزمة
                          </label>
                          <input
                            type="text"
                            value={item.نوعالحزمة || ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'حزمة', idx, 'نوعالحزمة', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            مقدار الحزمة
                          </label>
                          <input
                            type="number"
                            value={item.مقدارالحزمة || ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'حزمة', idx, 'مقدارالحزمة', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            الشركة المجهزة
                          </label>
                          {isEditing ? (
                            <select
                              value={getProviderValue(item)}
                              onChange={(e) =>
                                updateSubscriptionLine(serviceName, 'حزمة', idx, 'الشركةالمجهزة', e.target.value)
                              }
                              className={selectClass(false)}
                            >
                              <option value="">Select</option>
                              {providerCompanies.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={getProviderValue(item)}
                              readOnly
                              className={inputClass(true)}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            السعر
                          </label>
                          <input
                            type="number"
                            value={item.سعرالحزمة || ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'حزمة', idx, 'سعرالحزمة', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            المجموع
                          </label>
                          <input
                            type="number"
                            value={item.المجموع?.toFixed(2) ?? ''}
                            readOnly
                            className={inputClass(true)}
                          />
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeSubscriptionLine(serviceName, 'حزمة', idx)}
                            className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                          >
                            -
                          </button>
                        )}
                      </div>
                    ))}

                    {subs.خط?.map((item, idx) => (
                      <div
                        key={`خط-${idx}`}
                        className="mb-4 p-4 bg-white rounded-lg border border-gray-200 flex flex-wrap items-end gap-4"
                      >
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            عدد الخطوط
                          </label>
                          <input
                            type="number"
                            value={item.عددالخطوط || ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'خط', idx, 'عددالخطوط', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            نوع الخط
                          </label>
                          <input
                            type="text"
                            value={item.نوعالخط || ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'خط', idx, 'نوعالخط', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            الشركة المجهزة
                          </label>
                          {isEditing ? (
                            <select
                              value={getProviderValue(item)}
                              onChange={(e) =>
                                updateSubscriptionLine(serviceName, 'خط', idx, 'الشركةالمجهزة', e.target.value)
                              }
                              className={selectClass(false)}
                            >
                              <option value="">Select</option>
                              {providerCompanies.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={getProviderValue(item)}
                              readOnly
                              className={inputClass(true)}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            السعر
                          </label>
                          <input
                            type="number"
                            value={item.سعرالاشتراك || ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'خط', idx, 'سعرالاشتراك', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            المجموع
                          </label>
                          <input
                            type="number"
                            value={item.المجموع?.toFixed(2) ?? ''}
                            readOnly
                            className={inputClass(true)}
                          />
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeSubscriptionLine(serviceName, 'خط', idx)}
                            className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                          >
                            -
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              if (isFTTH(serviceName) || isOptical(serviceName)) {
                const subs = subscriptionData[serviceName] || { خطوط: [] };
                const خطوط = subs.خطوط || [];

                return (
                  <div
                    key={serviceName}
                    className="mb-6 p-6 bg-gray-50 border-2 border-gray-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{serviceName}</h3>
                      {isEditing && (
                        <button
                          onClick={() => removeService(serviceName)}
                          className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                        >
                          - حذف الخدمة
                        </button>
                      )}
                    </div>

                    {خطوط.map((line, idx) => (
                      <div
                        key={`خط-${idx}`}
                        className="mb-4 p-4 bg-white rounded-lg border border-gray-200 flex flex-wrap items-end gap-4"
                      >
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            عدد الخطوط
                          </label>
                          <input
                            type="number"
                            value={line.عددالخطوط ?? ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'خطوط', idx, 'عددالخطوط', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            نوع الخط
                          </label>
                          <input
                            type="text"
                            value={line.نوعالخط ?? ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'خطوط', idx, 'نوعالخط', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            الشركة المجهزة
                          </label>
                          {isEditing ? (
                            <select
                              value={getProviderValue(line)}
                              onChange={(e) =>
                                updateSubscriptionLine(serviceName, 'خطوط', idx, 'الشركةالمجهزة', e.target.value)
                              }
                              className={selectClass(false)}
                            >
                              <option value="">Select</option>
                              {providerCompanies.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={getProviderValue(line)}
                              readOnly
                              className={inputClass(true)}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            السعر
                          </label>
                          <input
                            type="number"
                            value={line.السعر ?? ''}
                            onChange={(e) =>
                              updateSubscriptionLine(serviceName, 'خطوط', idx, 'السعر', e.target.value)
                            }
                            disabled={!isEditing}
                            className={inputClass(!isEditing)}
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            المجموع
                          </label>
                          <input
                            type="number"
                            value={line.المجموع?.toFixed(2) ?? ''}
                            readOnly
                            className={inputClass(true)}
                          />
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeSubscriptionLine(serviceName, 'خطوط', idx)}
                            className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                          >
                            -
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Payment Sections - Per Service */}
          <div className="mb-8">
            {services.map((serviceName) => {
              const serviceState = servicesState[serviceName];
              if (!serviceState) return null;

              const { المبلغالشهري, المبلغالمتبقي, المبلغالمستحق } =
                getServiceCalculations(serviceState);

              return (
                <div
                  key={serviceName}
                  className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mb-6"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-6 text-center border-b-2 border-gray-300 pb-3">
                    {serviceName} - الدفع
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نوع التجهيز
                        </label>
                        <select
                          value={serviceState.نوعالتجهيز}
                          disabled={!isEditing}
                          className={selectClass(!isEditing)}
                        >
                          <option value="FTTH">FTTH</option>
                          <option value="Wireless">Wireless</option>
                          <option value="Optical">Optical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          آلية الدفع
                        </label>
                        <select
                          value={serviceState.آليةالدفع}
                          disabled={!isEditing}
                          onChange={(e) =>
                            updateServiceState(serviceName, { آليةالدفع: e.target.value })
                          }
                          className={selectClass(!isEditing)}
                        >
                          <option value="شهري">شهري</option>
                          <option value="كل 3 أشهر">كل 3 أشهر</option>
                          <option value="سنوي">سنوي</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          عائدية الأجهزة
                        </label>
                        <select
                          value={serviceState.عائديةالأجهزة}
                          disabled={!isEditing}
                          onChange={(e) =>
                            updateServiceState(serviceName, {
                              عائديةالأجهزة: e.target.value,
                            })
                          }
                          className={selectClass(!isEditing)}
                        >
                          <option value="الشركة">الشركة</option>
                          <option value="المنظمة">المنظمة</option>
                          <option value="الوزارة">الوزارة</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          المبلغ السنوي
                        </label>
                        <input
                          type="number"
                          value={serviceState.المبلغالسنوي}
                          onChange={(e) =>
                            updateServiceState(serviceName, {
                              المبلغالسنوي: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          المبلغ الشهري
                        </label>
                        <input
                          type="number"
                          value={المبلغالشهري.toFixed(2)}
                          readOnly
                          className={inputClass(true)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          المبلغ المسدد
                        </label>
                        <input
                          type="number"
                          value={serviceState.المبلغالمسدد}
                          onChange={(e) =>
                            updateServiceState(serviceName, {
                              المبلغالمسدد: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          المبلغ المتبقي
                        </label>
                        <input
                          type="number"
                          value={المبلغالمتبقي.toFixed(2)}
                          readOnly
                          className={inputClass(true)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          المبلغ المستحق
                        </label>
                        <input
                          type="number"
                          value={المبلغالمستحق.toFixed(2)}
                          readOnly
                          className={inputClass(true)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          تاريخ الاستحقاق
                        </label>
                        <input
                          type="date"
                          value={serviceState.تاريخالاستحقاق}
                          onChange={(e) =>
                            updateServiceState(serviceName, {
                              تاريخالاستحقاق: e.target.value,
                            })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          مبلغ آخر دفعة
                        </label>
                        <input
                          type="number"
                          value={serviceState.مبلغآخردفعة}
                          onChange={(e) =>
                            updateServiceState(serviceName, {
                              مبلغآخردفعة: parseFloat(e.target.value) || 0,
                            })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          تاريخ آخر دفعة
                        </label>
                        <input
                          type="date"
                          value={serviceState.تاريخآخردفعة}
                          onChange={(e) =>
                            updateServiceState(serviceName, {
                              تاريخآخردفعة: e.target.value,
                            })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Update Section */}
                  <div className="bg-white border-2 border-gray-300 rounded-xl p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">تحديث الدفع</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          دفعة جديدة
                        </label>
                        <input
                          type="number"
                          value={serviceState.دفعةجديدة}
                          onChange={(e) =>
                            updateServiceState(serviceName, { دفعةجديدة: e.target.value })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                          placeholder="Enter amount"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          تاريخ الدفع
                        </label>
                        <input
                          type="date"
                          value={serviceState.تاريخالدفع}
                          onChange={(e) =>
                            updateServiceState(serviceName, { تاريخالدفع: e.target.value })
                          }
                          disabled={!isEditing}
                          className={inputClass(!isEditing)}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleUpdatePayment(serviceName)}
                          disabled={!isEditing}
                          className={`w-full px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 ${
                            isEditing
                              ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-500'
                              : 'bg-gray-400 cursor-not-allowed'
                          }`}
                        >
                          تحديث
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Address and Phone */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass(false)}
                  />
                ) : (
                  <p className="text-base font-medium text-gray-900">{address}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass(false)}
                  />
                ) : (
                  <p className="text-base font-medium text-gray-900">{phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Global Totals */}
          <div className="bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-300 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center border-b-2 border-blue-400 pb-3">
              الإجماليات الكلية
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ الكلي المتبقي
                </label>
                <input
                  type="number"
                  value={globalTotals.المبلغالكليالمتبقي.toFixed(2)}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed font-semibold text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ الكلي المدفوع
                </label>
                <input
                  type="number"
                  value={globalTotals.المبلغالكليالمدفوع.toFixed(2)}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed font-semibold text-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DetailPage;

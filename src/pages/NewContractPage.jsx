import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const NewContractPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const companyName = location.state?.companyName || '';

  // Main checkboxes
  const [wireless, setWireless] = useState(false);
  const [ftth, setFtth] = useState(false);
  const [optical, setOptical] = useState(false);
  const [other, setOther] = useState(false);

  // Other (اخرى) state - اسم الخدمة, السعر, الكمية (optional), المجموع
  const [otherRows, setOtherRows] = useState([
    { اسمالخدمة: '', السعر: '', الكمية: '', المجموع: 0 }
  ]);

  // Bottom section options
  const [paymentMethod, setPaymentMethod] = useState(''); // آلية الدفع
  const [deviceOwnership, setDeviceOwnership] = useState(''); // عائدية الاجهزة

  // FTTH state
  const [ftthLines, setFtthLines] = useState([
    { عددالخطوط: '', الشركة: '', نوعالخط: '', سعرالاشتراك: '', المجموع: 0 }
  ]);

  // Wireless state
  const [wirelessLine, setWirelessLine] = useState(false);
  const [wirelessBundle, setWirelessBundle] = useState(false);
  const [wirelessLineRows, setWirelessLineRows] = useState([
    { عددالخطوط: '', الشركة: '', نوعالخط: '', سعرالاشتراك: '', المجموع: 0 }
  ]);
  const [wirelessBundleRows, setWirelessBundleRows] = useState([
    { نوعالحزمة: '', مقدارالحزمة: '', سعرالحزمة: '', المجموع: 0 }
  ]);

  // Date state
  const [selectedDate, setSelectedDate] = useState('');
  const [autoFillDate, setAutoFillDate] = useState(true);

  // Company options
  const companyOptions = ['Huawei', 'ZTE', 'Nokia', 'FiberHome'];
  const lineTypeOptions = ['10Mbps', '50Mbps', '100Mbps', 'Unlimited'];
  const bundleTypeOptions = ['انترنت', 'انترانيت', 'دولي', 'fna', 'gcc'];

  // Static prices per type
  const lineTypePrices = {
    '10Mbps': 10000,
    '50Mbps': 25000,
    '100Mbps': 50000,
    'Unlimited': 100000
  };

  const bundleTypePrices = {
    'انترنت': 15000,
    'انترانيت': 20000,
    'دولي': 30000,
    'fna': 25000,
    'gcc': 35000
  };

  // Auto-fill date when checkbox is checked
  useEffect(() => {
    if (autoFillDate) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [autoFillDate]);

  // Helper function to calculate totals for FTTH
  const calculateFtthTotals = (lines) => {
    return lines.map(line => {
      const عدد = parseFloat(line.عددالخطوط) || 0;
      const سعر = parseFloat(line.سعرالاشتراك) || 0;
      return { ...line, المجموع: عدد * سعر };
    });
  };

  // Helper function to calculate totals for Wireless Line
  const calculateWirelessLineTotals = (lines) => {
    return lines.map(line => {
      const عدد = parseFloat(line.عددالخطوط) || 0;
      const سعر = parseFloat(line.سعرالاشتراك) || 0;
      return { ...line, المجموع: عدد * سعر };
    });
  };

  // Helper function to calculate totals for Wireless Bundle
  const calculateWirelessBundleTotals = (lines) => {
    return lines.map(line => {
      const مقدار = parseFloat(line.مقدارالحزمة) || 0;
      const سعر = parseFloat(line.سعرالحزمة) || 0;
      return { ...line, المجموع: مقدار * سعر };
    });
  };

  // Helper function to calculate totals for Other (اخرى): quantity × price or just price
  const calculateOtherTotals = (lines) => {
    return lines.map(line => {
      const سعر = parseFloat(line.السعر) || 0;
      const كمية = parseFloat(line.الكمية);
      const المجموع = (كمية && !isNaN(كمية)) ? كمية * سعر : سعر;
      return { ...line, المجموع };
    });
  };


  // Update FTTH line type price
  const handleFtthLineTypeChange = (index, value) => {
    setFtthLines(prev => {
      const newLines = [...prev];
      newLines[index] = {
        ...newLines[index],
        نوعالخط: value,
        سعرالاشتراك: lineTypePrices[value] || ''
      };
      return calculateFtthTotals(newLines);
    });
  };

  // Update Wireless Line type price
  const handleWirelessLineTypeChange = (index, value) => {
    setWirelessLineRows(prev => {
      const newLines = [...prev];
      newLines[index] = {
        ...newLines[index],
        نوعالخط: value,
        سعرالاشتراك: lineTypePrices[value] || ''
      };
      return calculateWirelessLineTotals(newLines);
    });
  };

  // Update Wireless Bundle type price
  const handleWirelessBundleTypeChange = (index, value) => {
    setWirelessBundleRows(prev => {
      const newLines = [...prev];
      newLines[index] = {
        ...newLines[index],
        نوعالحزمة: value,
        سعرالحزمة: bundleTypePrices[value] || ''
      };
      return calculateWirelessBundleTotals(newLines);
    });
  };

  // Add FTTH line
  const addFtthLine = (index) => {
    setFtthLines(prev => {
      const newLines = [...prev];
      newLines.splice(index + 1, 0, { عددالخطوط: '', الشركة: '', نوعالخط: '', سعرالاشتراك: '', المجموع: 0 });
      return newLines;
    });
  };

  // Remove FTTH line
  const removeFtthLine = (index) => {
    if (ftthLines.length > 1) {
      setFtthLines(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Add Wireless Line row
  const addWirelessLineRow = (index) => {
    setWirelessLineRows(prev => {
      const newLines = [...prev];
      newLines.splice(index + 1, 0, { عددالخطوط: '', الشركة: '', نوعالخط: '', سعرالاشتراك: '', المجموع: 0 });
      return newLines;
    });
  };

  // Remove Wireless Line row
  const removeWirelessLineRow = (index) => {
    if (wirelessLineRows.length > 1) {
      setWirelessLineRows(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Add Wireless Bundle row
  const addWirelessBundleRow = (index) => {
    setWirelessBundleRows(prev => {
      const newLines = [...prev];
      newLines.splice(index + 1, 0, { نوعالحزمة: '', مقدارالحزمة: '', سعرالحزمة: '', المجموع: 0 });
      return newLines;
    });
  };

  // Remove Wireless Bundle row
  const removeWirelessBundleRow = (index) => {
    if (wirelessBundleRows.length > 1) {
      setWirelessBundleRows(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Add Other (اخرى) row
  const addOtherRow = (index) => {
    setOtherRows(prev => {
      const newRows = [...prev];
      newRows.splice(index + 1, 0, { اسمالخدمة: '', السعر: '', الكمية: '', المجموع: 0 });
      return newRows;
    });
  };

  // Remove Other (اخرى) row
  const removeOtherRow = (index) => {
    if (otherRows.length > 1) {
      setOtherRows(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handle Done button
  const handleDone = () => {
    // Here you can add logic to save the contract
    console.log('Contract data:', {
      wireless,
      ftth,
      optical,
      other,
      ftthLines,
      wirelessLineRows,
      wirelessBundleRows,
      otherRows,
      paymentMethod,
      deviceOwnership,
      selectedDate
    });
    // Navigate back or to another page
    navigate('/add');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {/* Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 mb-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">New Contract</h1>
            {companyName && (
              <p className="text-lg opacity-90">Company: {companyName}</p>
            )}
          </div>

          {/* Main checkboxes */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Type:</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50"
                style={{
                  borderColor: wireless ? '#2563eb' : '#e5e7eb',
                  backgroundColor: wireless ? '#eff6ff' : 'white',
                }}>
                <input
                  type="checkbox"
                  checked={wireless}
                  onChange={(e) => setWireless(e.target.checked)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="ml-3 text-base font-medium text-gray-900">Wireless</span>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50"
                style={{
                  borderColor: ftth ? '#2563eb' : '#e5e7eb',
                  backgroundColor: ftth ? '#eff6ff' : 'white',
                }}>
                <input
                  type="checkbox"
                  checked={ftth}
                  onChange={(e) => setFtth(e.target.checked)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="ml-3 text-base font-medium text-gray-900">FTTH</span>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50"
                style={{
                  borderColor: optical ? '#2563eb' : '#e5e7eb',
                  backgroundColor: optical ? '#eff6ff' : 'white',
                }}>
                <input
                  type="checkbox"
                  checked={optical}
                  onChange={(e) => setOptical(e.target.checked)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="ml-3 text-base font-medium text-gray-900">Optical</span>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50"
                style={{
                  borderColor: other ? '#2563eb' : '#e5e7eb',
                  backgroundColor: other ? '#eff6ff' : 'white',
                }}>
                <input
                  type="checkbox"
                  checked={other}
                  onChange={(e) => setOther(e.target.checked)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="ml-3 text-base font-medium text-gray-900">اخرى</span>
              </label>
            </div>
          </div>

          {/* FTTH Section */}
          {ftth && (
            <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">FTTH - خط</h3>
              
              {ftthLines.map((line, index) => (
                <div key={index} className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {/* عدد الخطوط */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عدد الخطوط
                      </label>
                      <input
                        type="number"
                        value={line.عددالخطوط}
                        onChange={(e) => {
                          const newLines = [...ftthLines];
                          newLines[index].عددالخطوط = e.target.value;
                          setFtthLines(calculateFtthTotals(newLines));
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="عدد"
                      />
                    </div>

                    {/* الشركة */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الشركة
                      </label>
                      <select
                        value={line.الشركة}
                        onChange={(e) => {
                          const newLines = [...ftthLines];
                          newLines[index].الشركة = e.target.value;
                          setFtthLines(newLines);
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      >
                        <option value="">Select</option>
                        {companyOptions.map(company => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>
                    </div>

                    {/* نوع الخط */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نوع الخط
                      </label>
                      <select
                        value={line.نوعالخط}
                        onChange={(e) => handleFtthLineTypeChange(index, e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      >
                        <option value="">Select</option>
                        {lineTypeOptions.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* سعر الاشتراك */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سعر الاشتراك
                      </label>
                      <input
                        type="number"
                        value={line.سعرالاشتراك}
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                      />
                    </div>

                    {/* المجموع */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المجموع
                      </label>
                      <input
                        type="number"
                        value={line.المجموع.toFixed(2)}
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => addFtthLine(index)}
                      className="flex items-center justify-center px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all duration-200"
                    >
                      <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      +
                    </button>
                    {ftthLines.length > 1 && (
                      <button
                        onClick={() => removeFtthLine(index)}
                        className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200"
                      >
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        -
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Wireless Section */}
          {wireless && (
            <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wireless</h3>
              
              {/* Wireless checkboxes */}
              <div className="mb-6 flex gap-4">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50"
                  style={{
                    borderColor: wirelessLine ? '#2563eb' : '#e5e7eb',
                    backgroundColor: wirelessLine ? '#eff6ff' : 'white',
                  }}>
                  <input
                    type="checkbox"
                    checked={wirelessLine}
                    onChange={(e) => setWirelessLine(e.target.checked)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="ml-3 text-base font-medium text-gray-900">خط</span>
                </label>

                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50"
                  style={{
                    borderColor: wirelessBundle ? '#2563eb' : '#e5e7eb',
                    backgroundColor: wirelessBundle ? '#eff6ff' : 'white',
                  }}>
                  <input
                    type="checkbox"
                    checked={wirelessBundle}
                    onChange={(e) => setWirelessBundle(e.target.checked)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="ml-3 text-base font-medium text-gray-900">حزمة</span>
                </label>
              </div>

              {/* Wireless Line Section */}
              {wirelessLine && (
                <div className="mb-6 p-4 bg-white rounded-lg">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">خط</h4>
                  
                  {wirelessLineRows.map((line, index) => (
                    <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        {/* عدد الخطوط */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            عدد الخطوط
                          </label>
                          <input
                            type="number"
                            value={line.عددالخطوط}
                            onChange={(e) => {
                              const newLines = [...wirelessLineRows];
                              newLines[index].عددالخطوط = e.target.value;
                              setWirelessLineRows(calculateWirelessLineTotals(newLines));
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="عدد"
                          />
                        </div>

                        {/* الشركة */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            الشركة
                          </label>
                          <select
                            value={line.الشركة}
                            onChange={(e) => {
                              const newLines = [...wirelessLineRows];
                              newLines[index].الشركة = e.target.value;
                              setWirelessLineRows(newLines);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                          >
                            <option value="">Select</option>
                            {companyOptions.map(company => (
                              <option key={company} value={company}>{company}</option>
                            ))}
                          </select>
                        </div>

                        {/* نوع الخط */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            نوع الخط
                          </label>
                          <select
                            value={line.نوعالخط}
                            onChange={(e) => handleWirelessLineTypeChange(index, e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                          >
                            <option value="">Select</option>
                            {lineTypeOptions.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        {/* سعر الاشتراك */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            سعر الاشتراك
                          </label>
                          <input
                            type="number"
                            value={line.سعرالاشتراك}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        {/* المجموع */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            المجموع
                          </label>
                          <input
                            type="number"
                            value={line.المجموع.toFixed(2)}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => addWirelessLineRow(index)}
                          className="flex items-center justify-center px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all duration-200"
                        >
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          +
                        </button>
                        {wirelessLineRows.length > 1 && (
                          <button
                            onClick={() => removeWirelessLineRow(index)}
                            className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200"
                          >
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            -
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Wireless Bundle Section */}
              {wirelessBundle && (
                <div className="mb-6 p-4 bg-white rounded-lg">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">حزمة</h4>
                  
                  {wirelessBundleRows.map((line, index) => (
                    <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                      {/* نوع الحزمة */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نوع الحزمة
                        </label>
                        <select
                          value={line.نوعالحزمة}
                          onChange={(e) => handleWirelessBundleTypeChange(index, e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        >
                          <option value="">Select</option>
                          {bundleTypeOptions.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* If انترنت is selected, show the same 5 fields as خط */}
                      {line.نوعالحزمة === 'انترنت' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                          {/* عدد الخطوط */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              عدد الخطوط
                            </label>
                            <input
                              type="number"
                              value={line.عددالخطوط || ''}
                              onChange={(e) => {
                                const newLines = [...wirelessBundleRows];
                                newLines[index].عددالخطوط = e.target.value;
                                // Calculate total for انترنت type
                                const عدد = parseFloat(e.target.value) || 0;
                                const سعر = parseFloat(newLines[index].سعرالاشتراك) || 0;
                                newLines[index].المجموع = عدد * سعر;
                                setWirelessBundleRows(newLines);
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="عدد"
                            />
                          </div>

                          {/* الشركة */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              الشركة
                            </label>
                            <select
                              value={line.الشركة || ''}
                              onChange={(e) => {
                                const newLines = [...wirelessBundleRows];
                                newLines[index].الشركة = e.target.value;
                                setWirelessBundleRows(newLines);
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            >
                              <option value="">Select</option>
                              {companyOptions.map(company => (
                                <option key={company} value={company}>{company}</option>
                              ))}
                            </select>
                          </div>

                          {/* نوع الخط */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نوع الخط
                            </label>
                            <select
                              value={line.نوعالخط || ''}
                              onChange={(e) => {
                                const newLines = [...wirelessBundleRows];
                                newLines[index].نوعالخط = e.target.value;
                                newLines[index].سعرالاشتراك = lineTypePrices[e.target.value] || '';
                                // Calculate total for انترنت type
                                const عدد = parseFloat(newLines[index].عددالخطوط) || 0;
                                const سعر = parseFloat(newLines[index].سعرالاشتراك) || 0;
                                newLines[index].المجموع = عدد * سعر;
                                setWirelessBundleRows(newLines);
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            >
                              <option value="">Select</option>
                              {lineTypeOptions.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>

                          {/* سعر الاشتراك */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              سعر الاشتراك
                            </label>
                            <input
                              type="number"
                              value={line.سعرالاشتراك || ''}
                              readOnly
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                            />
                          </div>

                          {/* المجموع */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              المجموع
                            </label>
                            <input
                              type="number"
                              value={line.المجموع.toFixed(2)}
                              readOnly
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      ) : line.نوعالحزمة && (
                        /* For other bundle types, show 3 fields */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          {/* مقدار الحزمة */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              مقدار الحزمة
                            </label>
                            <input
                              type="number"
                              value={line.مقدارالحزمة}
                              onChange={(e) => {
                                const newLines = [...wirelessBundleRows];
                                newLines[index].مقدارالحزمة = e.target.value;
                                setWirelessBundleRows(calculateWirelessBundleTotals(newLines));
                              }}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="مقدار"
                            />
                          </div>

                          {/* سعر الحزمة */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              سعر الحزمة
                            </label>
                            <input
                              type="number"
                              value={line.سعرالحزمة}
                              readOnly
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                            />
                          </div>

                          {/* المجموع */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              المجموع
                            </label>
                            <input
                              type="number"
                              value={line.المجموع.toFixed(2)}
                              readOnly
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => addWirelessBundleRow(index)}
                          className="flex items-center justify-center px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all duration-200"
                        >
                          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          +
                        </button>
                        {wirelessBundleRows.length > 1 && (
                          <button
                            onClick={() => removeWirelessBundleRow(index)}
                            className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200"
                          >
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                            -
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optical Section */}
          {optical && (
            <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Optical</h3>
              <p className="text-gray-600">Optical section - to be expanded later</p>
            </div>
          )}

          {/* Other (اخرى) Section */}
          {other && (
            <div className="mb-8 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">اخرى</h3>

              {otherRows.map((row, index) => (
                <div key={index} className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* اسم الخدمة */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم الخدمة
                      </label>
                      <input
                        type="text"
                        value={row.اسمالخدمة}
                        onChange={(e) => {
                          const newRows = [...otherRows];
                          newRows[index].اسمالخدمة = e.target.value;
                          setOtherRows(newRows);
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="اسم الخدمة"
                      />
                    </div>

                    {/* السعر */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السعر
                      </label>
                      <input
                        type="number"
                        value={row.السعر}
                        onChange={(e) => {
                          const newRows = [...otherRows];
                          newRows[index].السعر = e.target.value;
                          setOtherRows(calculateOtherTotals(newRows));
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="السعر"
                      />
                    </div>

                    {/* الكمية (optional - for total calculation) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الكمية <span className="text-gray-500 font-normal">(اختياري)</span>
                      </label>
                      <input
                        type="number"
                        value={row.الكمية}
                        onChange={(e) => {
                          const newRows = [...otherRows];
                          newRows[index].الكمية = e.target.value;
                          setOtherRows(calculateOtherTotals(newRows));
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="الكمية"
                      />
                    </div>

                    {/* المجموع */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        المجموع
                      </label>
                      <input
                        type="number"
                        value={row.المجموع.toFixed(2)}
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => addOtherRow(index)}
                      className="flex items-center justify-center px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all duration-200"
                    >
                      <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      +
                    </button>
                    {otherRows.length > 1 && (
                      <button
                        onClick={() => removeOtherRow(index)}
                        className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200"
                      >
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        -
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* Payment and Device dropdowns - above Done button */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  آلية الدفع
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="">Select</option>
                  <option value="شهري">شهري</option>
                  <option value="كل ثلاث اشهر">كل ثلاث اشهر</option>
                  <option value="سنوي">سنوي</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عائدية الاجهزة
                </label>
                <select
                  value={deviceOwnership}
                  onChange={(e) => setDeviceOwnership(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="">Select</option>
                  <option value="ملك">ملك</option>
                  <option value="ايجار">ايجار</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Done Button */}
              <button
                onClick={handleDone}
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Done
              </button>

              {/* Date Input Section */}
              <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoFillDate}
                    onChange={(e) => setAutoFillDate(e.target.checked)}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Auto-fill today's date
                  </label>
                </div>

                <div className="flex-1 sm:max-w-xs">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={autoFillDate}
                    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 ${
                      autoFillDate ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewContractPage;


import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = '/api';

const monthNamesAr = [
  'كانون 2',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين 1',
  'تشرين 2',
  'كانون 1',
];

const StatisticsPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [timeline, setTimeline] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartMode, setChartMode] = useState('amount');

  const fetchStatisticsData = async () => {
    try {
      setLoading(true);
      setError('');

      const [historyRes, dashboardRes] = await Promise.all([
        fetch(`${API_BASE}/history/all?limit=1000`),
        fetch(`${API_BASE}/dashboard`),
      ]);

      const historyData = await historyRes.json();
      const dashboardData = await dashboardRes.json();

      if (!historyRes.ok) {
        throw new Error(historyData.error || 'فشل تحميل بيانات السجل');
      }

      if (!dashboardRes.ok) {
        throw new Error(dashboardData.error || 'فشل تحميل بيانات الإحصائيات');
      }

      setTimeline(historyData.history || []);
      setDashboard(dashboardData || null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatisticsData();
  }, []);

  const formatMoney = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  };

  const safeDate = (value) => {
    if (!value) return null;
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const payments = useMemo(() => {
    return timeline.filter((item) => item.kind === 'payment');
  }, [timeline]);

  const serviceCreations = useMemo(() => {
    return timeline.filter(
      (item) =>
        item.kind === 'activity' &&
        String(item.entity_type || '') === 'organization_service' &&
        String(item.action || '').toLowerCase().includes('created')
    );
  }, [timeline]);

  const availableYears = useMemo(() => {
    const years = new Set();

    [...payments, ...serviceCreations].forEach((item) => {
      const dateValue = item.payment_date || item.created_at;
      const d = safeDate(dateValue);
      if (d) years.add(d.getFullYear());
    });

    const sorted = [...years].sort((a, b) => b - a);
    return sorted.length ? sorted : [new Date().getFullYear()];
  }, [payments, serviceCreations]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const selectedYearPayments = useMemo(() => {
    return payments.filter((payment) => {
      const d = safeDate(payment.payment_date || payment.created_at);
      return d && d.getFullYear() === selectedYear;
    });
  }, [payments, selectedYear]);

  const selectedYearContracts = useMemo(() => {
    return serviceCreations.filter((item) => {
      const d = safeDate(item.created_at);
      return d && d.getFullYear() === selectedYear;
    });
  }, [serviceCreations, selectedYear]);

  const monthlyPayments = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: monthNamesAr[index],
      amount: 0,
      count: 0,
    }));

    selectedYearPayments.forEach((payment) => {
      const d = safeDate(payment.payment_date || payment.created_at);
      if (!d) return;

      const monthIndex = d.getMonth();
      const amount = Number(payment.payment_amount || 0);

      months[monthIndex].amount += amount;
      months[monthIndex].count += 1;
    });

    return months;
  }, [selectedYearPayments]);

  const monthlyContracts = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: monthNamesAr[index],
      count: 0,
    }));

    selectedYearContracts.forEach((item) => {
      const d = safeDate(item.created_at);
      if (!d) return;

      const monthIndex = d.getMonth();
      months[monthIndex].count += 1;
    });

    return months;
  }, [selectedYearContracts]);

  const yearlyPayments = useMemo(() => {
    const grouped = {};

    payments.forEach((payment) => {
      const d = safeDate(payment.payment_date || payment.created_at);
      if (!d) return;

      const year = d.getFullYear();
      const amount = Number(payment.payment_amount || 0);

      if (!grouped[year]) {
        grouped[year] = { year, amount: 0, count: 0 };
      }

      grouped[year].amount += amount;
      grouped[year].count += 1;
    });

    return Object.values(grouped).sort((a, b) => a.year - b.year);
  }, [payments]);

  const serviceTypeDistribution = useMemo(() => {
    const grouped = {};

    selectedYearPayments.forEach((payment) => {
      const key = payment.service_type || 'غير محدد';
      grouped[key] = (grouped[key] || 0) + Number(payment.payment_amount || 0);
    });

    const entries = Object.entries(grouped);
    if (!entries.length) {
      return [{ label: 'لا توجد بيانات', value: 1 }];
    }

    return entries.map(([label, value]) => ({ label, value }));
  }, [selectedYearPayments]);

  const orgStatusData = useMemo(() => {
    const rows = dashboard?.organizations_by_status || [];
    if (!rows.length) {
      return [{ label: 'لا توجد بيانات', value: 1 }];
    }
    return rows.map((row) => ({
      label: row.status || 'غير محدد',
      value: Number(row.count || 0),
    }));
  }, [dashboard]);

  const summary = useMemo(() => {
    const totalIncome = selectedYearPayments.reduce(
      (sum, payment) => sum + Number(payment.payment_amount || 0),
      0
    );

    const totalPayments = selectedYearPayments.length;
    const averagePayment = totalPayments > 0 ? totalIncome / totalPayments : 0;

    const bestMonth = monthlyPayments.reduce(
      (best, month) => (month.amount > best.amount ? month : best),
      { month: '-', amount: 0 }
    );

    const mostContractsMonth = monthlyContracts.reduce(
      (best, month) => (month.count > best.count ? month : best),
      { month: '-', count: 0 }
    );

    return {
      totalIncome,
      totalPayments,
      averagePayment,
      bestMonth: bestMonth.amount > 0 ? bestMonth.month : '-',
      contractsCount: selectedYearContracts.length,
      bestContractsMonth: mostContractsMonth.count > 0 ? mostContractsMonth.month : '-',
    };
  }, [selectedYearPayments, monthlyPayments, selectedYearContracts, monthlyContracts]);

  const paymentVsContractsChartData = {
    labels: monthNamesAr,
    datasets: [
      {
        label: 'الدفعات',
        data: monthlyPayments.map((item) => item.count),
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
      {
        label: 'العقود',
        data: monthlyContracts.map((item) => item.count),
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
    ],
  };

  const monthlyIncomeChartData = {
    labels: monthlyPayments.map((item) => item.month),
    datasets: [
      {
        label: `الإيراد الشهري - ${selectedYear}`,
        data: monthlyPayments.map((item) =>
          chartMode === 'amount' ? item.amount : item.count
        ),
        borderRadius: 10,
      },
    ],
  };

  const yearlyIncomeChartData = {
    labels: yearlyPayments.map((item) => String(item.year)),
    datasets: [
      {
        label: 'الإيراد السنوي',
        data: yearlyPayments.map((item) => item.amount),
        borderRadius: 10,
      },
    ],
  };

  const serviceTypeDoughnutData = {
    labels: serviceTypeDistribution.map((item) => item.label),
    datasets: [
      {
        label: 'توزيع حسب نوع الخدمة',
        data: serviceTypeDistribution.map((item) => item.value),
      },
    ],
  };

  const orgStatusDoughnutData = {
    labels: orgStatusData.map((item) => item.label),
    datasets: [
      {
        label: 'حالات الجهات',
        data: orgStatusData.map((item) => item.value),
      },
    ],
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const monthlyBarOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      title: {
        display: true,
        text:
          chartMode === 'amount'
            ? `الإيراد الشهري - ${selectedYear}`
            : `عدد الدفعات الشهري - ${selectedYear}`,
      },
    },
  };

  const lineOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      title: {
        display: true,
        text: `العقود مقابل الدفعات - ${selectedYear}`,
      },
    },
  };

  const yearlyBarOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      title: {
        display: true,
        text: 'مقارنة الإيراد السنوي',
      },
    },
  };

  const doughnutOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      title: {
        display: true,
        text: 'التوزيع',
      },
    },
  };

  const recentOrganizations = dashboard?.recent_organizations || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
        <Navbar onMenuClick={() => setIsMenuOpen(true)} />
        <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-600">
            جاري تحميل الإحصائيات...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
        <Navbar onMenuClick={() => setIsMenuOpen(true)} />
        <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-red-600">
            {error}
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
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                الإحصائيات
              </h1>
              <p className="text-gray-600 mt-2">
                تحليل الإيرادات والدفعات والعقود وحالة النظام بشكل أوضح
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
              <div className="w-full sm:w-56">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السنة
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-56">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وضع الرسم الشهري
                </label>
                <select
                  value={chartMode}
                  onChange={(e) => setChartMode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="amount">قيمة الإيراد</option>
                  <option value="count">عدد الدفعات</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <p className="text-sm text-gray-500 mb-2">إيراد السنة المحددة</p>
            <h2 className="text-3xl font-bold text-blue-700">
              {formatMoney(summary.totalIncome)}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <p className="text-sm text-gray-500 mb-2">عدد الدفعات</p>
            <h2 className="text-3xl font-bold text-green-700">
              {summary.totalPayments}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-amber-100">
            <p className="text-sm text-gray-500 mb-2">متوسط الدفعة</p>
            <h2 className="text-3xl font-bold text-amber-700">
              {formatMoney(summary.averagePayment)}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <p className="text-sm text-gray-500 mb-2">أفضل شهر إيراداً</p>
            <h2 className="text-3xl font-bold text-purple-700">
              {summary.bestMonth}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">العقود المنشأة في السنة</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {summary.contractsCount}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">أفضل شهر بالعقود</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {summary.bestContractsMonth}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-red-100">
            <p className="text-sm text-gray-500 mb-2">إجمالي المتبقي بالنظام</p>
            <h2 className="text-3xl font-bold text-red-700">
              {formatMoney(dashboard?.total_due_amount)}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-teal-100">
            <p className="text-sm text-gray-500 mb-2">إجمالي المدفوع بالنظام</p>
            <h2 className="text-3xl font-bold text-teal-700">
              {formatMoney(dashboard?.total_paid_amount)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-500 mb-2">عدد الجهات</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {dashboard?.total_organizations ?? 0}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-500 mb-2">الجهات الفعالة</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {dashboard?.active_organizations ?? 0}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-500 mb-2">إجمالي الخدمات</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {dashboard?.total_services ?? 0}
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm text-gray-500 mb-2">الشركات المزودة</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {dashboard?.total_provider_companies ?? 0}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="h-[380px]">
              <Bar data={monthlyIncomeChartData} options={monthlyBarOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="h-[380px]">
              <Line data={paymentVsContractsChartData} options={lineOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="h-[380px]">
              <Bar data={yearlyIncomeChartData} options={yearlyBarOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="h-[380px] flex items-center justify-center">
              <Doughnut data={serviceTypeDoughnutData} options={{
                ...doughnutOptions,
                plugins: {
                  ...doughnutOptions.plugins,
                  title: {
                    display: true,
                    text: `توزيع إيرادات ${selectedYear} حسب نوع الخدمة`,
                  },
                },
              }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="h-[380px] flex items-center justify-center">
              <Doughnut
                data={orgStatusDoughnutData}
                options={{
                  ...doughnutOptions,
                  plugins: {
                    ...doughnutOptions.plugins,
                    title: {
                      display: true,
                      text: 'توزيع حالات الجهات',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">أحدث الجهات</h2>

            {recentOrganizations.length === 0 ? (
              <div className="text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
                لا توجد بيانات حديثة
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrganizations.map((org) => (
                  <div
                    key={org.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{org.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {org.created_at || '-'}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {org.status || '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;
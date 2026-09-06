import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Scale, 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Building2, 
  ChevronLeft,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import DemandLetterModal from './DemandLetterModal';

const NotificationHub = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'due_soon' | 'demand_2' | 'legal'
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const containerRef = useRef(null);

  // Fetch intelligent installment alerts from database function
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_installment_schedule_and_alerts');
      if (error) throw error;

      // Filter only active actionable alerts
      const actionable = (data || []).filter(item => 
        item.alert_level && 
        item.alert_level !== 'none' && 
        Number(item.installment_balance || 0) > 0
      );

      // Sort by urgency: critical first, then danger, then warning, then info
      const levelWeight = { critical: 4, danger: 3, warning: 2, info: 1 };
      actionable.sort((a, b) => (levelWeight[b.alert_level] || 0) - (levelWeight[a.alert_level] || 0));

      setAlerts(actionable);
    } catch (err) {
      console.error('Error fetching installment alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    // Re-check periodically every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Categorize alerts for filter tabs
  const filteredAlerts = alerts.filter(item => {
    if (activeFilter === 'due_soon') {
      return item.alert_level === 'info' || item.days_diff < 0;
    }
    if (activeFilter === 'demand_2') {
      return item.action_required === 'send_demand_2' || (item.days_diff >= 7 && item.days_diff < 14);
    }
    if (activeFilter === 'legal') {
      return item.alert_level === 'critical' || item.action_required === 'refer_to_legal' || item.days_diff >= 14;
    }
    return true; // 'all'
  });

  const criticalCount = alerts.filter(a => a.alert_level === 'critical').length;
  const dangerCount = alerts.filter(a => a.alert_level === 'danger').length;
  const warningCount = alerts.filter(a => a.alert_level === 'warning').length;
  const infoCount = alerts.filter(a => a.alert_level === 'info').length;

  const totalCount = alerts.length;

  const handleOpenDocModal = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedInstallment(item);
    setModalOpen(true);
  };

  const handleNavigateToOrg = (orgId, e) => {
    if (e) e.stopPropagation();
    setIsOpen(false);
    navigate(`/detail/${orgId}`);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          isOpen
            ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
            : totalCount > 0
            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
        }`}
        title="تنبيهات استحقاق الأقساط والديون"
        aria-label="تنبيهات استحقاق الأقساط"
      >
        <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${criticalCount > 0 ? 'animate-pulse text-rose-600' : ''}`} />

        {totalCount > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-sm ring-2 ring-white ${
              criticalCount > 0
                ? 'bg-rose-600'
                : dangerCount > 0
                ? 'bg-orange-500'
                : 'bg-amber-500'
            }`}
          >
            {totalCount > 99 ? '+99' : totalCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          dir="rtl"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[92vw] sm:w-[480px] max-w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Panel Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-950/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <span>إشعارات الأقساط والمطالبات</span>
                  {totalCount > 0 && (
                    <span className="px-2 py-0.2 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[10px] font-bold">
                      {totalCount} مستحق
                    </span>
                  )}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-indigo-200/80">
                  نظام التنبيهات الذكي للمطالبات الرسمية ومتابعة الديون
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchAlerts}
                disabled={loading}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-slate-50 p-2 border-b border-slate-200 grid grid-cols-4 gap-1 text-[11px] font-bold">
            <button
              onClick={() => setActiveFilter('all')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              onClick={() => setActiveFilter('due_soon')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeFilter === 'due_soon'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              وشيك ({infoCount})
            </button>
            <button
              onClick={() => setActiveFilter('demand_2')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeFilter === 'demand_2'
                  ? 'bg-white text-orange-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مطالبة 2 ({dangerCount})
            </button>
            <button
              onClick={() => setActiveFilter('legal')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeFilter === 'legal'
                  ? 'bg-white text-rose-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قانوني ({criticalCount})
            </button>
          </div>

          {/* Alert List Body */}
          <div className="overflow-y-auto p-3 space-y-2.5 flex-1 max-h-[55vh]">
            {loading && alerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs">جاري فحص حالة الأقساط والكتب الرسمية...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">لا توجد تنبيهات مستحقة في هذا القسم</p>
                <p className="text-[11px] text-slate-400">جميع الأقساط مسددة أو لا تتطلب إجراءً عاجلاً حالياً.</p>
              </div>
            ) : (
              filteredAlerts.map((item, idx) => {
                const isCritical = item.alert_level === 'critical';
                const isDanger = item.alert_level === 'danger';
                const isWarning = item.alert_level === 'warning';
                const isInfo = item.alert_level === 'info';

                const cardBorder = isCritical
                  ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50'
                  : isDanger
                  ? 'border-orange-300 bg-orange-50/50 hover:bg-orange-50'
                  : isWarning
                  ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50'
                  : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50';

                const badgeBg = isCritical
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : isDanger
                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                  : isWarning
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300';

                return (
                  <div
                    key={`${item.service_id}-${item.installment_number}-${idx}`}
                    className={`p-3 rounded-xl border transition-all shadow-xs ${cardBorder}`}
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.organization_name}
                        </span>
                        <span className="text-[10px] text-slate-400">({item.service_type})</span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeBg}`}>
                        {item.installment_label || `قسط ${item.installment_number}`}
                      </span>
                    </div>

                    {/* Alert title and message */}
                    <div className="my-1.5">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        {isCritical ? (
                          <Scale className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : isDanger || isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span>{item.alert_title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {item.alert_message}
                      </p>
                    </div>

                    {/* Meta info & Books status */}
                    <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80 text-[10px] sm:text-[11px] text-slate-600 space-y-1 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">المتبقي المطلوب:</span>
                        <span className="font-bold text-rose-600">
                          {Number(item.installment_balance || 0).toLocaleString()} د.ع
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">تاريخ الاستحقاق:</span>
                        <span className="font-medium text-slate-700">{item.installment_due_date}</span>
                      </div>

                      {/* Letter statuses */}
                      <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {item.demand_1_book_number ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                            كتاب 1: #{item.demand_1_book_number} ({item.demand_1_book_date})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                            لم يوجه كتاب 1
                          </span>
                        )}

                        {item.demand_2_book_number && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 text-[10px]">
                            كتاب 2: #{item.demand_2_book_number} ({item.demand_2_book_date})
                          </span>
                        )}

                        {item.legal_book_number && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px]">
                            إحالة قانونية: #{item.legal_book_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenDocModal(item, e)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>توثيق كتاب مطالبة</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleNavigateToOrg(item.organization_id, e)}
                        className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="فتح صفحة العقد والجهة"
                      >
                        <span>عرض العقد</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 text-center">
            تحديث تلقائي وفق الاستحقاقات والكتب الموثقة رسمياً
          </div>
        </div>
      )}

      {/* Demand Letter Modal */}
      <DemandLetterModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        installmentData={selectedInstallment}
        onSuccess={() => {
          fetchAlerts();
        }}
      />
    </div>
  );
};

export default NotificationHub;

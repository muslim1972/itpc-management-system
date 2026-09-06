import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  FileText, 
  Send, 
  AlertTriangle, 
  Scale, 
  History, 
  Calendar, 
  Hash, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  User, 
  Edit2, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUser, isAdmin } from '../utils/auth';

const STAGE_CONFIG = {
  demand_1: {
    label: 'كتاب المطالبة الأول',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: FileText,
    desc: 'تذكير رسمي أولي بوجوب سداد القسط المستحق.'
  },
  demand_2: {
    label: 'كتاب المطالبة الثاني',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle,
    desc: 'إنذار ثانٍ بعد مرور أسبوع من الاستحقاق دون سداد.'
  },
  legal_referral: {
    label: 'إحالة للشعبة القانونية',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: Scale,
    desc: 'إحالة رسمية نهائية للشعبة القانونية لتحريك الدعوى القضائية.'
  }
};

const DemandLetterModal = ({ isOpen, onClose, installmentData, onSuccess }) => {
  const currentUser = getUser();
  const isUserAdmin = isAdmin();

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history' | 'logs'
  const [demandStage, setDemandStage] = useState('demand_1');
  const [bookNumber, setBookNumber] = useState('');
  const [bookDate, setBookDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amountDemanded, setAmountDemanded] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLetters, setFetchingLetters] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [existingLetters, setExistingLetters] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingLetterId, setEditingLetterId] = useState(null);

  // Determine intelligent default stage based on installment data
  useEffect(() => {
    if (!installmentData) return;

    if (installmentData.demand_2_book_number) {
      setDemandStage('legal_referral');
    } else if (installmentData.demand_1_book_number) {
      setDemandStage('demand_2');
    } else {
      setDemandStage('demand_1');
    }

    setAmountDemanded(
      installmentData.installment_balance != null 
        ? String(installmentData.installment_balance) 
        : String(installmentData.installment_amount || '')
    );
    setBookNumber('');
    setNotes('');
    setEditingLetterId(null);
    setError(null);
    setSuccessMsg(null);
  }, [installmentData]);

  // Fetch existing letters for this service and installment
  const fetchLettersAndLogs = useCallback(async () => {
    if (!installmentData?.service_id) return;
    setFetchingLetters(true);
    try {
      const { data: letters, error: lettersErr } = await supabase
        .from('contract_demand_letters')
        .select('*')
        .eq('service_id', installmentData.service_id)
        .eq('installment_number', installmentData.installment_number || 1)
        .order('created_at', { ascending: false });

      if (lettersErr) throw lettersErr;
      setExistingLetters(letters || []);

      if (letters && letters.length > 0) {
        const letterIds = letters.map(l => l.id);
        const { data: logs, error: logsErr } = await supabase
          .from('demand_letter_logs')
          .select('*')
          .in('demand_letter_id', letterIds)
          .order('created_at', { ascending: false });

        if (!logsErr) {
          setAuditLogs(logs || []);
        }
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Error fetching demand letters:', err);
    } finally {
      setFetchingLetters(false);
    }
  }, [installmentData]);

  useEffect(() => {
    if (isOpen && installmentData?.service_id) {
      fetchLettersAndLogs();
    }
  }, [isOpen, installmentData, fetchLettersAndLogs]);

  if (!isOpen || !installmentData) return null;

  const handleEditClick = (letter) => {
    setEditingLetterId(letter.id);
    setDemandStage(letter.demand_stage);
    setBookNumber(letter.book_number || '');
    setBookDate(letter.book_date || new Date().toISOString().split('T')[0]);
    setAmountDemanded(String(letter.amount_demanded || ''));
    setNotes(letter.notes || '');
    setActiveTab('form');
  };

  const handleCancelEdit = () => {
    setEditingLetterId(null);
    setBookNumber('');
    setBookDate(new Date().toISOString().split('T')[0]);
    setAmountDemanded(
      installmentData.installment_balance != null 
        ? String(installmentData.installment_balance) 
        : String(installmentData.installment_amount || '')
    );
    setNotes('');
  };

  const handleDeleteLetter = async (letterId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكتاب الرسمي؟ سيتم تسجيل عملية الحذف في سجل التدقيق.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('contract_demand_letters')
        .delete()
        .eq('id', letterId);

      if (delErr) throw delErr;

      setSuccessMsg('تم حذف الكتاب بنجاح وتوثيق الحذف في السجل.');
      await fetchLettersAndLogs();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حذف الكتاب.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookNumber.trim()) {
      setError('يرجى إدخال رقم الكتاب الرسمي.');
      return;
    }
    if (!bookDate) {
      setError('يرجى تحديد تاريخ صدور الكتاب.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const username = currentUser?.name || currentUser?.username || 'مستخدم النظام';
    const userId = currentUser?.id && typeof currentUser.id === 'string' && currentUser.id.includes('-') 
      ? currentUser.id 
      : null;

    try {
      if (editingLetterId) {
        // Update
        const { error: updErr } = await supabase
          .from('contract_demand_letters')
          .update({
            demand_stage: demandStage,
            book_number: bookNumber.trim(),
            book_date: bookDate,
            amount_demanded: parseFloat(amountDemanded) || 0,
            notes: notes.trim() || null,
            created_by_username: username,
            created_by_id: userId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLetterId);

        if (updErr) throw updErr;
        setSuccessMsg('تم تحديث بيانات الكتاب بنجاح وتوثيق التعديل.');
      } else {
        // Insert
        const { error: insErr } = await supabase
          .from('contract_demand_letters')
          .insert({
            organization_id: installmentData.organization_id,
            service_id: installmentData.service_id,
            contract_period_id: installmentData.period_id || null,
            installment_number: installmentData.installment_number || 1,
            installment_due_date: installmentData.installment_due_date || null,
            demand_stage: demandStage,
            book_number: bookNumber.trim(),
            book_date: bookDate,
            amount_demanded: parseFloat(amountDemanded) || 0,
            notes: notes.trim() || null,
            created_by_username: username,
            created_by_id: userId
          });

        if (insErr) throw insErr;
        setSuccessMsg('تم توثيق الكتاب الرسمي بنجاح وإدراجه في النظام.');
      }

      setEditingLetterId(null);
      setBookNumber('');
      setNotes('');
      await fetchLettersAndLogs();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving demand letter:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ الكتاب الرسمي.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        dir="rtl" 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                توثيق ومتابعة الكتب الرسمية والمطالبات
              </h2>
              <p className="text-xs text-indigo-200/80">
                الجهة: {installmentData.organization_name} • {installmentData.service_type} ({installmentData.installment_label || `القسط ${installmentData.installment_number}`})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Installment Summary Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">تاريخ الاستحقاق:</span>{' '}
              <span className="font-bold text-slate-800">{installmentData.installment_due_date || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500">مبلغ القسط:</span>{' '}
              <span className="font-bold text-indigo-700">
                {Number(installmentData.installment_amount || 0).toLocaleString()} د.ع
              </span>
            </div>
            <div>
              <span className="text-slate-500">المتبقي المطلوب:</span>{' '}
              <span className="font-bold text-rose-600">
                {Number(installmentData.installment_balance || 0).toLocaleString()} د.ع
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'form' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {editingLetterId ? 'تعديل الكتاب' : 'توثيق كتاب جديد'}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === 'history' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>الكتب الموثقة</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {existingLetters.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === 'logs' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل التدقيق</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: FORM */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stage Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  مرحلة المطالبة أو الإجراء الإداري *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {Object.entries(STAGE_CONFIG).map(([stageKey, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = demandStage === stageKey;
                    return (
                      <div
                        key={stageKey}
                        onClick={() => setDemandStage(stageKey)}
                        className={`cursor-pointer p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm' 
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {cfg.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Book Info Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الكتاب الرسمي *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: 1234/ش.م/2026"
                      value={bookNumber}
                      onChange={(e) => setBookNumber(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ صدور الكتاب *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Amount Demanded */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المبلغ المُطالب به (د.ع)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="مبلغ القسط"
                    value={amountDemanded}
                    onChange={(e) => setAmountDemanded(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو تفاصيل إضافية (اختياري)
                </label>
                <textarea
                  rows="2"
                  placeholder="ملاحظات حول طريقة التسليم، الرد، أو توجيهات الإحالة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                {editingLetterId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    إلغاء التعديل
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{editingLetterId ? 'حفظ التعديلات' : 'توثيق الكتاب الرسمي'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTERED LETTERS */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {fetchingLetters ? (
                <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">جاري تحميل الكتب الرسمية...</span>
                </div>
              ) : existingLetters.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">لم يتم توثيق أي كتب رسمية لهذا القسط بعد</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">يمكنك توثيق كتاب المطالبة الأول من تبويب "توثيق كتاب جديد"</p>
                </div>
              ) : (
                existingLetters.map((letter) => {
                  const cfg = STAGE_CONFIG[letter.demand_stage] || STAGE_CONFIG.demand_1;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={letter.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-indigo-200 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass} flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            رقم الكتاب: {letter.book_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>تاريخ الكتاب: {letter.book_date}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 my-2 bg-white/70 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400">المبلغ المُطالب به:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {Number(letter.amount_demanded || 0).toLocaleString()} د.ع
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">وثّق بواسطة:</span>{' '}
                          <span className="font-semibold text-slate-800">
                            {letter.created_by_username || 'غير محدد'}
                          </span>
                        </div>
                        {letter.notes && (
                          <div className="sm:col-span-2 text-slate-500 text-[11px]">
                            <span className="text-slate-400">ملاحظات:</span> {letter.notes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>أُضيف في: {new Date(letter.created_at).toLocaleString('ar-IQ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(letter)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                          {(isUserAdmin || letter.created_by_username === currentUser?.username) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLetter(letter.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">لا توجد سجلات تدقيق سابقة لهذا القسط</p>
                </div>
              ) : (
                auditLogs.map((log) => {
                  const isInsert = log.action_type === 'INSERT';
                  const isUpdate = log.action_type === 'UPDATE';
                  const isDelete = log.action_type === 'DELETE';

                  const badgeClass = isInsert
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isUpdate
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300';

                  const actionLabel = isInsert ? 'إضافة كتاب' : isUpdate ? 'تعديل كتاب' : 'حذف كتاب';

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {actionLabel}
                          </span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {log.changed_by_username || 'مستخدم'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.created_at).toLocaleString('ar-IQ')}
                        </span>
                      </div>

                      {log.new_data && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                          رقم الكتاب: <strong>{log.new_data.book_number}</strong> • التاريخ:{' '}
                          <strong>{log.new_data.book_date}</strong> • المرحلة:{' '}
                          <strong>{STAGE_CONFIG[log.new_data.demand_stage]?.label || log.new_data.demand_stage}</strong>
                        </div>
                      )}

                      {isUpdate && log.old_data && (
                        <div className="text-[10px] text-slate-400">
                          القيمة السابقة: كتاب رقم ({log.old_data.book_number}) بتاريخ ({log.old_data.book_date})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-3 px-5 flex items-center justify-between text-xs text-slate-500">
          <span>نظام قسم تجهيز خدمات المعلوماتية • وحدة متابعة الديون</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemandLetterModal;

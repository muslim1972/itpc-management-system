import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  Scale, 
  History, 
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  Calendar, 
  User, 
  Building2, 
  Clock, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUser, isAdmin } from '../utils/auth';

const STAGE_CONFIG = {
  demand_1: {
    label: 'كتاب المطالبة الأول',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: FileText
  },
  demand_2: {
    label: 'كتاب المطالبة الثاني',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle
  },
  legal_referral: {
    label: 'إحالة للشعبة القانونية',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: Scale
  }
};

const DemandLettersSection = () => {
  const currentUser = getUser();
  const isUserAdmin = isAdmin();

  const [activeTab, setActiveTab] = useState('letters'); // 'letters' | 'logs'
  const [letters, setLetters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch letters with organization name and service type
      const { data: lettersData, error: lettersErr } = await supabase
        .from('contract_demand_letters')
        .select(`
          *,
          organizations(name),
          organization_services(service_type)
        `)
        .order('created_at', { ascending: false });

      if (lettersErr) throw lettersErr;
      setLetters(lettersData || []);

      // Fetch audit logs
      const { data: logsData, error: logsErr } = await supabase
        .from('demand_letter_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsErr) throw logsErr;
      setLogs(logsData || []);
    } catch (err) {
      console.error('Error loading demand letters in admin:', err);
      setError('فشل في تحميل بيانات الكتب الرسمية من قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteLetter = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟ سيتم توثيق عملية الحذف بالكامل في سجل التدقيق.')) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from('contract_demand_letters')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      await loadData();
    } catch (err) {
      alert(err.message || 'فشل حذف الكتاب');
    }
  };

  const filteredLetters = letters.filter((letter) => {
    const orgName = letter.organizations?.name || '';
    const bookNum = letter.book_number || '';
    const notes = letter.notes || '';
    const author = letter.created_by_username || '';

    const matchesSearch = 
      orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || letter.demand_stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Export to Excel using dynamic ExcelJS
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ITPC Management System';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('سجل كتب المطالبات الرسمية', {
        views: [{ rtl: true }]
      });

      // Title
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'سجل ومتابعة كتب المطالبات الرسمية والإحالات القانونية - قسم تجهيز خدمات المعلوماتية';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 34;

      // Headers
      const headers = ['ت', 'اسم الجهة', 'نوع الخدمة', 'مرحلة المطالبة', 'رقم الكتاب', 'تاريخ الكتاب', 'المبلغ المُطالب به (د.ع)', 'الموثق', 'الملاحظات'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      filteredLetters.forEach((l, idx) => {
        const stageLabel = STAGE_CONFIG[l.demand_stage]?.label || l.demand_stage;
        const r = worksheet.addRow([
          idx + 1,
          l.organizations?.name || '-',
          l.organization_services?.service_type || '-',
          stageLabel,
          l.book_number,
          l.book_date,
          Number(l.amount_demanded || 0),
          l.created_by_username || '-',
          l.notes || '-'
        ]);
        r.height = 22;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (idx % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
          if (colNum === 7) {
            cell.numFmt = '#,##0.00';
          }
        });
      });

      worksheet.columns.forEach((col) => {
        let maxLen = 14;
        col.eachCell({ includeEmpty: false }, (c) => {
          const s = c.value ? String(c.value) : '';
          if (s.length > maxLen) maxLen = Math.min(s.length + 3, 40);
        });
        col.width = maxLen;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demand_letters_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting letters:', err);
      alert('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setExportingExcel(false);
    }
  };

  const demand1Count = letters.filter(l => l.demand_stage === 'demand_1').length;
  const demand2Count = letters.filter(l => l.demand_stage === 'demand_2').length;
  const legalCount = letters.filter(l => l.demand_stage === 'legal_referral').length;

  return (
    <div className="space-y-6 page-reveal">
      {/* Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">إجمالي الكتب الموثقة</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{letters.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-700">كتب المطالبة الأولى</div>
            <div className="text-xl font-bold text-amber-900 mt-0.5">{demand1Count}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-orange-700">كتب المطالبة الثانية</div>
            <div className="text-xl font-bold text-orange-900 mt-0.5">{demand2Count}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-700">إحالات الشعبة القانونية</div>
            <div className="text-xl font-bold text-rose-900 mt-0.5">{legalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="surface-card overflow-hidden">
        {/* Navigation Bar & Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('letters')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'letters'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كتب المطالبات والإحالات ({letters.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'logs'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل تدقيق العمليات ({logs.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || filteredLetters.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingExcel ? 'جاري التصدير...' : 'تصدير إكسل (.xlsx)'}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* TAB 1: LETTERS LIST */}
        {activeTab === 'letters' && (
          <div>
            {/* Filter and Search controls */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالجهة، رقم الكتاب، الموثق..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStageFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    stageFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل ({letters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('demand_1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    stageFilter === 'demand_1'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  المطالبة الأولى ({demand1Count})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('demand_2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    stageFilter === 'demand_2'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                  }`}
                >
                  المطالبة الثانية ({demand2Count})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('legal_referral')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    stageFilter === 'legal_referral'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  إحالة قانونية ({legalCount})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-3">ت</th>
                    <th className="p-3">الجهة</th>
                    <th className="p-3">نوع الخدمة</th>
                    <th className="p-3">المرحلة</th>
                    <th className="p-3">رقم الكتاب وتاريخه</th>
                    <th className="p-3">المبلغ المُطالب به</th>
                    <th className="p-3">الموثق والتاريخ</th>
                    <th className="p-3">الملاحظات</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-500">
                        جاري تحميل سجل الكتب الرسمية...
                      </td>
                    </tr>
                  ) : filteredLetters.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-500">
                        لا توجد كتب رسمية مسجلة تطابق البحث
                      </td>
                    </tr>
                  ) : (
                    filteredLetters.map((letter, idx) => {
                      const cfg = STAGE_CONFIG[letter.demand_stage] || STAGE_CONFIG.demand_1;
                      const Icon = cfg.icon;

                      return (
                        <tr key={letter.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            {letter.organizations?.name || `جهة #${letter.organization_id}`}
                          </td>
                          <td className="p-3 text-slate-600">
                            {letter.organization_services?.service_type || '-'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold inline-flex items-center gap-1 ${cfg.badgeClass}`}>
                              <Icon className="w-3 h-3" />
                              <span>{cfg.label}</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">#{letter.book_number}</div>
                            <div className="text-[10px] text-slate-400">{letter.book_date}</div>
                          </td>
                          <td className="p-3 font-bold text-indigo-700">
                            {Number(letter.amount_demanded || 0).toLocaleString()} د.ع
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{letter.created_by_username || '-'}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(letter.created_at).toLocaleDateString('ar-IQ')}
                            </div>
                          </td>
                          <td className="p-3 text-slate-500 max-w-xs truncate" title={letter.notes}>
                            {letter.notes || '—'}
                          </td>
                          <td className="p-3 text-center">
                            {isUserAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLetter(letter.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="حذف الكتاب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-3">ت</th>
                    <th className="p-3">نوع العملية</th>
                    <th className="p-3">المستخدم المسؤول</th>
                    <th className="p-3">تاريخ ووقت العملية</th>
                    <th className="p-3">البيانات بعد العملية</th>
                    <th className="p-3">البيانات السابقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">
                        لا توجد سجلات تدقيق محفوظة
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => {
                      const isInsert = log.action_type === 'INSERT';
                      const isUpdate = log.action_type === 'UPDATE';
                      const isDelete = log.action_type === 'DELETE';

                      const badgeClass = isInsert
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isUpdate
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300';

                      const actionLabel = isInsert ? 'إضافة كتاب' : isUpdate ? 'تعديل بيانات' : 'حذف كتاب';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeClass}`}>
                              {actionLabel}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {log.changed_by_username || 'مستخدم'}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString('ar-IQ')}
                          </td>
                          <td className="p-3">
                            {log.new_data ? (
                              <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                كتاب رقم: <strong>{log.new_data.book_number}</strong> • التاريخ:{' '}
                                <strong>{log.new_data.book_date}</strong> • المبلغ:{' '}
                                <strong>{Number(log.new_data.amount_demanded || 0).toLocaleString()} د.ع</strong>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3">
                            {log.old_data ? (
                              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                كتاب رقم: {log.old_data.book_number} • التاريخ: {log.old_data.book_date}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandLettersSection;

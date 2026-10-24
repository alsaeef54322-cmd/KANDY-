import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  Printer,
  RotateCcw,
  ShieldCheck,
  Coins,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowRight,
  Info,
  DollarSign,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { db } from '../../services/storage';
import { DailyClosing, DailyClosingDenominations } from '../../types';
import { formatCurrency } from '../../services/accounting';
import { toast } from '../common/Toast';
import { exportToCSV } from '../../services/exportService';

interface EndOfDayClosingProps {
  onNavigateToSafe?: () => void;
  onNavigateToReports?: () => void;
}

export const EndOfDayClosing: React.FC<EndOfDayClosingProps> = ({
  onNavigateToSafe,
  onNavigateToReports,
}) => {
  const [activeTab, setActiveTab] = useState<'reconcile' | 'history' | 'analytics'>('reconcile');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [useDenominations, setUseDenominations] = useState(true);
  const [manualActualCash, setManualActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [autoCreateAdjustment, setAutoCreateAdjustment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Reopen Dialog State
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Egyptian Pound Denominations
  const [denominations, setDenominations] = useState<DailyClosingDenominations>({
    d200: 0,
    d100: 0,
    d50: 0,
    d20: 0,
    d10: 0,
    d5: 0,
    coins: 0,
  });

  // Calculate day cash stats based on actual database transactions
  const dayStats = useMemo(() => {
    return db.calculateDayExpectedCash(selectedDate);
  }, [selectedDate, successBanner]);

  // Existing closing for selected date
  const existingClosing = useMemo(() => {
    return db.getDailyClosingByDate(selectedDate);
  }, [selectedDate, successBanner]);

  // All historical closings
  const allClosings = useMemo(() => {
    return db.getDailyClosings();
  }, [successBanner]);

  // Total cash calculated from denomination counts
  const denominationTotal = useMemo(() => {
    return (
      (denominations.d200 || 0) * 200 +
      (denominations.d100 || 0) * 100 +
      (denominations.d50 || 0) * 50 +
      (denominations.d20 || 0) * 20 +
      (denominations.d10 || 0) * 10 +
      (denominations.d5 || 0) * 5 +
      (denominations.coins || 0)
    );
  }, [denominations]);

  const effectiveActualCash = useDenominations ? denominationTotal : manualActualCash;
  const difference = Math.round((effectiveActualCash - dayStats.expectedCash) * 100) / 100;

  // Sync state whenever selected date or existing closing changes
  useEffect(() => {
    if (existingClosing) {
      if (existingClosing.denominations) {
        setDenominations(existingClosing.denominations);
        setUseDenominations(true);
      } else {
        setManualActualCash(existingClosing.actualCash);
        setUseDenominations(false);
      }
      setNotes(existingClosing.notes || '');
    } else {
      // Pre-fill manual cash with expected cash as neutral starting point
      setManualActualCash(dayStats.expectedCash);
      setNotes('');
    }
  }, [selectedDate, existingClosing, dayStats.expectedCash]);

  const handleDenominationChange = (key: keyof DailyClosingDenominations, val: number) => {
    setDenominations((prev) => ({
      ...prev,
      [key]: Math.max(0, val || 0),
    }));
  };

  const handleSaveClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const session = db.getSession();
      const managerName = session.name || 'الأستاذ إبراهيم راغب';

      const savedClosing = db.saveDailyClosing({
        date: selectedDate,
        closedBy: managerName,
        openingBalance: dayStats.openingBalance,
        cashSales: dayStats.cashSales,
        cashInflows: dayStats.cashInflows,
        cashExpenses: dayStats.cashExpenses,
        cashOutflows: dayStats.cashOutflows,
        cashReturns: dayStats.cashReturns,
        expectedCash: dayStats.expectedCash,
        actualCash: effectiveActualCash,
        difference,
        status: Math.abs(difference) < 0.01 ? 'balanced' : difference > 0 ? 'surplus' : 'deficit',
        notes: notes.trim(),
        denominations: useDenominations ? denominations : undefined,
        autoCreateAdjustment,
      });

      // Try server sync if available
      try {
        await fetch('/api/daily-closings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedClosing),
        });
      } catch {
        // Local storage is source of truth in offline mode
      }

      const msg = `تم اعتماد وتوثيق إقفال اليومية (${selectedDate}) برقم ${savedClosing.closingNumber} بنجاح`;
      setSuccessBanner(msg);
      toast.success(msg);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      console.error('Error saving closing:', err);
      toast.error('حدث خطأ أثناء حفظ إقفال اليومية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenTargetId || !reopenReason.trim()) return;

    const ok = db.reopenDailyClosing(reopenTargetId, reopenReason.trim());
    if (ok) {
      try {
        await fetch(`/api/daily-closings/${reopenTargetId}/reopen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reopenReason.trim() }),
        });
      } catch {
        // Offline
      }

      toast.success('تمت إعادة فتح اليومية بنجاح لإجراء المراجعة');
      setReopenTargetId(null);
      setReopenReason('');
      setSuccessBanner('تم فتح اليومية مرة أخرى بنجاح');
      setTimeout(() => setSuccessBanner(null), 3000);
    } else {
      toast.error('تعذر إعادة فتح اليومية');
    }
  };

  const handlePrintProtocol = (closing?: DailyClosing) => {
    window.print();
  };

  const handleExportHistory = () => {
    if (allClosings.length === 0) {
      toast.warning('لا توجد سجلات لتصديرها');
      return;
    }

    const data = allClosings.map((c) => ({
      رقم_الإقفال: c.closingNumber,
      التاريخ: c.date,
      تاريخ_الوقت: c.closedAt,
      المعتمد: c.closedBy,
      رصيد_الافتتاح: c.openingBalance,
      مبيعات_نقدية: c.cashSales,
      إيداعات_وتحصيل: c.cashInflows,
      مصروفات_نقدية: c.cashExpenses,
      مسحوبات_أخرى: c.cashOutflows,
      مرتجعات_نقدية: c.cashReturns,
      الرصيد_المتوقع: c.expectedCash,
      الرصيد_الفعلي: c.actualCash,
      الفارق: c.difference,
      الحالة: c.status === 'balanced' ? 'مطابق' : c.status === 'surplus' ? 'زيادة' : 'عجز',
      الملاحظات: c.notes || '',
      أعيد_فتحه: c.statusReopened ? 'نعم' : 'لا',
      سبب_إعادة_الفتح: c.reopenReason || '',
    }));

    exportToCSV(data, `kandy_daily_closings_${new Date().toISOString().slice(0, 10)}`);
    toast.success('تم تصدير سجل الإقفالات بنجاح');
  };

  // Summary Metrics across history
  const totalClosings = allClosings.length;
  const balancedClosings = allClosings.filter((c) => c.status === 'balanced').length;
  const balancedRate = totalClosings > 0 ? Math.round((balancedClosings / totalClosings) * 100) : 100;
  const netHistoricalVariance = allClosings.reduce((sum, c) => sum + (c.difference || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] text-[#26160F] overflow-y-auto font-['Cairo',sans-serif]">
      {/* Page Title & Navigation Banner */}
      <div className="bg-gradient-to-r from-[#170D08] via-[#2F170E] to-[#064e3b] text-white p-4 sm:p-6 border-b border-[#3D2517] shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-[#F9E2AF] shadow-md shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-wide">
                  إقفال اليومية ومطابقة الخزنة النقدية
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono font-bold">
                  EndOfDayClosing
                </span>
              </div>
              <p className="text-xs text-[#E0D2C7] mt-0.5">
                مطابقة الرصيد النقدي الفعلي في الدرج مع الرصيد المسجل في النظام واعتماد محضر نهاية اليوم — الأستاذ إبراهيم راغب
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('reconcile')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'reconcile'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              معالج المطابقة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل المحاضر ({totalClosings})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              مؤشرات الانضباط
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {successBanner && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 animate-fade-in shadow-xs">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-100 hover:text-white font-mono text-sm px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* TAB 1: RECONCILIATION & CLOSING WIZARD */}
        {activeTab === 'reconcile' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Filter Bar: Date & Status */}
            <div className="bg-white p-4 rounded-2xl border border-[#E4D7CA] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                <Calendar className="w-4 h-4 text-[#8C4A26]" />
                <span className="text-xs font-bold text-[#341B11]">تاريخ اليومية المطلوب مطابقتها:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5C2B1] rounded-lg font-mono font-bold text-[#341B11] focus:ring-2 focus:ring-[#8C4A26] outline-none"
                />

                {/* Quick Date Presets */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className={`px-2.5 py-1 rounded-md border font-semibold transition-all cursor-pointer ${
                      selectedDate === new Date().toISOString().split('T')[0]
                        ? 'bg-[#542E1D] text-white border-[#542E1D]'
                        : 'bg-[#FAF7F2] text-[#6B5345] border-[#E0D2C3] hover:bg-[#F0E6DA]'
                    }`}
                  >
                    اليوم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setSelectedDate(y.toISOString().split('T')[0]);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#FAF7F2] text-[#6B5345] border border-[#E0D2C3] hover:bg-[#F0E6DA] font-semibold transition-all cursor-pointer"
                  >
                    أمس
                  </button>
                </div>
              </div>

              {/* Status Badge of this Day */}
              <div className="flex items-center gap-2">
                {existingClosing ? (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3.5 py-1.5 rounded-xl border border-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      معتمد برقم: <strong>{existingClosing.closingNumber}</strong> ({existingClosing.status === 'balanced' ? 'مطابق' : existingClosing.difference > 0 ? `زيادة +${existingClosing.difference}` : `عجز ${existingClosing.difference}`})
                    </span>
                    {existingClosing.statusReopened && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        أعيد فتحه
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs px-3 py-1.5 rounded-xl border border-amber-200">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>اليومية مفتوحة ولم تُقفل بعد</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handlePrintProtocol(existingClosing)}
                  className="px-3 py-1.5 rounded-xl border border-[#D5C2B1] bg-white hover:bg-[#FAF7F2] text-xs font-bold text-[#341B11] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#8C4A26]" />
                  <span>طباعة المحضر</span>
                </button>
              </div>
            </div>

            {/* Form & Main Steps */}
            <form onSubmit={handleSaveClosing} className="space-y-6">
              {/* STEP 1: SYSTEM REGISTERED TRANSACTIONS & EXPECTED BALANCE */}
              <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0E6DC] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#542E1D] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#341B11]">
                        الحركات المسجلة والرصيد المحاسبي المتوقع للخزنة
                      </h3>
                      <p className="text-[11px] text-[#7A5E4F]">
                        وفق قيود وقواعد الخزنة الفعلية المحسوبة من سجل الحركات المسجلة
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#EDE2D4] font-bold text-[#542E1D]">
                    {dayStats.transactionsCount} حركة مسجلة خلال هذا اليوم
                  </span>
                </div>

                {/* Financial breakdown cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE2D4]">
                    <span className="text-[10px] text-[#7A5E4F] block">رصيد الافتتاح</span>
                    <strong className="text-sm font-bold font-mono text-[#341B11] block mt-0.5">
                      {formatCurrency(dayStats.openingBalance)}
                    </strong>
                    <span className="text-[9px] text-[#9E8272]">رصيد بداية اليوم</span>
                  </div>

                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-emerald-800 block font-semibold">+ مبيعات نقدية</span>
                    <strong className="text-sm font-bold font-mono text-emerald-800 block mt-0.5">
                      {formatCurrency(dayStats.cashSales)}
                    </strong>
                    <span className="text-[9px] text-emerald-700">وارد الكاشير</span>
                  </div>

                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-emerald-800 block font-semibold">+ تحصيلات وإيداعات</span>
                    <strong className="text-sm font-bold font-mono text-emerald-800 block mt-0.5">
                      {formatCurrency(dayStats.cashInflows)}
                    </strong>
                    <span className="text-[9px] text-emerald-700">ديون عملاء وإيداع</span>
                  </div>

                  <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200/60">
                    <span className="text-[10px] text-rose-800 block font-semibold">- مصروفات نقدية</span>
                    <strong className="text-sm font-bold font-mono text-rose-800 block mt-0.5">
                      {formatCurrency(dayStats.cashExpenses)}
                    </strong>
                    <span className="text-[9px] text-rose-700">تشغيل ونثريات</span>
                  </div>

                  <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200/60">
                    <span className="text-[10px] text-rose-800 block font-semibold">- مسحوبات ومشتريات</span>
                    <strong className="text-sm font-bold font-mono text-rose-800 block mt-0.5">
                      {formatCurrency(dayStats.cashOutflows)}
                    </strong>
                    <span className="text-[9px] text-rose-700">موردين وسلف</span>
                  </div>

                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
                    <span className="text-[10px] text-amber-800 block font-semibold">- مرتجعات نقدية</span>
                    <strong className="text-sm font-bold font-mono text-amber-800 block mt-0.5">
                      {formatCurrency(dayStats.cashReturns)}
                    </strong>
                    <span className="text-[9px] text-amber-700">مردودات مبيعات</span>
                  </div>
                </div>

                {/* Calculated Drawer Balance Banner */}
                <div className="bg-gradient-to-r from-[#F5ECE1] to-[#EAE0D3] p-4 rounded-xl border border-[#DDCBB8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#542E1D] font-bold block">
                      الرصيد المحاسبي المتوقع في الدرج (Expected Drawer Balance):
                    </span>
                    <span className="text-[11px] text-[#7A5E4F]">
                      المعادلة: رصيد الافتتاح ({formatCurrency(dayStats.openingBalance)}) + إجمالي الوارد النقدي ({formatCurrency(dayStats.cashSales + dayStats.cashInflows)}) - إجمالي المنصرف النقدي ({formatCurrency(dayStats.cashExpenses + dayStats.cashOutflows + dayStats.cashReturns)})
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#064e3b] self-end sm:self-auto">
                    {formatCurrency(dayStats.expectedCash)}
                  </div>
                </div>
              </div>

              {/* STEP 2: PHYSICAL CASH COUNT (الجرد الفعلي للنقدية) */}
              <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0E6DC] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#542E1D] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#341B11]">
                        إدخال الجرد الفعلي للنقدية في الخزنة (Physical Cash Count)
                      </h3>
                      <p className="text-[11px] text-[#7A5E4F]">
                        احسب الأوراق النقدية يدويًا لتسجيل المبلغ الفعلي الموجود بالدرج
                      </p>
                    </div>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#7A5E4F]">نمط الجرد:</span>
                    <button
                      type="button"
                      onClick={() => setUseDenominations(true)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        useDenominations
                          ? 'bg-[#542E1D] text-white shadow-2xs'
                          : 'bg-[#FAF7F2] text-[#6B5345] hover:bg-[#F3ECE2] border border-[#E0D2C3]'
                      }`}
                    >
                      تفنيد الفئات النقدية (موصى به)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseDenominations(false)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        !useDenominations
                          ? 'bg-[#542E1D] text-white shadow-2xs'
                          : 'bg-[#FAF7F2] text-[#6B5345] hover:bg-[#F3ECE2] border border-[#E0D2C3]'
                      }`}
                    >
                      مبلغ إجمالي مباشر
                    </button>
                  </div>
                </div>

                {useDenominations ? (
                  <div className="space-y-3">
                    <p className="text-xs text-[#7A5E4F]">
                      أدخل عدد الأوراق النقدية لكل فئة من فئات الجنيه المصري، وسيقوم النظام باحتساب المجموع تلقائيًا:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {[
                        { key: 'd200' as const, label: 'فئة 200 ج.م', val: 200, bg: 'bg-emerald-50/50' },
                        { key: 'd100' as const, label: 'فئة 100 ج.م', val: 100, bg: 'bg-blue-50/50' },
                        { key: 'd50' as const, label: 'فئة 50 ج.م', val: 50, bg: 'bg-purple-50/50' },
                        { key: 'd20' as const, label: 'فئة 20 ج.م', val: 20, bg: 'bg-amber-50/50' },
                        { key: 'd10' as const, label: 'فئة 10 ج.م', val: 10, bg: 'bg-orange-50/50' },
                        { key: 'd5' as const, label: 'فئة 5 ج.م', val: 5, bg: 'bg-stone-50/50' },
                      ].map((denom) => (
                        <div
                          key={denom.key}
                          className={`p-3 rounded-xl border border-[#E4D7CA] ${denom.bg} flex flex-col justify-between`}
                        >
                          <span className="text-xs font-bold text-[#542E1D] mb-1">
                            {denom.label}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={denominations[denom.key] || ''}
                            onChange={(e) =>
                              handleDenominationChange(denom.key, parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#D5C2B1] rounded-lg text-sm font-mono font-bold text-center focus:ring-2 focus:ring-[#8C4A26] outline-none"
                          />
                          <span className="text-[10px] text-[#7A5E4F] font-mono text-center mt-1.5">
                            = {formatCurrency((denominations[denom.key] || 0) * denom.val)}
                          </span>
                        </div>
                      ))}

                      {/* Coins and small change */}
                      <div className="p-3 rounded-xl border border-[#E4D7CA] bg-amber-50/50 flex flex-col justify-between">
                        <span className="text-xs font-bold text-[#542E1D] mb-1">
                          فكة ومعدني
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={denominations.coins || ''}
                          onChange={(e) =>
                            handleDenominationChange('coins', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#D5C2B1] rounded-lg text-sm font-mono font-bold text-center focus:ring-2 focus:ring-[#8C4A26] outline-none"
                        />
                        <span className="text-[10px] text-[#7A5E4F] font-mono text-center mt-1.5">
                          = {formatCurrency(denominations.coins || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#542E1D] block">
                      إجمالي النقدية المحصية فعلياً بالدرج (ج.م):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualActualCash}
                      onChange={(e) => setManualActualCash(parseFloat(e.target.value) || 0)}
                      className="w-full max-w-sm px-3.5 py-2.5 bg-white border border-[#D5C2B1] rounded-xl text-base font-mono font-bold focus:ring-2 focus:ring-[#8C4A26] outline-none"
                    />
                  </div>
                )}

                {/* Actual Counted Total Summary Banner */}
                <div className="flex items-center justify-between p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">
                      إجمالي النقدية الفعلية المحصية في الخزنة:
                    </span>
                  </div>
                  <span className="text-xl font-bold font-mono text-emerald-800">
                    {formatCurrency(effectiveActualCash)}
                  </span>
                </div>
              </div>

              {/* STEP 3: RECONCILIATION RESULT, NOTES, AND CONFIRMATION */}
              <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[#F0E6DC] pb-3">
                  <span className="w-7 h-7 rounded-full bg-[#542E1D] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#341B11]">
                      المطابقة، الملاحظات، وتأكيد العملية في السجلات
                    </h3>
                    <p className="text-[11px] text-[#7A5E4F]">
                      عرض الفرق بين المتوقع والفعلي، تدوين ملاحظات المدير، واعتماد محضر الإقفال
                    </p>
                  </div>
                </div>

                {/* Dynamic Difference Banner */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    Math.abs(difference) < 0.01
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : difference > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {Math.abs(difference) < 0.01 ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    ) : difference > 0 ? (
                      <TrendingUp className="w-8 h-8 text-amber-600 shrink-0" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-rose-600 shrink-0" />
                    )}

                    <div>
                      <h4 className="text-sm font-bold">
                        {Math.abs(difference) < 0.01
                          ? 'مطابقة تامة (Balanced) — النقدية الفعلية تعادل الرصيد المسجل تماماً'
                          : difference > 0
                          ? `يوجد زيادة في الخزنة بمقدار ${formatCurrency(difference)} (Surplus)`
                          : `يوجد عجز في الخزنة بمقدار ${formatCurrency(Math.abs(difference))} (Deficit)`}
                      </h4>
                      <p className="text-xs opacity-90 mt-0.5">
                        {Math.abs(difference) < 0.01
                          ? 'لا يوجد أي نقص أو فائض مالي. يمكن تأكيد واعتماد اليومية فوراً.'
                          : difference > 0
                          ? 'النقدية الفعلية بالدرج أكبر من الرصيد المحاسبي المتوقع، يرجى كتابة السبب في حقل الملاحظات أدناه.'
                          : 'النقدية الفعلية بالدرج أقل من الرصيد المحاسبي المتوقع، يرجى مراجعة فواتير الكاشير والمصروفات غير المسجلة وتدوين المبررات.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left font-mono font-bold text-lg sm:text-xl shrink-0">
                    الفارق: {difference > 0 ? `+${difference}` : difference} ج.م
                  </div>
                </div>

                {/* Dedicated Notes Field (حقل للملاحظات) */}
                <div>
                  <label className="text-xs font-bold text-[#542E1D] block mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#8C4A26]" />
                    <span>حقل ملاحظات المدير وتوثيق الوردية (Notes):</span>
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب هنا أي ملاحظات حول حركة النقدية، تسليم وردية الكاشير، تفسير أي فرق بين الفعلي والمتوقع، أو توصيات للإدارة..."
                    className="w-full p-3 text-xs bg-[#FAF7F2] border border-[#D5C2B1] rounded-xl focus:ring-2 focus:ring-[#8C4A26] outline-none text-[#26160F]"
                  />
                </div>

                {/* Explicit Accounting Rule: Safe Adjustment Checkbox */}
                {Math.abs(difference) >= 0.01 && (
                  <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EDE2D4] flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="createAdjCheckbox"
                      checked={autoCreateAdjustment}
                      onChange={(e) => setAutoCreateAdjustment(e.target.checked)}
                      className="mt-1 rounded text-[#8C4A26] focus:ring-[#8C4A26] cursor-pointer"
                    />
                    <label htmlFor="createAdjCheckbox" className="text-xs text-[#542E1D] cursor-pointer">
                      <strong>تسجيل قيد تسوية مالية في الخزنة تلقائياً بمقدار الفارق ({difference > 0 ? `+${difference}` : difference} ج.م)</strong>
                      <span className="block text-[11px] text-[#7A5E4F] mt-0.5">
                        وفق معايير التدقيق المحاسبي، يُحفظ محضر الإقفال كوثيقة رقابية معتمدة دون تعديل رصيد الخزنة الفعلي، إلا إذا اختار المدير صراحة تسجيل تسوية قيد للخزنة.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons: Confirm & Document (زر تأكيد العملية وتوثيقها) */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[#7A5E4F]">
                  <span>المسؤول المعتمد: <strong>الأستاذ إبراهيم راغب (المدير العام)</strong></span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {existingClosing && (
                    <button
                      type="button"
                      onClick={() => handlePrintProtocol(existingClosing)}
                      className="px-4 py-2.5 rounded-xl border border-[#D5C2B1] bg-white text-xs font-bold text-[#341B11] hover:bg-[#FAF7F2] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-[#8C4A26]" />
                      <span>طباعة المحضر الرسمي</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#064e3b] to-[#047857] hover:from-[#052e16] hover:to-[#065f46] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>
                      {existingClosing
                        ? 'تحديث وتأكيد إقفال اليومية وتوثيق المحضر'
                        : 'تأكيد العملية وتوثيق إقفال اليومية في سجلات النظام'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: AUDIT LOG HISTORY OF DAILY CLOSINGS */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E4D7CA]">
              <div>
                <h3 className="text-sm font-bold text-[#341B11]">
                  سجل محاضر إقفال اليومية المعتمدة (Daily Closings Audit Log)
                </h3>
                <p className="text-xs text-[#7A5E4F]">
                  سجل تاريخي كامل بجميع جلسات المطابقة، الفروقات، الملاحظات، وتواقيع الإدارة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportHistory}
                  className="px-3.5 py-1.5 rounded-xl border border-[#D5C2B1] bg-white text-xs font-bold text-[#341B11] hover:bg-[#FAF7F2] flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير Excel / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reconcile')}
                  className="px-4 py-1.5 rounded-xl bg-[#542E1D] hover:bg-[#341B11] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  + إقفال يومية جديدة
                </button>
              </div>
            </div>

            {allClosings.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#E4D7CA]">
                <Calculator className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-[#542E1D]">لا توجد محاضر إقفال مسجلة حتى الآن</h4>
                <p className="text-xs text-[#7A5E4F] mt-1">
                  قم بإجراء أول عملية مطابقة لتوثيق رصيد الخزنة اليومي
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allClosings.map((closing) => (
                  <div
                    key={closing.id}
                    className="p-4 bg-white rounded-2xl border border-[#E4D7CA] hover:border-[#C28B38] transition-all shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0E6DC] pb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#EDE2D4] text-[#542E1D]">
                          {closing.closingNumber}
                        </span>
                        <span className="text-xs text-[#7A5E4F]">
                          • تاريخ اليومية: <strong>{closing.date}</strong>
                        </span>
                        <span className="text-xs text-[#7A5E4F]">
                          • الاعتماد: {new Date(closing.closedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            closing.status === 'balanced'
                              ? 'bg-emerald-100 text-emerald-800'
                              : closing.status === 'surplus'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {closing.status === 'balanced'
                            ? 'مطابق تماماً'
                            : closing.status === 'surplus'
                            ? `زيادة (+${closing.difference} ج.م)`
                            : `عجز (${closing.difference} ج.م)`}
                        </span>
                        {closing.statusReopened && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                            أعيد فتحه للمراجعة
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(closing.date);
                            setActiveTab('reconcile');
                          }}
                          className="px-3 py-1 rounded-lg border border-[#D5C2B1] text-xs font-bold text-[#542E1D] hover:bg-[#FAF7F2] cursor-pointer"
                        >
                          عرض وتعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setReopenTargetId(closing.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                          title="إعادة فتح اليومية للمراجعة"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                      <div className="bg-[#FAF7F2] p-2 rounded-lg">
                        <span className="text-[10px] text-[#7A5E4F] block">رصيد الافتتاح</span>
                        <span className="font-mono font-bold text-[#341B11]">{formatCurrency(closing.openingBalance)}</span>
                      </div>
                      <div className="bg-[#FAF7F2] p-2 rounded-lg">
                        <span className="text-[10px] text-[#7A5E4F] block">مبيعات نقدية</span>
                        <span className="font-mono font-bold text-emerald-700">{formatCurrency(closing.cashSales)}</span>
                      </div>
                      <div className="bg-[#FAF7F2] p-2 rounded-lg">
                        <span className="text-[10px] text-[#7A5E4F] block">المصروفات النقدية</span>
                        <span className="font-mono font-bold text-rose-700">{formatCurrency(closing.cashExpenses)}</span>
                      </div>
                      <div className="bg-[#FAF7F2] p-2 rounded-lg">
                        <span className="text-[10px] text-[#7A5E4F] block">الرصيد المتوقع</span>
                        <span className="font-mono font-bold text-[#341B11]">{formatCurrency(closing.expectedCash)}</span>
                      </div>
                      <div className="bg-[#FAF7F2] p-2 rounded-lg">
                        <span className="text-[10px] text-[#7A5E4F] block">الرصيد الفعلي المحصى</span>
                        <span className="font-mono font-bold text-emerald-800">{formatCurrency(closing.actualCash)}</span>
                      </div>
                      <div className="bg-[#FAF7F2] p-2 rounded-lg">
                        <span className="text-[10px] text-[#7A5E4F] block">المعتمد</span>
                        <span className="font-bold text-[#542E1D] truncate block">{closing.closedBy}</span>
                      </div>
                    </div>

                    {closing.notes && (
                      <div className="text-xs text-[#7A5E4F] bg-[#FAF7F2] p-2 rounded-lg border border-[#EDE2D4]">
                        <span className="font-bold text-[#542E1D]">ملاحظات الإقفال: </span>
                        <span>"{closing.notes}"</span>
                      </div>
                    )}

                    {closing.statusReopened && closing.reopenReason && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold">سبب إعادة الفتح بواسطة {closing.reopenedBy}: </span>
                        <span>{closing.reopenReason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANALYTICS & CLOSING KPIS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] shadow-2xs">
                <span className="text-xs text-[#7A5E4F] block">إجمالي محاضر الإقفال المعتمدة</span>
                <strong className="text-2xl font-bold font-mono text-[#542E1D] block mt-1">
                  {totalClosings}
                </strong>
                <span className="text-[11px] text-emerald-700 mt-1 block">
                  {balancedClosings} يومية مطابقة بدون أي فروقات
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] shadow-2xs">
                <span className="text-xs text-[#7A5E4F] block">نسبة مطابقة النقدية (Accuracy Rate)</span>
                <strong className="text-2xl font-bold font-mono text-emerald-700 block mt-1">
                  %{balancedRate}
                </strong>
                <span className="text-[11px] text-[#7A5E4F] mt-1 block">
                  مؤشر الانضباط المالي والرقابة على الكاشير
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] shadow-2xs">
                <span className="text-xs text-[#7A5E4F] block">صافي الفارق التاريخي التراكمي</span>
                <strong
                  className={`text-2xl font-bold font-mono block mt-1 ${
                    Math.abs(netHistoricalVariance) < 0.01
                      ? 'text-emerald-700'
                      : netHistoricalVariance > 0
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(netHistoricalVariance)}
                </strong>
                <span className="text-[11px] text-[#7A5E4F] mt-1 block">
                  {netHistoricalVariance >= 0 ? 'صافي زيادة تراكمية' : 'صافي عجز تراكمي'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E4D7CA] space-y-3">
              <h4 className="text-sm font-bold text-[#341B11] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#8C4A26]" />
                <span>إرشادات الرقابة المحاسبية لإقفال الخزنة اليومية في KANDY</span>
              </h4>
              <ul className="text-xs text-[#7A5E4F] space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong>عدم مساواة المبيعات برصيد الخزنة:</strong> رصيد الخزنة المتوقع يتأثر بحركات متعددة (رصيد الافتتاح، المبيعات النقدية، تحصيلات الديون، المصروفات اليومية، وسلف العمال)، وليس بالمبيعات وحدها.
                </li>
                <li>
                  <strong>محضر الإقفال كوثيقة رقابية:</strong> توثيق إقفال اليومية لا يُعدّل رصيد الخزنة تلقائياً ولا ينشئ قيوداً وهمية، لحماية السجلات المالية من التلاعب.
                </li>
                <li>
                  <strong>حصر الفئات النقدية (Denominations):</strong> تفنيد الفئات النقدية المصرية (200، 100، 50، 20، 10، 5، وفكة) يقلل احتمالية أخطاء العد اليدوي ويوفر دليلاً موثوقاً في حال مراجعة الوردية.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Reopen Closing Dialog Modal */}
      {reopenTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-300 p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-2.5 text-amber-800">
              <RotateCcw className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-bold">إعادة فتح إقفال اليومية للمراجعة</h3>
            </div>
            <p className="text-xs text-[#7A5E4F] leading-relaxed">
              وفق ضوابط الحوكمة المحاسبية لنظام كاندي، تتطلب إعادة فتح يوم مقفل تدوين سبب مبرر يُسجل في محضر التدقيق باسم المدير المسؤول.
            </p>
            <div>
              <label className="text-xs font-bold text-[#542E1D] block mb-1">
                سبب إعادة الفتح (مطلوب):
              </label>
              <textarea
                rows={2}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="مثال: تصحيح فاتورة مرتجع تم إدخالها متأخراً أو إعادة عد فئات النقدية..."
                className="w-full p-2.5 text-xs bg-[#FAF7F2] border border-[#D5C2B1] rounded-xl focus:ring-2 focus:ring-[#8C4A26] outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReopenTargetId(null);
                  setReopenReason('');
                }}
                className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!reopenReason.trim()}
                onClick={handleConfirmReopen}
                className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                تأكيد إعادة الفتح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const EndOfDayClosingScreen = EndOfDayClosing;
export default EndOfDayClosing;

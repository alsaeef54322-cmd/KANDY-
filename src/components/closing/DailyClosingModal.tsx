import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Calculator,
  History,
  FileText,
  Calendar,
  Lock,
  ArrowRight,
  Printer,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { db } from '../../services/storage';
import { DailyClosing, DailyClosingDenominations } from '../../types';
import { formatCurrency } from '../../services/accounting';

interface DailyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate?: string;
}

export const DailyClosingModal: React.FC<DailyClosingModalProps> = ({
  isOpen,
  onClose,
  targetDate,
}) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
  const [selectedDate, setSelectedDate] = useState<string>(
    targetDate || new Date().toISOString().split('T')[0]
  );
  const [useDenominations, setUseDenominations] = useState(true);
  const [manualActualCash, setManualActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [autoCreateAdjustment, setAutoCreateAdjustment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reopen modal state
  const [reopenClosingId, setReopenClosingId] = useState<string | null>(null);
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

  // Calculate day cash statistics from existing safe transactions
  const dayStats = useMemo(() => {
    return db.calculateDayExpectedCash(selectedDate);
  }, [selectedDate, isOpen]);

  // Existing closing for this date if any
  const existingClosing = useMemo(() => {
    return db.getDailyClosingByDate(selectedDate);
  }, [selectedDate, isOpen, successMessage]);

  const pastClosings = useMemo(() => {
    return db.getDailyClosings();
  }, [isOpen, successMessage]);

  // Denominations total sum
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
      // Pre-fill manual with expected cash as convenience baseline
      setManualActualCash(dayStats.expectedCash);
      setNotes('');
    }
  }, [selectedDate, existingClosing, dayStats.expectedCash]);

  if (!isOpen) return null;

  const handleDenominationChange = (key: keyof DailyClosingDenominations, val: number) => {
    setDenominations((prev) => ({
      ...prev,
      [key]: Math.max(0, val || 0),
    }));
  };

  const handleSaveClosing = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const session = db.getSession();
      db.saveDailyClosing({
        date: selectedDate,
        closedBy: session.name || 'الأستاذ إبراهيم راغب',
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
        notes,
        denominations: useDenominations ? denominations : undefined,
        autoCreateAdjustment,
      });

      setSuccessMessage('تم اعتماد وحفظ إقفال اليومية بنجاح وتسجيل محضر التدقيق');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving daily closing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReopen = () => {
    if (!reopenClosingId || !reopenReason.trim()) return;
    db.reopenDailyClosing(reopenClosingId, reopenReason.trim());
    setReopenClosingId(null);
    setReopenReason('');
    setSuccessMessage('تمت إعادة فتح اليومية بنجاح لإجراء التعديلات المطلوبة');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePrintClosing = (closing: DailyClosing) => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF7F2] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E0D2C3] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1E110A] via-[#341B11] to-[#064e3b] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>معالج إقفال اليومية ومراجعة الخزنة</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  Daily Closing Wizard
                </span>
              </h2>
              <p className="text-xs text-[#E8DCCE]">
                مطابقة رصيد الخزنة المحاسبي مع النقدية الفعلية واعتماد محضر نهاية اليوم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/30 rounded-lg p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('wizard')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeTab === 'wizard'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                معالج الإقفال
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل الإقفالات ({pastClosings.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-600 text-white text-xs py-2.5 px-4 font-semibold flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'wizard' ? (
            <form onSubmit={handleSaveClosing} className="space-y-5">
              {/* Target Date Selector */}
              <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8C4A26]" />
                  <span className="text-xs font-bold text-[#341B11]">تاريخ اليومية المستهدفة:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#D5C2B1] rounded-lg font-mono font-bold text-[#341B11] focus:outline-none focus:ring-1 focus:ring-[#8C4A26]"
                  />
                </div>

                {existingClosing && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-lg border border-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>تم إقفال هذا اليوم سابقاً برقم: <strong>{existingClosing.closingNumber}</strong></span>
                    {existingClosing.statusReopened && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                        أعيد فتحه
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Step 1: Cash Drawer Balance Breakdown */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0E6DC] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#542E1D] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-[#341B11]">
                      الحركات المسجلة والرصيد المحاسبي المتوقع
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#7A5E4F]">
                    {dayStats.transactionsCount} حركات مسجلة بالخزنة
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EDE2D4]">
                    <span className="text-[10px] text-[#7A5E4F] block">رصيد الافتتاح</span>
                    <strong className="text-xs sm:text-sm font-bold font-mono text-[#341B11]">
                      {formatCurrency(dayStats.openingBalance)}
                    </strong>
                  </div>

                  <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-emerald-700 block">+ مبيعات نقدية</span>
                    <strong className="text-xs sm:text-sm font-bold font-mono text-emerald-800">
                      {formatCurrency(dayStats.cashSales)}
                    </strong>
                  </div>

                  <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
                    <span className="text-[10px] text-emerald-700 block">+ تحصيلات وإيداعات</span>
                    <strong className="text-xs sm:text-sm font-bold font-mono text-emerald-800">
                      {formatCurrency(dayStats.cashInflows)}
                    </strong>
                  </div>

                  <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/60">
                    <span className="text-[10px] text-rose-700 block">- مصروفات نقدية</span>
                    <strong className="text-xs sm:text-sm font-bold font-mono text-rose-800">
                      {formatCurrency(dayStats.cashExpenses)}
                    </strong>
                  </div>

                  <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/60">
                    <span className="text-[10px] text-rose-700 block">- مسحوبات ومشتريات</span>
                    <strong className="text-xs sm:text-sm font-bold font-mono text-rose-800">
                      {formatCurrency(dayStats.cashOutflows)}
                    </strong>
                  </div>

                  <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="text-[10px] text-amber-700 block">- مرتجعات نقدية</span>
                    <strong className="text-xs sm:text-sm font-bold font-mono text-amber-800">
                      {formatCurrency(dayStats.cashReturns)}
                    </strong>
                  </div>
                </div>

                {/* Expected Cash Banner */}
                <div className="bg-gradient-to-r from-[#F5ECE1] to-[#EBE0D2] p-3.5 rounded-xl border border-[#DDCBB8] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#542E1D] font-bold block">
                      الرصيد المحاسبي المتوقع في نهاية اليوم (Expected Drawer Cash):
                    </span>
                    <span className="text-[11px] text-[#7A5E4F]">
                      رصيد الافتتاح + إجمالي الوارد النقدي - إجمالي المنصرف النقدي
                    </span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-[#064e3b]">
                    {formatCurrency(dayStats.expectedCash)}
                  </div>
                </div>
              </div>

              {/* Step 2: Physical Count (Denominations or Direct Sum) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0E6DC] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#542E1D] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-[#341B11]">
                      إدخال الجرد الفعلي للنقدية (Physical Cash Count)
                    </h3>
                  </div>

                  {/* Toggle Mode */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#7A5E4F]">طريقة الإدخال:</span>
                    <button
                      type="button"
                      onClick={() => setUseDenominations(true)}
                      className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                        useDenominations
                          ? 'bg-[#542E1D] text-white'
                          : 'bg-[#FAF7F2] text-[#6B5345] hover:bg-[#F3ECE2]'
                      }`}
                    >
                      تفنيد الفئات (موصى به)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseDenominations(false)}
                      className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                        !useDenominations
                          ? 'bg-[#542E1D] text-white'
                          : 'bg-[#FAF7F2] text-[#6B5345] hover:bg-[#F3ECE2]'
                      }`}
                    >
                      إجمالي مباشر
                    </button>
                  </div>
                </div>

                {useDenominations ? (
                  <div className="space-y-3">
                    <p className="text-xs text-[#7A5E4F]">
                      أدخل عدد الأوراق النقدية لكل فئة مصرية ليقوم النظام باحتساب الإجمالي تلقائياً:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {[
                        { key: 'd200' as const, label: 'فئة 200 ج.م', val: 200 },
                        { key: 'd100' as const, label: 'فئة 100 ج.م', val: 100 },
                        { key: 'd50' as const, label: 'فئة 50 ج.م', val: 50 },
                        { key: 'd20' as const, label: 'فئة 20 ج.م', val: 20 },
                        { key: 'd10' as const, label: 'فئة 10 ج.م', val: 10 },
                        { key: 'd5' as const, label: 'فئة 5 ج.م', val: 5 },
                      ].map((denom) => (
                        <div
                          key={denom.key}
                          className="bg-[#FAF7F2] p-2 rounded-xl border border-[#E6D9CC] flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-bold text-[#542E1D] mb-1">
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
                            className="w-full px-2 py-1 bg-white border border-[#D5C2B1] rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#8C4A26]"
                          />
                          <span className="text-[10px] text-[#8C7A6D] text-center mt-1 font-mono">
                            = {formatCurrency((denominations[denom.key] || 0) * denom.val)}
                          </span>
                        </div>
                      ))}

                      {/* Coins & Small change */}
                      <div className="bg-[#FAF7F2] p-2 rounded-xl border border-[#E6D9CC] flex flex-col justify-between">
                        <span className="text-[11px] font-bold text-[#542E1D] mb-1">
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
                          className="w-full px-2 py-1 bg-white border border-[#D5C2B1] rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#8C4A26]"
                        />
                        <span className="text-[10px] text-[#8C7A6D] text-center mt-1 font-mono">
                          = {formatCurrency(denominations.coins || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-[#542E1D] block mb-1">
                      إجمالي النقدية المحصية في الدرج (ج.م):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualActualCash}
                      onChange={(e) => setManualActualCash(parseFloat(e.target.value) || 0)}
                      className="w-full max-w-xs px-3 py-2 bg-white border border-[#D5C2B1] rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#8C4A26]"
                    />
                  </div>
                )}

                {/* Counted Cash Summary */}
                <div className="flex items-center justify-between p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
                  <span className="text-xs font-bold text-emerald-900">
                    إجمالي النقدية الفعلية المحصية:
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-800">
                    {formatCurrency(effectiveActualCash)}
                  </span>
                </div>
              </div>

              {/* Step 3: Variance & Sign-off */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#F0E6DC] pb-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#542E1D] text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-[#341B11]">
                    نتيجة المقارنة واعتماد محضر الإقفال
                  </h3>
                </div>

                {/* Variance Display Badge */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    Math.abs(difference) < 0.01
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : difference > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {Math.abs(difference) < 0.01 ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    ) : difference > 0 ? (
                      <TrendingUp className="w-7 h-7 text-amber-600 shrink-0" />
                    ) : (
                      <TrendingDown className="w-7 h-7 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold">
                        {Math.abs(difference) < 0.01
                          ? 'مطابقة تامة (Balanced)'
                          : difference > 0
                          ? `يوجد زيادة في النقدية بقيمة ${formatCurrency(difference)}`
                          : `يوجد عجز في النقدية بقيمة ${formatCurrency(Math.abs(difference))}`}
                      </h4>
                      <p className="text-xs opacity-90">
                        {Math.abs(difference) < 0.01
                          ? 'الرصيد الفعلي في الدرج مساوٍ تماماً للحركات المحاسبية المسجلة.'
                          : difference > 0
                          ? 'النقدية الفعلية تزيد عن الرصيد المحاسبي المتوقع، يُرجى تدوين السبب في الملاحظات.'
                          : 'النقدية الفعلية تقل عن الرصيد المحاسبي المتوقع، يُرجى تدقيق الفواتير والمصروفات.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left font-mono font-bold text-base sm:text-lg shrink-0">
                    الفارق: {difference > 0 ? `+${difference}` : difference} ج.م
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-xs font-bold text-[#542E1D] block mb-1">
                    ملاحظات الإقفال ومبررات الفارق (إن وجدت):
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب أي ملاحظة عن حركة النقدية، تسليم الوردية، أو تفسير الفارق..."
                    className="w-full p-2.5 text-xs bg-[#FAF7F2] border border-[#D5C2B1] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8C4A26]"
                  />
                </div>

                {/* Strict Accounting Rule: Safe Adjustment is explicit and optional */}
                {Math.abs(difference) >= 0.01 && (
                  <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE2D4] flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="adjCheck"
                      checked={autoCreateAdjustment}
                      onChange={(e) => setAutoCreateAdjustment(e.target.checked)}
                      className="mt-0.5 rounded text-[#8C4A26] focus:ring-[#8C4A26]"
                    />
                    <label htmlFor="adjCheck" className="text-xs text-[#542E1D] cursor-pointer">
                      <strong>تسجيل حركة تسوية مالية في الخزنة تلقائياً بمقدار الفارق</strong>
                      <span className="block text-[11px] text-[#7A5E4F] mt-0.5">
                        وفق المعايير المحاسبية، يتم تسجيل محضر الإقفال كوثيقة تدقيق دون تغيير رصيد الخزنة، إلا إذا قرر المدير اعتماد تسوية قيد صريحة.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#D5C2B1] text-xs font-bold text-[#6B5345] hover:bg-[#F3ECE2] transition-colors"
                >
                  إلغاء وتراجع
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {existingClosing && (
                    <button
                      type="button"
                      onClick={() => handlePrintClosing(existingClosing)}
                      className="px-4 py-2.5 rounded-xl border border-[#D5C2B1] bg-white text-xs font-bold text-[#341B11] hover:bg-[#FAF7F2] flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-[#8C4A26]" />
                      <span>طباعة المحضر</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#064e3b] to-[#047857] hover:from-[#052e16] hover:to-[#065f46] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>{existingClosing ? 'تحديث وتأكيد إقفال اليومية' : 'اعتماد وحفظ إقفال اليومية'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Tab 2: Past Closings History */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#341B11]">
                    سجل محاضر إقفال اليومية السابقة
                  </h3>
                  <p className="text-xs text-[#7A5E4F]">
                    سجل كامل بالتواريخ، النقدية الفعلية، الفروقات، والملاحظات المعتمدة
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('wizard')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#542E1D] text-white text-xs font-bold hover:bg-[#341B11] transition-colors"
                >
                  + إقفال جديد
                </button>
              </div>

              {pastClosings.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#E6D9CC]">
                  <Calculator className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#7A5E4F]">
                    لا توجد محاضر إقفال مسجلة حتى الآن
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastClosings.map((closing) => (
                    <div
                      key={closing.id}
                      className="p-4 bg-white rounded-xl border border-[#E6D9CC] shadow-2xs hover:border-[#C28B38] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#542E1D]">
                            {closing.closingNumber}
                          </span>
                          <span className="text-xs text-[#7A5E4F]">• تاريخ: {closing.date}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              closing.status === 'balanced'
                                ? 'bg-emerald-100 text-emerald-800'
                                : closing.status === 'surplus'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {closing.status === 'balanced'
                              ? 'مطابق'
                              : closing.status === 'surplus'
                              ? `زيادة (+${closing.difference} ج.م)`
                              : `عجز (${closing.difference} ج.م)`}
                          </span>
                          {closing.statusReopened && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                              أعيد فتحه
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#341B11] flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          <span>
                            المتوقع:{' '}
                            <strong className="font-mono">{formatCurrency(closing.expectedCash)}</strong>
                          </span>
                          <span>
                            الفعلي:{' '}
                            <strong className="font-mono text-[#064e3b]">
                              {formatCurrency(closing.actualCash)}
                            </strong>
                          </span>
                          <span>
                            المعتمد:{' '}
                            <strong className="text-[#542E1D]">{closing.closedBy}</strong>
                          </span>
                        </div>

                        {closing.notes && (
                          <p className="text-[11px] text-[#7A5E4F] italic bg-[#FAF7F2] p-1.5 rounded mt-1 border border-[#EDE2D4]">
                            "{closing.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(closing.date);
                            setActiveTab('wizard');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#D5C2B1] text-xs font-bold text-[#542E1D] hover:bg-[#FAF7F2]"
                        >
                          عرض وتعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => setReopenClosingId(closing.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100"
                          title="إعادة فتح اليومية"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Reopen Dialog if active */}
        {reopenClosingId && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="w-full sm:flex-1">
              <span className="text-xs font-bold text-amber-900 block mb-1">
                سبب إعادة فتح اليومية (مطلوب للتدقيق المحاسبي):
              </span>
              <input
                type="text"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="مثال: تصحيح فاتورة مرتجع متأخرة أو تعديل جرد النقدية..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-amber-950 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReopenClosingId(null)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs text-amber-900 hover:bg-amber-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!reopenReason.trim()}
                onClick={handleConfirmReopen}
                className="px-4 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-bold hover:bg-amber-800 disabled:opacity-50"
              >
                تأكيد إعادة الفتح
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

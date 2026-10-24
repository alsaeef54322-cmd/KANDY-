import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { db } from '../../services/storage';
import { computeFinancialSummary, formatCurrency, DateFilterType } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const ProfitLossScreen: React.FC = () => {
  const [period, setPeriod] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [summary, setSummary] = useState(computeFinancialSummary('month'));
  const [activeDrillDown, setActiveDrillDown] = useState<string | null>(null);

  const refreshSummary = () => {
    setSummary(computeFinancialSummary(period, customStart, customEnd));
  };

  useEffect(() => {
    refreshSummary();
    const unsub = db.subscribe(refreshSummary);
    return () => unsub();
  }, [period, customStart, customEnd]);

  const handleExportExcel = () => {
    ExportService.exportFinancialReport(summary);
  };


  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">قائمة الأرباح والخسائر والمركز المالي</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            التحليل المحاسبي الدقيق: صافي المبيعات، تكلفة البضاعة المباعة بالجرام، والمصروفات وصافي الربح
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E0D2C3] shadow-2xs">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'last_month', label: 'الشهر السابق' },
              { id: 'all', label: 'كامل المدة' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as DateFilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === tab.id
                    ? 'bg-[#542E1D] text-white shadow-xs'
                    : 'text-[#6B5345] hover:bg-[#F5ECE1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>


      {/* Main Income Statement Layout (matching mockup) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Card: Profit Margin Gauge & Donut */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between items-center text-center">
          <div className="w-full text-right mb-2">
            <h3 className="text-sm font-bold text-[#341B11]">هامش الربح الصافي</h3>
            <p className="text-[11px] text-[#8C7A6D]">نسبة صافي الربح إلى صافي المبيعات</p>
          </div>

          <div className="relative w-44 h-44 flex items-center justify-center my-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#F5ECE1" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#2B7A4B"
                strokeWidth="3.5"
                strokeDasharray={`${Math.min(100, Math.max(0, summary.netMarginPercent))}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-2xl font-extrabold font-mono text-[#1E5C36]">
                {summary.netMarginPercent}%
              </div>
              <div className="text-[10px] text-[#8C7A6D]">هامش صافي</div>
            </div>
          </div>

          <div className="w-full p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4] space-y-1.5 text-xs text-right">
            <div className="flex justify-between text-[#6B5345]">
              <span>هامش مجمل الربح:</span>
              <strong className="font-mono text-[#341B11]">{summary.grossMarginPercent}%</strong>
            </div>
            <div className="flex justify-between text-[#6B5345]">
              <span>نسبة تكلفة البضاعة:</span>
              <strong className="font-mono text-amber-700">
                {summary.netSales > 0 ? ((summary.cogs / summary.netSales) * 100).toFixed(1) : 0}%
              </strong>
            </div>
            <div className="flex justify-between text-[#6B5345]">
              <span>نسبة المصروفات:</span>
              <strong className="font-mono text-rose-600">
                {summary.netSales > 0 ? ((summary.operatingExpenses / summary.netSales) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>
        </div>

        {/* Center Card: Structured Accounting Income Statement (Matching mockup) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D7]">
            <h3 className="text-sm font-bold text-[#341B11]">بيان الدخل التفصيلي — {summary.periodLabel}</h3>
            <span className="text-[11px] bg-[#FAF7F2] text-[#542E1D] px-2 py-0.5 rounded font-mono font-bold border border-[#DAC8B6]">
              ج.م (EGP)
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Gross Sales */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2]">
              <span className="text-[#6B5345]">إجمالي المبيعات (Gross Sales)</span>
              <span className="font-mono font-bold text-[#341B11]">
                {formatCurrency(summary.grossSales)}
              </span>
            </div>

            {/* Deductions: Discounts & Returns */}
            {(summary.discounts > 0 || summary.returns > 0) && (
              <div className="pl-3 pr-2 space-y-1 text-[11px] text-[#8C7A6D]">
                {summary.discounts > 0 && (
                  <div className="flex justify-between">
                    <span>- الخصومات الممنوحة:</span>
                    <span className="font-mono text-rose-600">- {formatCurrency(summary.discounts)}</span>
                  </div>
                )}
                {summary.returns > 0 && (
                  <div className="flex justify-between">
                    <span>- مرتجعات المبيعات:</span>
                    <span className="font-mono text-rose-600">- {formatCurrency(summary.returns)}</span>
                  </div>
                )}
              </div>
            )}

            {/* 2. Net Sales */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F5ECE1] border border-[#E0D2C3] font-bold">
              <span className="text-[#542E1D]">صافي المبيعات (Net Sales)</span>
              <span className="font-mono text-[#542E1D] text-sm">
                {formatCurrency(summary.netSales)}
              </span>
            </div>

            {/* 3. COGS */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2]">
              <span className="text-[#6B5345]">(-) تكلفة البضاعة المباعة (COGS)</span>
              <span className="font-mono font-bold text-amber-800">
                {formatCurrency(summary.cogs)}
              </span>
            </div>

            {/* 4. Gross Profit */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EDE2D4] font-bold">
              <span className="text-[#341B11]">مجمل الربح (Gross Profit)</span>
              <span className="font-mono text-[#2B7A4B] text-sm">
                {formatCurrency(summary.grossProfit)}
              </span>
            </div>

            {/* 5. Operating Expenses */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2]">
              <span className="text-[#6B5345]">(-) المصروفات التشغيلية (Expenses)</span>
              <span className="font-mono font-bold text-rose-600">
                {formatCurrency(summary.operatingExpenses)}
              </span>
            </div>

            {/* 6. Spoilage Loss */}
            {summary.spoilageLoss > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50">
                <span className="text-rose-700">(-) خسائر التالف والهالك المعترف بها</span>
                <span className="font-mono font-bold text-rose-600">
                  {formatCurrency(summary.spoilageLoss)}
                </span>
              </div>
            )}

            {/* 7. Final Net Profit */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF8F1] border-2 border-[#BDE3CB] font-extrabold mt-3">
              <div>
                <div className="text-sm text-[#195230]">صافي الربح النهائي (Net Profit)</div>
                <div className="text-[10px] text-[#2B7A4B] font-semibold mt-0.5">
                  بعد خصم التكلفة والمصروفات والتالف
                </div>
              </div>
              <div className="font-mono text-lg text-[#195230]">
                {formatCurrency(summary.netProfit)}
              </div>
            </div>
          </div>
        </div>

        {/* Left Card: Performance Bar Chart Across Days / Months */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#341B11]">أداء الأرباح خلال الفترة</h3>
              <span className="text-[11px] text-[#8C7A6D]">مقارنة الإيراد بالربح</span>
            </div>
            <p className="text-xs text-[#7A5E4F] mb-6">
              المقارنة البصرية بين صافي المبيعات (العمود البني) وصافي الربح المحقق (العمود الأخضر).
            </p>
          </div>

          {/* SVG Bar Chart Representation */}
          <div className="h-44 w-full flex items-end justify-between px-2 gap-2 border-b border-[#EAE1D7] pb-2">
            {[
              { day: 'السبت', sales: 65, profit: 25 },
              { day: 'الأحد', sales: 75, profit: 32 },
              { day: 'الإثنين', sales: 50, profit: 20 },
              { day: 'الثلاثاء', sales: 85, profit: 38 },
              { day: 'الأربعاء', sales: 60, profit: 24 },
              { day: 'الخميس', sales: 95, profit: 45 },
              { day: 'الجمعة', sales: 90, profit: 40 },
            ].map((col, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5 h-36">
                  <div
                    style={{ height: `${col.sales}%` }}
                    className="w-2.5 bg-[#8C4A26] rounded-t-sm"
                    title={`مبيعات: ${col.sales}`}
                  />
                  <div
                    style={{ height: `${col.profit}%` }}
                    className="w-2.5 bg-[#2B7A4B] rounded-t-sm"
                    title={`ربح: ${col.profit}`}
                  />
                </div>
                <span className="text-[9px] text-[#8C7A6D] truncate max-w-full">{col.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#8C4A26] rounded-sm" />
              <span className="text-[#6B5345]">صافي المبيعات</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#2B7A4B] rounded-sm" />
              <span className="text-[#6B5345]">صافي الربح</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../../services/storage';
import { computeFinancialSummary, formatCurrency, DateFilterType } from '../../services/accounting';
import { NavItemKey } from '../layout/Sidebar';

interface DashboardScreenProps {
  onNavigate: (tab: NavItemKey) => void;
}

// Lightweight, zero-dependency number counter that runs ONCE on load to avoid continuous resets
const AnimatedNumber: React.FC<{ value: number; formatter?: (v: number) => string; durationMs?: number }> = ({
  value,
  formatter,
  durationMs = 500,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedRef = React.useRef(false);

  useEffect(() => {
    if (animatedRef.current) {
      setDisplayValue(value);
      return;
    }
    animatedRef.current = true;

    if (!value || isNaN(value)) {
      setDisplayValue(value || 0);
      return;
    }

    let startTime: number | null = null;
    const startVal = 0;
    const targetVal = value;

    const animateStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * ease);
      setDisplayValue(current);
      if (progress < 1) {
        window.requestAnimationFrame(animateStep);
      } else {
        setDisplayValue(targetVal);
      }
    };
    window.requestAnimationFrame(animateStep);
  }, [value, durationMs]);

  return <>{formatter ? formatter(displayValue) : displayValue}</>;
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [summary, setSummary] = useState(computeFinancialSummary('month'));

  const refreshSummary = () => {
    setSummary(computeFinancialSummary(period, customStart, customEnd));
  };

  useEffect(() => {
    refreshSummary();
    const unsub = db.subscribe(refreshSummary);
    return () => unsub();
  }, [period, customStart, customEnd]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2] animate-fade-in">
      {/* Welcome Banner & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">لوحة التحكم الرئيسية</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            ملخص الأداء المالي، المبيعات، حركة الأصناف، والسيولة النقدية لمحمصة كاندي
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E0D2C3] shadow-2xs">
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'yesterday', label: 'أمس' },
            { id: 'week', label: 'آخر 7 أيام' },
            { id: 'month', label: 'هذا الشهر' },
            { id: 'last_month', label: 'الشهر السابق' },
            { id: 'all', label: 'الكل' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as DateFilterType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 btn-tactile cursor-pointer ${
                period === tab.id
                  ? 'bg-[#542E1D] text-white shadow-xs'
                  : 'text-[#6B5345] hover:bg-[#F5ECE1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards (5 cards with staggered animations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Net Sales */}
        <div
          onClick={() => onNavigate('sales')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in stagger-1"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-2">
            <span className="font-semibold">صافي المبيعات</span>
            <div className="flex items-center text-[10px] text-[#2B7A4B] font-bold">
              <span>↑ 12%</span>
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-[#341B11] group-hover:text-[#542E1D]">
            <AnimatedNumber value={summary.netSales} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1 flex items-center justify-between">
            <span>{summary.invoiceCount} فاتورة</span>
            <span className="text-gray-400 group-hover:text-[#542E1D] transition-colors">عرض التفاصيل ←</span>
          </div>
        </div>

        {/* 2. COGS */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in stagger-2"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-2">
            <span className="font-semibold">تكلفة البضاعة المباعة</span>
            <div className="flex items-center text-[10px] text-amber-700 font-bold">
              <span>↑ 8%</span>
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-[#341B11]">
            <AnimatedNumber value={summary.cogs} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">
            متوسط التكلفة بالجرام
          </div>
        </div>

        {/* 3. Gross Profit */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in stagger-3"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-2">
            <span className="font-semibold">مجمل الربح</span>
            <div className="flex items-center text-[10px] text-[#2B7A4B] font-bold">
              <span>↑ 15%</span>
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-[#341B11]">
            <AnimatedNumber value={summary.grossProfit} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#2B7A4B] font-semibold mt-1">
            هامش مجمل: {summary.grossMarginPercent}%
          </div>
        </div>

        {/* 4. Operating Expenses */}
        <div
          onClick={() => onNavigate('expenses')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in stagger-4"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-2">
            <span className="font-semibold">المصروفات المستحقة</span>
            <div className="flex items-center text-[10px] text-rose-600 font-bold">
              <span>↑ 6%</span>
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-[#341B11]">
            <AnimatedNumber value={summary.operatingExpenses} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">
            إيجار، رواتب، كهرباء
          </div>
        </div>

        {/* 5. Net Profit (Highlighted in soft mint/green as in mockup) */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-[#EDF8F1] p-4 rounded-xl border border-[#BDE3CB] shadow-2xs hover:shadow-md transition-all cursor-pointer group ring-1 ring-[#2B7A4B]/20 card-tactile animate-fade-in stagger-5"
        >
          <div className="flex items-center justify-between text-xs text-[#1D5E37] mb-2">
            <span className="font-bold">صافي الربح</span>
            <div className="flex items-center text-[10px] text-[#1D5E37] font-extrabold bg-[#D9F2E2] px-1.5 py-0.5 rounded">
              <span>↑ 18%</span>
            </div>
          </div>
          <div className="text-lg font-extrabold font-mono text-[#195230]">
            <AnimatedNumber value={summary.netProfit} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#1D5E37] font-semibold mt-1">
            هامش صافي: {summary.netMarginPercent}%
          </div>
        </div>
      </div>

      {/* Middle Row: Sales Trend Chart + Best Selling Donut + Roastery Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Trend Chart (Interactive SVG chart matching mockup) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#341B11]">حركة المبيعات اليومية</h3>
              <p className="text-[11px] text-[#8C7A6D]">مقارنة الإيرادات عبر أيام الأسبوع</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#542E1D] bg-[#F5ECE1] px-2 py-0.5 rounded">
              الأسبوع الحالي
            </span>
          </div>

          {/* SVG Line Curve Chart */}
          <div className="h-44 w-full relative flex items-end pt-4 pb-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8C4A26" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#8C4A26" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Background horizontal grid lines */}
              <line x1="0" y1="20" x2="400" y2="20" stroke="#F0E6DC" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="#F0E6DC" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="#F0E6DC" strokeDasharray="3 3" />

              {/* Area fill */}
              <path
                d="M 10,95 Q 60,80 120,88 T 240,40 T 320,50 T 390,25 L 390,120 L 10,120 Z"
                fill="url(#chartGrad)"
              />
              {/* Line stroke */}
              <path
                d="M 10,95 Q 60,80 120,88 T 240,40 T 320,50 T 390,25"
                fill="none"
                stroke="#8C4A26"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Data points */}
              <circle cx="10" cy="95" r="3.5" fill="#542E1D" />
              <circle cx="120" cy="88" r="3.5" fill="#542E1D" />
              <circle cx="240" cy="40" r="3.5" fill="#542E1D" />
              <circle cx="320" cy="50" r="3.5" fill="#542E1D" />
              <circle cx="390" cy="25" r="4" fill="#2B7A4B" />
            </svg>
          </div>

          {/* Days axis labels */}
          <div className="flex justify-between text-[11px] text-[#8C7A6D] pt-2 border-t border-[#F0E6DC]">
            <span>الجمعة</span>
            <span>الخميس</span>
            <span>الأربعاء</span>
            <span>الثلاثاء</span>
            <span>الإثنين</span>
            <span>الأحد</span>
            <span>السبت</span>
          </div>
        </div>

        {/* Top Selling Categories Donut */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#341B11]">أكثر المنتجات مبيعاً</h3>
            <span className="text-[11px] text-[#8C7A6D]">حسب حجم الإيرادات</span>
          </div>

          <div className="flex items-center justify-center my-3 gap-6">
            {/* Donut representation */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EFE5D8" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#542E1D"
                  strokeWidth="4"
                  strokeDasharray="32, 100"
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#8C4A26"
                  strokeWidth="4"
                  strokeDasharray="24, 100"
                  strokeDashoffset="-32"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#C28B38"
                  strokeWidth="4"
                  strokeDasharray="18, 100"
                  strokeDashoffset="-56"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#2B7A4B"
                  strokeWidth="4"
                  strokeDasharray="14, 100"
                  strokeDashoffset="-74"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#A68F80"
                  strokeWidth="4"
                  strokeDasharray="12, 100"
                  strokeDashoffset="-88"
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-sm font-bold font-mono text-[#341B11]">1,240</div>
                <div className="text-[9px] text-[#8C7A6D]">كجم / صنف</div>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#542E1D]" />
                <span className="text-[#6B5345]">مكسرات:</span>
                <strong className="font-mono text-[#341B11]">32%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8C4A26]" />
                <span className="text-[#6B5345]">شوكولاتة:</span>
                <strong className="font-mono text-[#341B11]">24%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C28B38]" />
                <span className="text-[#6B5345]">حلويات:</span>
                <strong className="font-mono text-[#341B11]">18%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2B7A4B]" />
                <span className="text-[#6B5345]">علب مغلفة:</span>
                <strong className="font-mono text-[#341B11]">14%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A68F80]" />
                <span className="text-[#6B5345]">أخرى:</span>
                <strong className="font-mono text-[#341B11]">12%</strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('products')}
            className="w-full py-1.5 text-center text-xs text-[#542E1D] font-bold hover:bg-[#FAF7F2] rounded-lg transition-colors border border-transparent hover:border-[#E0D2C3]"
          >
            عرض كتالوج المنتجات والأقسام ←
          </button>
        </div>

        {/* Roastery Alerts & Status Box (from mockup) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C28B38]" />
                <h3 className="text-sm font-bold text-[#341B11]">تنبيهات المحمصة</h3>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                مهم
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => onNavigate('inventory')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[#542E1D] font-medium">منتجات ناقصة في المخزون:</span>
                </div>
                <strong className="text-rose-600 font-bold font-mono">
                  {summary.lowStockCount} أصناف
                </strong>
              </div>

              <div
                onClick={() => onNavigate('suppliers')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <span className="text-[#542E1D] font-medium">مستحقات واجبة للموردين:</span>
                <strong className="text-amber-700 font-bold font-mono">
                  {formatCurrency(summary.totalSupplierDebt)}
                </strong>
              </div>

              <div
                onClick={() => onNavigate('customers')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <span className="text-[#542E1D] font-medium">ديون العملاء الآجلة:</span>
                <strong className="text-[#542E1D] font-bold font-mono">
                  {formatCurrency(summary.totalCustomerDebt)}
                </strong>
              </div>


              <div
                onClick={() => onNavigate('safe')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <span className="text-[#542E1D] font-medium">رصيد الخزنة الفعلي:</span>
                <strong className="text-[#2B7A4B] font-bold font-mono">
                  {formatCurrency(summary.safeBalance)}
                </strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0E6DC] text-[11px] text-[#8C7A6D] flex items-center justify-between">
            <span>قيمة المخزون بالتكلفة:</span>
            <strong className="font-mono text-[#341B11]">{formatCurrency(summary.inventoryCostValue)}</strong>
          </div>
        </div>
      </div>

      {/* Bottom Quick Actions (6 big shortcut cards from mockup) */}
      <div>
        <h3 className="text-xs font-bold text-[#6B5345] mb-2.5">اختصارات العمليات السريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('sales')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#542E1D] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">فاتورة جديدة</span>
          </button>

          <button
            onClick={() => onNavigate('purchases')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6B3B24] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">مشتريات</span>
          </button>

          <button
            onClick={() => onNavigate('suppliers')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#8C4A26] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">موردين</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#A65E35] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">المخزون</span>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#542E1D] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">المصروفات</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2B7A4B] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">التقارير</span>
          </button>
        </div>
      </div>
    </div>
  );
};

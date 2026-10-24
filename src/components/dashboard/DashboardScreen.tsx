import React, { useState, useEffect, useMemo } from 'react';
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
  Calculator,
  BarChart3,
  Coins,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { db } from '../../services/storage';
import {
  computeFinancialSummary,
  computeProductAnalytics,
  formatCurrency,
  DateFilterType,
} from '../../services/accounting';
import { NavItemKey } from '../layout/Sidebar';
import { DailyClosingModal } from '../closing/DailyClosingModal';
import { ProductAnalyticsModal } from '../analytics/ProductAnalyticsModal';
import { SmartAlertsBanner } from '../common/SmartAlertsBanner';

interface DashboardScreenProps {
  onNavigate: (tab: NavItemKey) => void;
}

// Lightweight animated counter that updates smoothly
const AnimatedNumber: React.FC<{
  value: number;
  formatter?: (v: number) => string;
  durationMs?: number;
}> = ({ value, formatter, durationMs = 400 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = React.useRef(value);

  useEffect(() => {
    if (prevRef.current === value) {
      setDisplayValue(value);
      return;
    }

    const startVal = prevRef.current;
    const targetVal = value;
    prevRef.current = value;

    let startTime: number | null = null;
    const animateStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
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
  const [summary, setSummary] = useState(() => computeFinancialSummary('month'));

  // Modals state
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const refreshSummary = () => {
    setSummary(computeFinancialSummary(period, customStart, customEnd));
  };

  useEffect(() => {
    refreshSummary();
    const unsub = db.subscribe(refreshSummary);
    return () => unsub();
  }, [period, customStart, customEnd]);

  // Product Analytics for live bestsellers & slow movers
  const productAnalytics = useMemo(() => {
    return computeProductAnalytics(period, customStart, customEnd);
  }, [period, customStart, customEnd, summary]);

  const topSellingProducts = useMemo(() => {
    return [...productAnalytics]
      .filter((p) => p.totalQuantitySold > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [productAnalytics]);

  const slowMovingProducts = useMemo(() => {
    return [...productAnalytics]
      .filter((p) => p.currentStock > 0 && p.totalQuantitySold === 0)
      .slice(0, 4);
  }, [productAnalytics]);

  // Latest daily closing record
  const latestClosing = useMemo(() => {
    const closings = db.getDailyClosings();
    return closings.length > 0 ? closings[0] : null;
  }, [summary, isClosingModalOpen]);

  // Customers needing review (high debt)
  const customersNeedingReview = useMemo(() => {
    return db
      .getCustomers()
      .filter((c) => c.balanceDue > 0)
      .sort((a, b) => b.balanceDue - a.balanceDue)
      .slice(0, 4);
  }, [summary]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#FAF7F2] animate-fade-in">
      {/* 1. Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#341B11]">
              مركز القيادة والتحليلات التنفيذية
            </h2>
            <span className="text-[10px] bg-[#064e3b]/15 text-[#064e3b] font-bold px-2 py-0.5 rounded-full border border-[#064e3b]/30">
              KANDY Command Center
            </span>
          </div>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            المتابعة اللحظية للإيرادات، التحصيل النقدي، الأرباح الحقيقية، وإقفال اليومية
          </p>
        </div>

        {/* Quick Action Buttons on Top Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsClosingModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#064e3b] to-[#047857] hover:from-[#052e16] hover:to-[#065f46] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-200" />
            <span>معالج إقفال اليومية</span>
          </button>

          <button
            onClick={() => setIsAnalyticsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#D5C2B1] hover:bg-[#FAF7F2] text-[#542E1D] text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#8C4A26]" />
            <span>تحليلات الأصناف المتقدمة</span>
          </button>

          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E0D2C3] shadow-2xs overflow-x-auto scrollbar-none">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
      </div>

      {/* 2. Smart Alerts Center Banner */}
      <SmartAlertsBanner
        onNavigate={onNavigate}
        onOpenClosingWizard={() => setIsClosingModalOpen(true)}
      />

      {/* 3. Primary KPI Cards with Strict Accounting Distinction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Net Sales / Revenues */}
        <div
          onClick={() => onNavigate('sales')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-1.5">
            <span className="font-bold text-[#341B11]">صافي الإيرادات (المبيعات)</span>
            <div
              className={`flex items-center text-[10px] font-bold ${
                summary.salesGrowthPercent >= 0 ? 'text-[#2B7A4B]' : 'text-rose-600'
              }`}
            >
              <span>
                {summary.salesGrowthPercent >= 0 ? '↑' : '↓'} {Math.abs(summary.salesGrowthPercent)}%
              </span>
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-[#341B11] group-hover:text-[#542E1D]">
            <AnimatedNumber value={summary.netSales} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1 flex items-center justify-between">
            <span>{summary.invoiceCount} فواتير مباعة</span>
            <span className="text-stone-400 group-hover:text-[#542E1D]">عرض الفواتير ←</span>
          </div>
        </div>

        {/* 2. Actual Cash Collections */}
        <div
          onClick={() => onNavigate('safe')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-1.5">
            <span className="font-bold text-[#341B11]">التحصيل النقدي بالخزنة</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold font-mono text-[#064e3b]">
            <AnimatedNumber value={summary.cashCollections} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">
            نقدية فعلية وردت الخزنة
          </div>
        </div>

        {/* 3. Cost of Goods Sold (COGS) */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-1.5">
            <span className="font-bold text-[#341B11]">تكلفة البضاعة المباعة</span>
            <span className="text-[10px] text-amber-700 font-bold">COGS</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#7A5E4F]">
            <AnimatedNumber value={summary.cogs} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">
            مجمل الربح: {formatCurrency(summary.grossProfit)}
          </div>
        </div>

        {/* 4. Operating Expenses */}
        <div
          onClick={() => onNavigate('expenses')}
          className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs hover:shadow-md transition-all cursor-pointer group card-tactile animate-fade-in"
        >
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-1.5">
            <span className="font-bold text-[#341B11]">المصروفات التشغيلية</span>
            <span className="text-[10px] text-rose-600 font-bold">مسجلة</span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-800">
            <AnimatedNumber value={summary.operatingExpenses} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">
            إيجار، تشغيل، أجور، خدمات
          </div>
        </div>

        {/* 5. Net Profit (Strict Accounting Equation) */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-[#EDF8F1] p-4 rounded-xl border border-[#BDE3CB] shadow-2xs hover:shadow-md transition-all cursor-pointer group ring-1 ring-[#2B7A4B]/20 card-tactile animate-fade-in"
        >
          <div className="flex items-center justify-between text-xs text-[#1D5E37] mb-1.5">
            <span className="font-extrabold">صافي الربح الحقيقي</span>
            <span className="text-[10px] text-[#1D5E37] font-extrabold bg-[#D9F2E2] px-1.5 py-0.5 rounded">
              هامش: {summary.netMarginPercent}%
            </span>
          </div>
          <div className="text-lg font-extrabold font-mono text-[#195230]">
            <AnimatedNumber value={summary.netProfit} formatter={formatCurrency} />
          </div>
          <div className="text-[10px] text-[#1D5E37] font-semibold mt-1">
            المبيعات - التكلفة - المصروفات
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Cash Safe Summary & Daily Closing Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash Safe Balance & Daily Closing Widget */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#F0E6DC] pb-2.5">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#C28B38]" />
                <h3 className="text-sm font-bold text-[#341B11]">حركات الخزنة وإقفال اليومية</h3>
              </div>
              <button
                onClick={() => setIsClosingModalOpen(true)}
                className="text-[11px] font-bold text-[#064e3b] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
              >
                جرد وإقفال اليومية ←
              </button>
            </div>

            <div className="space-y-3">
              {/* Safe Balance Hero */}
              <div className="bg-gradient-to-r from-[#FAF7F2] to-[#F5ECE1] p-3.5 rounded-xl border border-[#E6D9CC] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#7A5E4F] block">الرصيد الفعلي للخزنة الآن:</span>
                  <strong className="text-lg font-bold font-mono text-[#064e3b]">
                    {formatCurrency(summary.safeBalance)}
                  </strong>
                </div>
                <div className="text-left text-[11px] text-[#7A5E4F]">
                  <div>وارد الفترة: <span className="font-mono text-emerald-700 font-bold">{formatCurrency(summary.cashInflows)}</span></div>
                  <div>صادر الفترة: <span className="font-mono text-rose-700 font-bold">{formatCurrency(summary.cashOutflows)}</span></div>
                </div>
              </div>

              {/* Latest Closing Status */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#542E1D]">آخر محضر إقفال معتمد:</span>
                  {latestClosing ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        latestClosing.status === 'balanced'
                          ? 'bg-emerald-100 text-emerald-800'
                          : latestClosing.status === 'surplus'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {latestClosing.status === 'balanced'
                        ? 'مطابق تماماً'
                        : latestClosing.status === 'surplus'
                        ? `زيادة (+${latestClosing.difference} ج.م)`
                        : `عجز (${latestClosing.difference} ج.م)`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400">لا يوجد</span>
                  )}
                </div>

                {latestClosing && (
                  <div className="text-[11px] text-[#7A5E4F] flex items-center justify-between">
                    <span>التاريخ: {latestClosing.date}</span>
                    <span>الفعلي: <strong className="font-mono text-[#341B11]">{formatCurrency(latestClosing.actualCash)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0E6DC] flex items-center justify-between text-xs">
            <span className="text-[#8C7A6D]">إجمالي قيمة المخزون بالتكلفة:</span>
            <strong className="font-mono text-[#341B11]">{formatCurrency(summary.inventoryCostValue)}</strong>
          </div>
        </div>

        {/* Bestselling Products Widget (Real computed data) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#F0E6DC] pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2B7A4B]" />
                <h3 className="text-sm font-bold text-[#341B11]">المنتجات الأكثر مبيعاً</h3>
              </div>
              <button
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="text-[11px] font-bold text-[#542E1D] hover:underline"
              >
                عرض كل الأصناف ←
              </button>
            </div>

            {topSellingProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8C7A6D]">
                لا توجد مبيعات مسجلة في الفترة المحددة
              </div>
            ) : (
              <div className="space-y-2.5">
                {topSellingProducts.map((prod, idx) => (
                  <div
                    key={prod.productId}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#542E1D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-[#341B11] truncate block">
                          {prod.productName}
                        </span>
                        <span className="text-[10px] text-[#8C7A6D]">
                          {prod.type === 'weight'
                            ? `${prod.totalQuantitySold.toFixed(2)} كجم`
                            : `${prod.totalQuantitySold} ${prod.saleUnit}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-mono font-bold text-[#064e3b] shrink-0">
                      {formatCurrency(prod.totalRevenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#F0E6DC] text-[11px] text-[#8C7A6D] flex items-center justify-between">
            <span>مبيعات اليوم:</span>
            <strong className="font-mono text-[#341B11]">{formatCurrency(summary.todaySales)}</strong>
          </div>
        </div>

        {/* Transactions & Items Requiring Review */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#F0E6DC] pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#341B11]">عمليات تستحق المراجعة</h3>
              </div>
              <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                تدقيق
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* 1. Low stock review */}
              <div
                onClick={() => onNavigate('inventory')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[#542E1D] font-medium">أصناف قاربت أو نفدت:</span>
                </div>
                <strong className="text-rose-600 font-bold font-mono">
                  {summary.lowStockCount} أصناف
                </strong>
              </div>

              {/* 2. Missing cost price products */}
              <div
                onClick={() => onNavigate('products')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <span className="text-[#542E1D] font-medium">أصناف بدون سعر تكلفة معتمد:</span>
                <strong className="text-amber-700 font-bold font-mono">
                  {summary.missingCostCount} أصناف
                </strong>
              </div>

              {/* 3. High Customer Debts */}
              <div
                onClick={() => onNavigate('customers')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <span className="text-[#542E1D] font-medium">ديون العملاء الآجلة:</span>
                <strong className="text-[#542E1D] font-bold font-mono">
                  {formatCurrency(summary.totalCustomerDebt)}
                </strong>
              </div>

              {/* 4. Supplier Due Balances */}
              <div
                onClick={() => onNavigate('suppliers')}
                className="p-2.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#EDE2D4] cursor-pointer transition-colors flex items-center justify-between"
              >
                <span className="text-[#542E1D] font-medium">مستحقات واجبة للموردين:</span>
                <strong className="text-amber-700 font-bold font-mono">
                  {formatCurrency(summary.totalSupplierDebt)}
                </strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F0E6DC] text-[11px] text-[#8C7A6D] flex items-center justify-between">
            <span>فواتير آجلة قيد التحصيل:</span>
            <span className="text-[#064e3b] font-bold">متابعة العملاء ←</span>
          </div>
        </div>
      </div>

      {/* 5. Slow Moving & Stagnant Inventory Preview */}
      {slowMovingProducts.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#F0E6DC] pb-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#341B11] flex items-center gap-2">
                <span>تنبيه المنتجات الراكدة وبطيئة الحركة</span>
                <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono">
                  Slow Movers
                </span>
              </h3>
              <p className="text-[11px] text-[#8C7A6D]">
                أصناف متوفرة في المخزن ولم تسجل أي حركة بيع خلال الفترة المحددة
              </p>
            </div>
            <button
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="text-xs font-bold text-[#542E1D] hover:underline"
            >
              تقرير الركود الكامل ←
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {slowMovingProducts.map((p) => (
              <div
                key={p.productId}
                className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4] flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#341B11] truncate">{p.productName}</div>
                  <div className="text-[10px] text-[#8C7A6D]">{p.categoryName}</div>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold font-mono text-amber-800 block">
                    {p.currentStockDisplay}
                  </span>
                  <span className="text-[9px] text-stone-500">في المخزن</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Bottom Direct Navigation Shortcuts */}
      <div>
        <h3 className="text-xs font-bold text-[#6B5345] mb-2.5">اختصارات العمليات اليومية السريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('sales')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">نقطة البيع (Ctrl+2)</span>
          </button>

          <button
            onClick={() => setIsClosingModalOpen(true)}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#542E1D] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calculator className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">إقفال اليومية</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6B3B24] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">المخزون والجرد</span>
          </button>

          <button
            onClick={() => onNavigate('safe')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#8C4A26] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#341B11]">حركات الخزنة</span>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="p-3.5 bg-white hover:bg-[#F5ECE1] rounded-xl border border-[#E6D9CC] flex flex-col items-center justify-center gap-2 group transition-all shadow-2xs hover:shadow-sm card-tactile btn-tactile cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#A65E35] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coins className="w-5 h-5" />
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
            <span className="text-xs font-bold text-[#341B11]">التقارير المالية</span>
          </button>
        </div>
      </div>

      {/* Daily Closing Wizard Modal */}
      <DailyClosingModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
      />

      {/* Product Analytics Modal */}
      <ProductAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />
    </div>
  );
};

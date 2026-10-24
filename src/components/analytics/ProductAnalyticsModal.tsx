import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Package,
  Layers,
  ArrowUpDown,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { computeProductAnalytics, formatCurrency, DateFilterType } from '../../services/accounting';
import { ProductAnalyticsItem } from '../../types';

interface ProductAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProduct?: (productId: string) => void;
}

export const ProductAnalyticsModal: React.FC<ProductAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToProduct,
}) => {
  const [period, setPeriod] = useState<DateFilterType>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'bestseller' | 'steady' | 'slow' | 'dormant'>('all');
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'profit' | 'margin'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const analytics = useMemo(() => {
    return computeProductAnalytics(period, customStart, customEnd);
  }, [period, customStart, customEnd, isOpen]);

  const categories = useMemo(() => {
    const set = new Set(analytics.map((a) => a.categoryName));
    return Array.from(set);
  }, [analytics]);

  const filteredAndSorted = useMemo(() => {
    let list = analytics.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || item.categoryName === categoryFilter;
      const matchVelocity = velocityFilter === 'all' || item.velocityRank === velocityFilter;
      return matchSearch && matchCat && matchVelocity;
    });

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'quantity') {
        valA = a.totalQuantitySold;
        valB = b.totalQuantitySold;
      } else if (sortBy === 'revenue') {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (sortBy === 'profit') {
        valA = a.grossProfit ?? -999999;
        valB = b.grossProfit ?? -999999;
      } else if (sortBy === 'margin') {
        valA = a.profitMarginPercent ?? -999999;
        valB = b.profitMarginPercent ?? -999999;
      }

      if (sortOrder === 'desc') {
        return valB - valA;
      }
      return valA - valB;
    });

    return list;
  }, [analytics, searchQuery, categoryFilter, velocityFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const totalSoldUnits = analytics.reduce((acc, a) => acc + a.totalQuantitySold, 0);
    const totalRevenue = analytics.reduce((acc, a) => acc + a.totalRevenue, 0);
    const missingCostCount = analytics.filter((a) => !a.hasReliableCost).length;
    const bestsellersCount = analytics.filter((a) => a.velocityRank === 'bestseller').length;
    const slowCount = analytics.filter((a) => a.velocityRank === 'slow').length;

    return { totalSoldUnits, totalRevenue, missingCostCount, bestsellersCount, slowCount };
  }, [analytics]);

  if (!isOpen) return null;

  const toggleSort = (col: 'quantity' | 'revenue' | 'profit' | 'margin') => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF7F2] w-full max-w-5xl rounded-2xl shadow-2xl border border-[#E0D2C3] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E110A] via-[#341B11] to-[#542E1D] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>تحليلات حركة وربحية المنتجات</span>
                <span className="text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                  Product Intelligence
                </span>
              </h2>
              <p className="text-xs text-[#E8DCCE]">
                تحليل دقيق للأصناف الأكثر مبيعاً، الأقل حركة، وهوامش الربح الحقيقية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & KPI bar */}
        <div className="p-4 sm:p-5 border-b border-[#E6D9CC] bg-white space-y-3 shrink-0">
          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E0D2C3] overflow-x-auto">
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'yesterday', label: 'أمس' },
                { id: 'week', label: 'آخر 7 أيام' },
                { id: 'month', label: 'هذا الشهر' },
                { id: 'last_month', label: 'الشهر السابق' },
                { id: 'all', label: 'كل الفترات' },
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

            {/* Quick KPI badges */}
            <div className="flex items-center gap-2 text-xs">
              <div className="bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#EDE2D4]">
                <span className="text-[#7A5E4F]">إجمالي إيراد الأصناف: </span>
                <strong className="text-[#341B11] font-mono font-bold">
                  {formatCurrency(stats.totalRevenue)}
                </strong>
              </div>

              <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-semibold">الأكثر طلباً: </span>
                <strong className="text-emerald-800 font-mono font-bold">
                  {stats.bestsellersCount} أصناف
                </strong>
              </div>

              <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <span className="text-amber-800 font-semibold">راكدة / بطيئة: </span>
                <strong className="text-amber-900 font-mono font-bold">
                  {stats.slowCount} أصناف
                </strong>
              </div>
            </div>
          </div>

          {/* Missing Cost Warning Banner if any */}
          {stats.missingCostCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  يوجد <strong>{stats.missingCostCount}</strong> منتجات بدون سعر تكلفة شراء معتمد؛ تم حجب هوامش الربح لها منعاً لعرض نتائج غير دقيقة وفق المعايير المالية.
                </span>
              </div>
            </div>
          )}

          {/* Search & Segment Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#8C7A6D] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الكود، أو القسم..."
                className="w-full pr-9 pl-3 py-1.5 bg-[#FAF7F2] border border-[#D5C2B1] rounded-xl text-xs text-[#341B11] focus:outline-none focus:ring-1 focus:ring-[#8C4A26]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D5C2B1] rounded-xl text-xs text-[#341B11] focus:outline-none"
              >
                <option value="all">كل الأقسام</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Velocity Filter */}
              <select
                value={velocityFilter}
                onChange={(e) => setVelocityFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D5C2B1] rounded-xl text-xs text-[#341B11] focus:outline-none"
              >
                <option value="all">كل سرعات الحركة</option>
                <option value="bestseller">الأكثر مبيعاً 🔥</option>
                <option value="steady">حركة متوسطة ⚡</option>
                <option value="slow">بطيئة الحركة ⏳</option>
                <option value="dormant">لم يُباع 💤</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="bg-white rounded-2xl border border-[#E6D9CC] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F5ECE1] text-[#542E1D] border-b border-[#E0D2C3] font-bold">
                    <th className="py-3 px-3.5">المنتج والكود</th>
                    <th className="py-3 px-3">القسم</th>
                    <th
                      onClick={() => toggleSort('quantity')}
                      className="py-3 px-3 cursor-pointer hover:bg-[#EDE0D2] select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>الكمية المباعة</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('revenue')}
                      className="py-3 px-3 cursor-pointer hover:bg-[#EDE0D2] select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>إجمالي الإيراد</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('profit')}
                      className="py-3 px-3 cursor-pointer hover:bg-[#EDE0D2] select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>مجمل الربح</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('margin')}
                      className="py-3 px-3 cursor-pointer hover:bg-[#EDE0D2] select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>هامش الربح</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3">المخزون الحالي</th>
                    <th className="py-3 px-3">معدل الحركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6DC]">
                  {filteredAndSorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#8C7A6D]">
                        لا توجد أصناف تطابق معايير الفلترة المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredAndSorted.map((item) => (
                      <tr key={item.productId} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-[#341B11]">{item.productName}</div>
                          <span className="text-[10px] font-mono text-[#8C7A6D]">{item.productCode}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#6B5345]">{item.categoryName}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#341B11]">
                          {item.type === 'weight'
                            ? `${item.totalQuantitySold.toFixed(2)} كجم`
                            : `${item.totalQuantitySold} ${item.saleUnit}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#064e3b]">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.hasReliableCost && item.grossProfit !== null ? (
                            <span
                              className={`font-bold ${
                                item.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {formatCurrency(item.grossProfit)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              غير محدد (نقص تكلفة)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.hasReliableCost && item.profitMarginPercent !== null ? (
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                item.profitMarginPercent >= 20
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.profitMarginPercent > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.profitMarginPercent}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-mono font-semibold ${
                              item.isLowStock ? 'text-rose-600 font-bold' : 'text-[#341B11]'
                            }`}
                          >
                            {item.currentStockDisplay}
                          </span>
                          {item.isLowStock && (
                            <span className="block text-[9px] text-rose-600 font-bold">منخفض!</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.velocityRank === 'bestseller' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              🔥 الأكثر مبيعاً
                            </span>
                          )}
                          {item.velocityRank === 'steady' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              ⚡ حركة جيدة
                            </span>
                          )}
                          {item.velocityRank === 'slow' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              ⏳ بطيئة الحركة
                            </span>
                          )}
                          {item.velocityRank === 'dormant' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                              💤 لم يُباع
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-white border-t border-[#E6D9CC] flex items-center justify-between text-xs text-[#7A5E4F] shrink-0">
          <span>
            يتم تحديث التحليلات تلقائياً مع كل فاتورة بيع جديدة في نقطة البيع POS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#542E1D] text-white font-bold hover:bg-[#341B11] transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

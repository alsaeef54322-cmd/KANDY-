import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  AlertTriangle,
  ClipboardCheck,
  Printer,
  Bell,
  BellRing,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  X,
  ShieldAlert,
  SlidersHorizontal,
  PackageX,
  ShoppingBag,
} from 'lucide-react';
import { InventoryMovement, Product, Category } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';
import { printReportDocument } from '../../services/printService';
import { SpoilageScreen } from '../spoilage/SpoilageScreen';
import { StocktakeScreen } from '../stocktake/StocktakeScreen';

export const InventoryScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'levels' | 'movements' | 'spoilage' | 'stocktake'>('levels');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Movements Filters
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [movementType, setMovementType] = useState<string>('all');
  const [movementSearch, setMovementSearch] = useState('');

  // Stock Levels Filters
  const [levelCategory, setLevelCategory] = useState<string>('all');
  const [levelStatusFilter, setLevelStatusFilter] = useState<'all' | 'critical' | 'low' | 'near' | 'safe'>('all');
  const [levelSearch, setLevelSearch] = useState('');

  // Automatic Alerts Settings
  const [autoAlertsEnabled, setAutoAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('kandy_auto_stock_alerts') !== 'false';
  });
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);

  const loadData = () => {
    setMovements(db.getInventoryMovements());
    setProducts(db.getProducts());
    setCategories(db.getCategories());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleToggleAutoAlerts = () => {
    const newVal = !autoAlertsEnabled;
    setAutoAlertsEnabled(newVal);
    localStorage.setItem('kandy_auto_stock_alerts', newVal ? 'true' : 'false');
    db.addAuditLog(
      'UPDATE',
      'InventoryAlerts',
      newVal ? 'تم تفعيل التنبيهات التلقائية للنواقص ومستويات الأمان' : 'تم تعطيل التنبيهات التلقائية للنواقص'
    );
  };

  // Stock Levels Analytics
  const stockMetrics = useMemo(() => {
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let nearThresholdCount = 0;
    let safeCount = 0;
    let totalStockValue = 0;

    products.forEach((p) => {
      const stockVal = p.stockQuantity * p.costPricePerStockUnit;
      totalStockValue += stockVal;

      if (p.stockQuantity <= 0) {
        outOfStockCount++;
      } else if (p.stockQuantity <= p.minStockAlert) {
        lowStockCount++;
      } else if (p.stockQuantity <= p.minStockAlert * 1.3) {
        nearThresholdCount++;
      } else {
        safeCount++;
      }
    });

    const urgentReplenishCount = outOfStockCount + lowStockCount;

    return {
      outOfStockCount,
      lowStockCount,
      nearThresholdCount,
      safeCount,
      urgentReplenishCount,
      totalStockValue,
    };
  }, [products]);

  // Filtered Products for Levels Tab
  const filteredLevelProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = levelCategory === 'all' || p.categoryId === levelCategory;
      const q = levelSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);

      const isOutOfStock = p.stockQuantity <= 0;
      const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;
      const isNear = p.stockQuantity > p.minStockAlert && p.stockQuantity <= p.minStockAlert * 1.3;
      const isSafe = p.stockQuantity > p.minStockAlert * 1.3;

      let matchStatus = true;
      if (levelStatusFilter === 'critical') matchStatus = isOutOfStock;
      if (levelStatusFilter === 'low') matchStatus = isLow;
      if (levelStatusFilter === 'near') matchStatus = isNear;
      if (levelStatusFilter === 'safe') matchStatus = isSafe;

      return matchCat && matchSearch && matchStatus;
    });
  }, [products, levelCategory, levelSearch, levelStatusFilter]);

  // Filtered Movements for Movements Tab
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchProduct = selectedProductId === 'all' || m.productId === selectedProductId;
      const matchType = movementType === 'all' || m.type === movementType;
      const q = movementSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.referenceSource.toLowerCase().includes(q) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q));
      return matchProduct && matchType && matchSearch;
    });
  }, [movements, selectedProductId, movementType, movementSearch]);

  // Export Stock Levels to Excel
  const handleExportStockLevelsExcel = () => {
    const rows = filteredLevelProducts.map((p) => {
      const isOutOfStock = p.stockQuantity <= 0;
      const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;
      const statusLabel = isOutOfStock
        ? 'نفد بالكامل (حرج)'
        : isLow
        ? 'منخفض (تحت الحد الأدنى)'
        : p.stockQuantity <= p.minStockAlert * 1.3
        ? 'قارب على النفاد'
        : 'آمن ومتاح';

      const currentQty =
        p.type === 'weight' ? (p.stockQuantity / 1000).toFixed(3) + ' كجم' : p.stockQuantity + ' ' + p.stockUnit;
      const minQty =
        p.type === 'weight' ? (p.minStockAlert / 1000).toFixed(3) + ' كجم' : p.minStockAlert + ' ' + p.stockUnit;

      const deficit = Math.max(0, p.minStockAlert * 2 - p.stockQuantity);
      const suggestedOrder =
        deficit > 0
          ? p.type === 'weight'
            ? (deficit / 1000).toFixed(2) + ' كجم'
            : deficit + ' ' + p.stockUnit
          : 'لا يوجد عجز';

      return {
        'كود الصنف': p.code,
        'اسم المنتج': p.name,
        'القسم': p.categoryName,
        'الكمية المتوفرة': currentQty,
        'الكمية الدنيا (حد التنبيه)': minQty,
        'الحالة والمستوى': statusLabel,
        'الكمية المقترح طلبها': suggestedOrder,
        'سعر التكلفة': p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit,
        'سعر البيع': p.salePricePerSaleUnit,
      };
    });
    ExportService.exportToExcel(rows, `مستويات_المخزون_والنواقص_${new Date().toISOString().split('T')[0]}`);
  };

  // Print Stock Levels Report (A4)
  const handlePrintStockLevels = () => {
    printReportDocument({
      title: 'تقرير مستويات المخزون والنواقص ومؤشرات الأمان',
      subtitle: 'محمصة كاندي — الأستاذ إبراهيم راغب',
      kpis: [
        { label: 'إجمالي الأصناف', value: products.length.toString(), color: '#341B11' },
        { label: 'أصناف نفدت بالكامل', value: stockMetrics.outOfStockCount.toString(), color: '#B71C1C' },
        { label: 'أصناف بلغت الحد الأدنى', value: stockMetrics.lowStockCount.toString(), color: '#C28B38' },
        { label: 'أصناف قاربت على النفاد', value: stockMetrics.nearThresholdCount.toString(), color: '#8C4A26' },
      ],
      columns: [
        { header: 'الكود', align: 'center', width: '12%' },
        { header: 'اسم المنتج', align: 'right', width: '25%' },
        { header: 'القسم', align: 'right', width: '16%' },
        { header: 'الكمية المتوفرة', align: 'center', width: '15%' },
        { header: 'الحد الأدنى', align: 'center', width: '12%' },
        { header: 'الحالة', align: 'center', width: '10%' },
        { header: 'المقترح طلبه', align: 'left', width: '10%' },
      ],
      rows: filteredLevelProducts.map((p) => {
        const isOutOfStock = p.stockQuantity <= 0;
        const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;
        const statusLabel = isOutOfStock
          ? 'نفد (0)'
          : isLow
          ? 'منخفض'
          : p.stockQuantity <= p.minStockAlert * 1.3
          ? 'قارب على النفاد'
          : 'آمن';

        const deficit = Math.max(0, p.minStockAlert * 2 - p.stockQuantity);
        const orderSuggestion =
          deficit > 0
            ? p.type === 'weight'
              ? `${(deficit / 1000).toFixed(2)} كجم`
              : `${deficit} ${p.stockUnit}`
            : '—';

        return [
          p.code,
          p.name,
          p.categoryName,
          p.type === 'weight' ? `${(p.stockQuantity / 1000).toFixed(3)} كجم` : `${p.stockQuantity} ${p.stockUnit}`,
          p.type === 'weight' ? `${(p.minStockAlert / 1000).toFixed(2)} كجم` : `${p.minStockAlert} ${p.stockUnit}`,
          statusLabel,
          orderSuggestion,
        ];
      }),
      summaryNotes: [
        `حالة التنبيهات التلقائية للنواقص: ${autoAlertsEnabled ? 'مفعلة' : 'معطلة'}`,
        `عدد الأصناف العاجلة التي تحتاج لتوريد فوري: ${stockMetrics.urgentReplenishCount} أصناف`,
      ],
    });
  };

  // Export Movements to Excel
  const handleExportMovementsExcel = () => {
    const rows = filteredMovements.map((m) => ({
      'المنتج': m.productName,
      'نوع الحركة':
        m.type === 'purchase'
          ? 'توريد مشتريات'
          : m.type === 'sale'
          ? 'بيع كاشير'
          : m.type === 'sale_return'
          ? 'مرتجع بيع'
          : m.type === 'spoilage'
          ? 'تالف وهالك'
          : 'تسوية جرد',
      'الكمية المحركة': `${m.quantityDelta > 0 ? '+' : ''}${m.quantityDelta} ${m.unit}`,
      'المخزون السابق': m.previousStock,
      'المخزون الجديد': m.newStock,
      'التاريخ': m.date,
      'المرجع': m.referenceSource,
      'المستخدم المسؤول': m.userName,
    }));
    ExportService.exportToExcel(rows, `حركة_المخزون_${new Date().toISOString().split('T')[0]}`);
  };

  // Print Movements
  const handlePrintMovements = () => {
    printReportDocument({
      title: 'سجل تدقيق حركة ومغادرة وتوريد المخزون',
      subtitle: 'محمصة كاندي — الأستاذ إبراهيم راغب',
      columns: [
        { header: 'المنتج', align: 'right', width: '25%' },
        { header: 'نوع الحركة', align: 'center', width: '18%' },
        { header: 'الكمية المحركة', align: 'center', width: '15%' },
        { header: 'المخزون السابق', align: 'center', width: '12%' },
        { header: 'المخزون الجديد', align: 'center', width: '12%' },
        { header: 'التاريخ', align: 'center', width: '10%' },
        { header: 'المسؤول', align: 'right', width: '8%' },
      ],
      rows: filteredMovements.map((m) => [
        m.productName,
        m.type === 'purchase'
          ? 'توريد مشتريات'
          : m.type === 'sale'
          ? 'بيع كاشير'
          : m.type === 'sale_return'
          ? 'مرتجع بيع'
          : m.type === 'spoilage'
          ? 'تالف وهالك'
          : 'تسوية جرد',
        `${m.quantityDelta > 0 ? '+' : ''}${m.quantityDelta} ${m.unit}`,
        m.previousStock,
        m.newStock,
        m.date,
        m.userName,
      ]),
    });
  };

  // Generate WhatsApp/Copyable text for low-stock items
  const lowStockAlertText = useMemo(() => {
    const lowItems = products.filter((p) => p.stockQuantity <= p.minStockAlert);
    if (!lowItems.length) return 'لا توجد أصناف منخفضة المخزون حالياً في محمصة كاندي.';

    const lines = [
      `🔔 *تنبيه نواقص المخزون — محمصة كاندي*`,
      `المدير العام: الأستاذ إبراهيم راغب`,
      `التاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
      `---------------------------------`,
      `قائمة الأصناف التي وصلت للحد الأدنى أو نفدت:`,
    ];

    lowItems.forEach((p, idx) => {
      const isZero = p.stockQuantity <= 0;
      const current =
        p.type === 'weight' ? `${(p.stockQuantity / 1000).toFixed(2)} كجم` : `${p.stockQuantity} ${p.stockUnit}`;
      const min =
        p.type === 'weight' ? `${(p.minStockAlert / 1000).toFixed(2)} كجم` : `${p.minStockAlert} ${p.stockUnit}`;
      const deficit = Math.max(0, p.minStockAlert * 2 - p.stockQuantity);
      const suggested =
        p.type === 'weight' ? `${(deficit / 1000).toFixed(2)} كجم` : `${deficit} ${p.stockUnit}`;

      lines.push(
        `${idx + 1}. *${p.name}* (${p.categoryName})\n   • المتوفر: ${current} ${isZero ? '⚠️ [نفد تماماً]' : '⚠️ [تحت الحد الأدنى]'}\n   • حد الأمان: ${min}\n   • المطلوب طلبه: ${suggested}`
      );
    });

    lines.push(`---------------------------------`);
    lines.push(`يرجى التنسيق العاجل مع الموردين لإعادة التوريد.`);
    return lines.join('\n');
  }, [products]);

  const handleCopyAlertText = () => {
    navigator.clipboard.writeText(lowStockAlertText);
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sub Tabs Bar */}
      <div className="bg-white border-b border-[#EAE1D7] px-3 sm:px-6 pt-2 sm:pt-3 flex items-center justify-between shrink-0 no-print overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Tab 1: Stock Levels & Low Stock Alerts */}
          <button
            onClick={() => setActiveSubTab('levels')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'levels'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-[#C28B38]" />
            <span>مستويات المخزون والإنذار المبكر</span>
            {stockMetrics.urgentReplenishCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold animate-pulse">
                {stockMetrics.urgentReplenishCount}
              </span>
            )}
          </button>

          {/* Tab 2: Movements Log */}
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'movements'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>حركة وسجل المخزون</span>
          </button>

          {/* Tab 3: Spoilage */}
          <button
            onClick={() => setActiveSubTab('spoilage')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'spoilage'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>التالف والهالك وخسائر البضاعة</span>
          </button>

          {/* Tab 4: Stocktake */}
          <button
            onClick={() => setActiveSubTab('stocktake')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'stocktake'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>الجرد الفعلي والتسويات المخزنية</span>
          </button>
        </div>
      </div>

      {/* Tab 1 Content: Stock Levels & Prominent Low Stock Alerting */}
      {activeSubTab === 'levels' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAF7F2] printable-content">
          {/* Header and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE] no-print">
            <div>
              <h2 className="text-xl font-bold text-[#341B11] flex items-center gap-2">
                <span>مستويات المخزون والإنذار المبكر للنواقص</span>
                <span className="text-xs bg-[#542E1D]/10 text-[#542E1D] font-bold px-2 py-0.5 rounded-full">
                  محمصة كاندي
                </span>
              </h2>
              <p className="text-xs text-[#7A5E4F] mt-0.5">
                تلوين تلقائي واضح للأصناف المقتربة من النفاذ، مراقبة حد الأمان، وإرسال تنبيهات فورية للأستاذ إبراهيم راغب
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Automatic Alerts Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleAutoAlerts}
                title={autoAlertsEnabled ? 'التنبيهات التلقائية مفعلة للنواقص' : 'التنبيهات التلقائية معطلة'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  autoAlertsEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                {autoAlertsEnabled ? (
                  <>
                    <BellRing className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span>التنبيه التلقائي: مفعل</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span>التنبيه التلقائي: معطل</span>
                  </>
                )}
              </button>

              {/* Instant Alert Modal Button */}
              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-[#EAE1D7] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#8C4A26]" />
                <span>إرسال تنبيه النواقص</span>
              </button>

              <button
                onClick={handleExportStockLevelsExcel}
                className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>

              <button
                onClick={handlePrintStockLevels}
                className="px-3.5 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#FDE68A]" />
                <span>طباعة تقرير النواقص (A4)</span>
              </button>
            </div>
          </div>

          {/* Urgent Low Stock Notification Strip (Visible when low stock exists) */}
          {stockMetrics.urgentReplenishCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/10 border-2 border-amber-400 text-[#4A2613] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#341B11] flex items-center gap-2">
                    <span>تنبيه عاجل: يوجد {stockMetrics.urgentReplenishCount} منتجاً بحاجة لإعادة التوريد فوراً!</span>
                    {autoAlertsEnabled && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-bold">
                        مفعل تلقائياً
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-[#7A5E4F] mt-0.5">
                    الأصناف المظللة باللون <span className="font-bold text-rose-700">الأحمر</span> نفدت تماماً، والمظللة باللون <span className="font-bold text-amber-700">البرتقالي</span> بلغت أو اقتربت من حد الأمان الأدنى.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLevelStatusFilter('low')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  عرض النواقص فقط
                </button>
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  مشاركة وتصدير القائمة
                </button>
              </div>
            </div>
          )}

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
            {/* Card 1: Total Products */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs">
              <span className="text-[11px] text-[#6B5345] block font-semibold">إجمالي أصناف المحل</span>
              <span className="text-lg font-extrabold font-mono text-[#341B11]">{products.length} صنف</span>
              <span className="text-[10px] text-[#8C7A6D] block mt-0.5">
                قيمة المخزون: {formatCurrency(stockMetrics.totalStockValue)}
              </span>
            </div>

            {/* Card 2: Out of Stock (Red) */}
            <div className={`p-3.5 rounded-xl border shadow-2xs transition-all ${
              stockMetrics.outOfStockCount > 0
                ? 'bg-rose-50 border-rose-300 text-rose-950 ring-1 ring-rose-400'
                : 'bg-white border-[#E6D9CC]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-800">نفد بالكامل (0)</span>
                {stockMetrics.outOfStockCount > 0 && <PackageX className="w-4 h-4 text-rose-600" />}
              </div>
              <span className="text-lg font-extrabold font-mono text-rose-700">
                {stockMetrics.outOfStockCount} صنف
              </span>
              <span className="text-[10px] text-rose-600 block mt-0.5 font-bold">
                {stockMetrics.outOfStockCount > 0 ? 'مبيعات متوقفة لهذا الصنف' : 'لا يوجد نفاد تام'}
              </span>
            </div>

            {/* Card 3: Below Minimum (Orange/Amber) */}
            <div className={`p-3.5 rounded-xl border shadow-2xs transition-all ${
              stockMetrics.lowStockCount > 0
                ? 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-400'
                : 'bg-white border-[#E6D9CC]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800">تحت الحد الأدنى</span>
                {stockMetrics.lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              </div>
              <span className="text-lg font-extrabold font-mono text-amber-700">
                {stockMetrics.lowStockCount} صنف
              </span>
              <span className="text-[10px] text-amber-600 block mt-0.5 font-bold">
                {stockMetrics.lowStockCount > 0 ? 'طلب توريد عاجل مطلوب' : 'مخزون مستقر'}
              </span>
            </div>

            {/* Card 4: Safe Products (Green) */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs">
              <span className="text-[11px] text-[#2B7A4B] block font-semibold">مخزون وفير وآمن</span>
              <span className="text-lg font-extrabold font-mono text-[#2B7A4B]">{stockMetrics.safeCount} صنف</span>
              <span className="text-[10px] text-[#6B5345] block mt-0.5">فوق حد الأمان بنسبة ممتازة</span>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search Bar */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={levelSearch}
                  onChange={(e) => setLevelSearch(e.target.value)}
                  placeholder="ابحث باسم المنتج، الكود، القسم..."
                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg focus:outline-none focus:border-[#6B371E]"
                />
              </div>

              {/* Category Filter */}
              <select
                value={levelCategory}
                onChange={(e) => setLevelCategory(e.target.value)}
                className="text-xs bg-[#FAF7F2] border border-[#DAC8B6] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#6B371E] font-medium text-[#542E1D]"
              >
                <option value="all">كل الأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#DAC8B6]">
                <button
                  type="button"
                  onClick={() => setLevelStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    levelStatusFilter === 'all' ? 'bg-[#542E1D] text-white shadow-xs' : 'text-[#6B5345]'
                  }`}
                >
                  الكل ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLevelStatusFilter('critical')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    levelStatusFilter === 'critical' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-700'
                  }`}
                >
                  نفد تماماً ({stockMetrics.outOfStockCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLevelStatusFilter('low')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    levelStatusFilter === 'low' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800'
                  }`}
                >
                  دون الحد الأدنى ({stockMetrics.lowStockCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLevelStatusFilter('near')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    levelStatusFilter === 'near' ? 'bg-yellow-600 text-white shadow-xs' : 'text-yellow-800'
                  }`}
                >
                  قارب على النفاد ({stockMetrics.nearThresholdCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLevelStatusFilter('safe')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    levelStatusFilter === 'safe' ? 'bg-[#2B7A4B] text-white shadow-xs' : 'text-[#2B7A4B]'
                  }`}
                >
                  آمن ({stockMetrics.safeCount})
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#7A5E4F] font-semibold">
              عرض {filteredLevelProducts.length} من أصل {products.length} صنف
            </div>
          </div>

          {/* VIVID COLOR-CODED STOCK TABLE */}
          <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
                  <tr>
                    <th className="py-3 px-3">الكود</th>
                    <th className="py-3 px-4">اسم المنتج</th>
                    <th className="py-3 px-3">القسم</th>
                    <th className="py-3 px-4">الكمية المتوفرة</th>
                    <th className="py-3 px-4">حد الطلب الأدنى</th>
                    <th className="py-3 px-4">مؤشر كفاية المخزون</th>
                    <th className="py-3 px-4">الحالة والتنبيه</th>
                    <th className="py-3 px-4 text-left">المقترح طلبه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADCCE]">
                  {filteredLevelProducts.map((p) => {
                    const isOutOfStock = p.stockQuantity <= 0;
                    const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;
                    const isNear = p.stockQuantity > p.minStockAlert && p.stockQuantity <= p.minStockAlert * 1.3;

                    // Progress percentage towards safety threshold (minStockAlert)
                    const percentOfMin = p.minStockAlert > 0 ? (p.stockQuantity / p.minStockAlert) * 100 : 100;
                    const deficit = Math.max(0, p.minStockAlert * 2 - p.stockQuantity);

                    // High visibility conditional styling
                    let rowBgClass = 'hover:bg-[#FAF7F2] transition-colors';
                    if (isOutOfStock) {
                      rowBgClass = 'bg-rose-100/90 hover:bg-rose-200/80 border-r-4 border-r-rose-600';
                    } else if (isLow) {
                      rowBgClass = 'bg-amber-100/90 hover:bg-amber-200/80 border-r-4 border-r-amber-500';
                    } else if (isNear) {
                      rowBgClass = 'bg-yellow-50/90 hover:bg-yellow-100/80 border-r-4 border-r-yellow-400';
                    }

                    const currentStockText =
                      p.type === 'weight'
                        ? `${(p.stockQuantity / 1000).toFixed(3)} كجم`
                        : `${p.stockQuantity} ${p.stockUnit}`;

                    const minStockText =
                      p.type === 'weight'
                        ? `${(p.minStockAlert / 1000).toFixed(2)} كجم`
                        : `${p.minStockAlert} ${p.stockUnit}`;

                    const deficitText =
                      deficit > 0
                        ? p.type === 'weight'
                          ? `+ ${(deficit / 1000).toFixed(2)} كجم`
                          : `+ ${deficit} ${p.stockUnit}`
                        : '—';

                    return (
                      <tr key={p.id} className={rowBgClass}>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#542E1D]">{p.code}</td>
                        <td className="py-2.5 px-4 font-bold text-[#2B170E]">
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {isOutOfStock && (
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#6B5345] font-medium">{p.categoryName}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-[#2B170E]">
                          <span className={isOutOfStock ? 'text-rose-700 font-extrabold text-sm' : isLow ? 'text-amber-900 font-bold' : ''}>
                            {currentStockText}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#7A5E4F]">{minStockText}</td>
                        {/* Progress Bar */}
                        <td className="py-2.5 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOutOfStock
                                    ? 'bg-rose-600 w-0'
                                    : isLow
                                    ? 'bg-amber-600'
                                    : isNear
                                    ? 'bg-yellow-500'
                                    : 'bg-[#2B7A4B]'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(isOutOfStock ? 0 : 5, percentOfMin))}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#6B5345] font-mono block">
                              {percentOfMin.toFixed(0)}% من حد الأمان
                            </span>
                          </div>
                        </td>
                        {/* Status Badge */}
                        <td className="py-2.5 px-4">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-white bg-rose-700 px-2.5 py-1 rounded-md shadow-xs animate-pulse">
                              <PackageX className="w-3.5 h-3.5" />
                              <span>نفد بالكامل (0)</span>
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-200 border border-amber-400 px-2.5 py-0.5 rounded-md">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                              <span>تحت الحد الأدنى</span>
                            </span>
                          ) : isNear ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-900 bg-yellow-200/80 border border-yellow-300 px-2 py-0.5 rounded-md">
                              <Bell className="w-3 h-3 text-yellow-700" />
                              <span>قارب على النفاد</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2B7A4B] bg-[#EDF8F1] border border-[#BDE3CB] px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-[#2B7A4B]" />
                              <span>مخزون آمن</span>
                            </span>
                          )}
                        </td>
                        {/* Suggested Replenishment */}
                        <td className="py-2.5 px-4 font-mono font-bold text-left text-[#542E1D]">
                          {deficitText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2 Content: Movements Log */}
      {activeSubTab === 'movements' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
          {/* Header and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE]">
            <div>
              <h2 className="text-xl font-bold text-[#341B11]">سجل تدقيق حركة المخزون</h2>
              <p className="text-xs text-[#7A5E4F] mt-0.5">
                سجل التدقيق الشامل لجميع حركات الإضافة والخصم والمبيعات والتالف بدقة بالجرام
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMovementsExcel}
                className="px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير Excel</span>
              </button>
              <button
                onClick={handlePrintMovements}
                className="px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#8C4A26]" />
                <span>طباعة السجل</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  placeholder="بحث باسم المنتج، المرجع..."
                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg focus:outline-none focus:border-[#6B371E]"
                />
              </div>

              {/* Product Filter */}
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="text-xs bg-[#FAF7F2] border border-[#DAC8B6] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#6B371E]"
              >
                <option value="all">كل المنتجات</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Movement Type Filter */}
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="text-xs bg-[#FAF7F2] border border-[#DAC8B6] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#6B371E]"
              >
                <option value="all">جميع الحركات</option>
                <option value="purchase">توريد مشتريات (+)</option>
                <option value="sale">مبيعات كاشير (-)</option>
                <option value="sale_return">مرتجع مبيعات (+)</option>
                <option value="spoilage">تالف وهالك (-)</option>
                <option value="adjustment">تسوية جرد</option>
              </select>
            </div>

            <div className="text-xs text-[#7A5E4F] font-semibold">
              إجمالي الحركات: {filteredMovements.length}
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
                  <tr>
                    <th className="py-3 px-4">المنتج</th>
                    <th className="py-3 px-4">نوع الحركة</th>
                    <th className="py-3 px-4">الكمية المحركة</th>
                    <th className="py-3 px-4">المخزون السابق</th>
                    <th className="py-3 px-4">المخزون الجديد</th>
                    <th className="py-3 px-4">المرجع</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6DC]">
                  {filteredMovements.map((m) => {
                    const isPositive = m.quantityDelta > 0;
                    return (
                      <tr key={m.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-2.5 px-4 font-bold text-[#2B170E]">{m.productName}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              m.type === 'purchase' || m.type === 'sale_return'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.type === 'spoilage'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.type === 'purchase'
                              ? 'توريد مشتريات'
                              : m.type === 'sale'
                              ? 'بيع كاشير'
                              : m.type === 'sale_return'
                              ? 'مرتجع بيع'
                              : m.type === 'spoilage'
                              ? 'تالف وهالك'
                              : 'تسوية جرد'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold">
                          <span className={isPositive ? 'text-[#2B7A4B]' : 'text-rose-600'}>
                            {isPositive ? '+' : ''}
                            {m.quantityDelta} {m.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#6B5345]">{m.previousStock}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-[#341B11]">{m.newStock}</td>
                        <td className="py-2.5 px-4 text-[#7A5E4F]">{m.referenceSource}</td>
                        <td className="py-2.5 px-4 text-[#7A5E4F] font-mono">{m.date}</td>
                        <td className="py-2.5 px-4 text-[#7A5E4F]">{m.userName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3 Content: Spoilage */}
      {activeSubTab === 'spoilage' && <SpoilageScreen />}

      {/* Tab 4 Content: Stocktake */}
      {activeSubTab === 'stocktake' && <StocktakeScreen />}

      {/* INSTANT ALERT & SHARE MODAL */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#D9C6B2] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#341B11]">إرسال وتصدير تنبيه النواقص</h3>
                  <p className="text-[10px] text-[#7A5E4F]">مشاركة تقرير النواقص الفوري للأستاذ إبراهيم راغب أو الموردين</p>
                </div>
              </div>
              <button
                onClick={() => setIsAlertModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>عدد الأصناف التي تحتاج لإعادة توريد: {stockMetrics.urgentReplenishCount} صنف</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  تم تجهيز نص التنبيه تلقائياً شاملاً الكميات المتبقية والكمية المقترح طلبها للوصول لحد الأمان.
                </p>
              </div>

              {/* Formatted Text Box */}
              <div>
                <label className="block font-bold text-[#542E1D] mb-1">معاينة نص الإشعار للتوجيه (واتساب / رسائل)</label>
                <textarea
                  readOnly
                  rows={8}
                  value={lowStockAlertText}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DAC8B6] rounded-xl font-mono text-[11px] text-[#2B170E] focus:outline-none select-all"
                />
              </div>

              {copiedAlert && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>تم نسخ نص التنبيه بنجاح إلى الحافظة! يمكنك لصقه مباشرة في واتساب.</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#FAF7F2] border-t border-[#EAE1D7] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrintStockLevels}
                className="px-3.5 py-2 bg-white hover:bg-gray-100 text-[#542E1D] border border-gray-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#8C4A26]" />
                <span>طباعة أمر توريد A4</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-3.5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={handleCopyAlertText}
                  className="px-4 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#FDE68A]" />
                  <span>نسخ نص التنبيه</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

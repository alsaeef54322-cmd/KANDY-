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
} from 'lucide-react';
import { InventoryMovement, Product } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';
import { SpoilageScreen } from '../spoilage/SpoilageScreen';
import { StocktakeScreen } from '../stocktake/StocktakeScreen';

export const InventoryScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'movements' | 'spoilage' | 'stocktake'>('movements');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [movementType, setMovementType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setMovements(db.getInventoryMovements());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchProduct = selectedProductId === 'all' || m.productId === selectedProductId;
      const matchType = movementType === 'all' || m.type === movementType;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.referenceSource.toLowerCase().includes(q) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q));
      return matchProduct && matchType && matchSearch;
    });
  }, [movements, selectedProductId, movementType, searchQuery]);

  const handleExportExcel = () => {
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sub Tabs Bar */}
      <div className="bg-white border-b border-[#EAE1D7] px-6 pt-3 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'movements'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>حركة وسجل المخزون</span>
          </button>

          <button
            onClick={() => setActiveSubTab('spoilage')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'spoilage'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>التالف والهالك وخسائر البضاعة</span>
          </button>

          <button
            onClick={() => setActiveSubTab('stocktake')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
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

      {/* Tab Contents */}
      {activeSubTab === 'spoilage' && <SpoilageScreen />}
      {activeSubTab === 'stocktake' && <StocktakeScreen />}

      {activeSubTab === 'movements' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
          {/* Header and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE]">
            <div>
              <h2 className="text-xl font-bold text-[#341B11]">المخزون وحركة الأصناف</h2>
              <p className="text-xs text-[#7A5E4F] mt-0.5">
                سجل التدقيق الشامل لجميع حركات الإضافة والخصم والمبيعات والتالف بدقة بالجرام
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير Excel</span>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <option value="sale">بيع كاشير (-)</option>
                <option value="sale_return">مرتجع مبيعات (+)</option>
                <option value="spoilage">تالف وهالك (-)</option>
                <option value="adjustment">تسوية جرد (±)</option>
              </select>
            </div>

            <div className="text-xs text-[#7A5E4F]">
              عدد الحركات: <span className="font-bold text-[#341B11]">{filteredMovements.length}</span>
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F6EFE6] text-[#4A2613] border-b border-[#DAC8B6]">
                    <th className="py-3 px-4 font-bold">التاريخ والوقت</th>
                    <th className="py-3 px-4 font-bold">اسم المنتج</th>
                    <th className="py-3 px-4 font-bold">نوع الحركة</th>
                    <th className="py-3 px-4 font-bold">الكمية المحركة</th>
                    <th className="py-3 px-4 font-bold">الرصيد السابق</th>
                    <th className="py-3 px-4 font-bold">الرصيد الجديد</th>
                    <th className="py-3 px-4 font-bold">المرجع</th>
                    <th className="py-3 px-4 font-bold">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE4]">
                  {filteredMovements.map((m) => {
                    const isPositive = m.quantityDelta > 0;
                    return (
                      <tr key={m.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3 px-4 text-[#7A5E4F] font-mono text-[11px]">{m.date}</td>
                        <td className="py-3 px-4 font-semibold text-[#341B11]">{m.productName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              m.type === 'purchase'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.type === 'sale'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : m.type === 'sale_return'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : m.type === 'spoilage'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
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
                        <td className="py-3 px-4 font-bold font-mono">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPositive ? '+' : ''}
                            {m.quantityDelta} {m.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#7A5E4F] font-mono">{m.previousStock}</td>
                        <td className="py-3 px-4 font-bold text-[#341B11] font-mono">{m.newStock}</td>
                        <td className="py-3 px-4 text-[#7A5E4F]">{m.referenceSource}</td>
                        <td className="py-3 px-4 text-[#7A5E4F]">{m.userName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredMovements.length === 0 && (
                <div className="p-8 text-center text-[#7A5E4F]">
                  لا توجد حركات مخزنية مسجلة تطابق محددات البحث
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,

  X,
  Layers,
} from 'lucide-react';
import { StocktakeRecord, StocktakeItem, Product } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const StocktakeScreen: React.FC = () => {
  const [stocktakes, setStocktakes] = useState<StocktakeRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stocktake form state
  const [stocktakeCode, setStocktakeCode] = useState('');
  const [stocktakeDate, setStocktakeDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualCounts, setActualCounts] = useState<{ [productId: string]: number }>({});
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setStocktakes(db.getStocktakes());
    setProducts(db.getProducts().filter((p) => p.isActive));
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const openNewStocktakeModal = () => {
    setStocktakeCode('STK-' + (stocktakes.length + 101));
    setStocktakeDate(new Date().toISOString().split('T')[0]);
    const counts: { [productId: string]: number } = {};
    products.forEach((p) => {
      counts[p.id] = p.type === 'weight' ? p.stockQuantity / 1000 : p.stockQuantity;
    });
    setActualCounts(counts);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSaveStocktake = (e: React.FormEvent, status: 'draft' | 'approved') => {
    e.preventDefault();

    let totalVarianceCost = 0;
    const items: StocktakeItem[] = products.map((p) => {
      const systemQty = p.type === 'weight' ? p.stockQuantity / 1000 : p.stockQuantity;
      const actualQty = actualCounts[p.id] ?? systemQty;
      const diff = Math.round((actualQty - systemQty) * 1000) / 1000;
      const costPerUnit = p.costPricePerStockUnit * (p.type === 'weight' ? 1000 : 1);
      const diffVal = Math.round(diff * costPerUnit * 100) / 100;
      totalVarianceCost += diffVal;

      return {
        productId: p.id,
        productName: p.name,
        unit: p.saleUnit,
        systemQuantity: systemQty,
        actualQuantity: actualQty,
        difference: diff,
        costPerUnit,
        differenceValue: diffVal,
      };
    });

    db.recordStocktake({
      code: stocktakeCode,
      date: stocktakeDate,
      items,
      totalVarianceCost: Math.round(totalVarianceCost * 100) / 100,
      status,
      approvedBy: status === 'approved' ? db.getSession().name : undefined,
      notes,
    });

    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    if (stocktakes.length === 0) return;
    const latest = stocktakes[0];
    const rows = latest.items.map((i) => ({
      'الصنف': i.productName,
      'الوحدة': i.unit,
      'الكمية الدفترية': i.systemQuantity,
      'الكمية الفعلية بالجرد': i.actualQuantity,
      'الفارق': i.difference,
      'تكلفة الوحدة': i.costPerUnit,
      'القيمة المالية للفرق (ج.م)': i.differenceValue,
    }));
    ExportService.exportToExcel(rows, `محضر_جرد_${latest.code}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">الجرد والتسويات المخزنية</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            مطابقة المخزون الدفتري بالعد الفعلي، احتساب العجز والزيادة، واعتماد التسويات
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stocktakes.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
          )}
          <button
            onClick={openNewStocktakeModal}
            className="px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>+ إجراء محضر جرد جديد</span>
          </button>
        </div>
      </div>

      {/* Stocktakes Table */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">رقم المحضر</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">عدد الأصناف</th>
                <th className="py-3 px-4">إجمالي فارق التكلفة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">المعتمد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {stocktakes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    لا توجد محاضر جرد سابقة. اضغط على "+ إجراء محضر جرد جديد" للبدء.
                  </td>
                </tr>
              ) : (
                stocktakes.map((stk) => (
                  <tr key={stk.id} className="hover:bg-[#FAF6F2] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">#{stk.code}</td>
                    <td className="py-2.5 px-4 font-mono text-[#6B5345]">{stk.date}</td>
                    <td className="py-2.5 px-4">{stk.items.length} صنف</td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      <span className={stk.totalVarianceCost < 0 ? 'text-rose-600' : 'text-[#2B7A4B]'}>
                        {formatCurrency(stk.totalVarianceCost)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {stk.status === 'approved' ? (
                        <span className="text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] px-2 py-0.5 rounded">
                          معتمد ومسوى
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                          مسودة
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#7A5E4F]">{stk.approvedBy || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stocktake Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-5 border border-[#DAC8B6] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#EAE1D7]">
              <div>
                <h3 className="font-bold text-[#542E1D]">محضر جرد ومطابقة المخزون الفعلي</h3>
                <span className="text-xs text-[#8C7A6D]">رقم المحضر: #{stocktakeCode}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-[#E6D9CC] rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] border-b text-[#6B5345] font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3">المخزون المسجل</th>
                    <th className="py-2 px-3 text-center">العد الفعلي</th>
                    <th className="py-2 px-3 text-center">الفارق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6DC]">
                  {products.map((p) => {
                    const systemQty = p.type === 'weight' ? p.stockQuantity / 1000 : p.stockQuantity;
                    const actual = actualCounts[p.id] ?? systemQty;
                    const diff = Math.round((actual - systemQty) * 1000) / 1000;

                    return (
                      <tr key={p.id} className="py-1.5 hover:bg-[#FAF6F2]">
                        <td className="py-2 px-3 font-bold text-[#2B170E]">{p.name}</td>
                        <td className="py-2 px-3 font-mono text-[#6B5345]">
                          {systemQty} {p.saleUnit}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            step={p.type === 'weight' ? '0.05' : '1'}
                            value={actual}
                            onChange={(e) =>
                              setActualCounts({
                                ...actualCounts,
                                [p.id]: Number(e.target.value),
                              })
                            }
                            className="w-24 p-1 text-xs border border-[#DAC8B6] rounded font-mono text-center font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-[#2B7A4B]' : 'text-gray-400'}>
                            {diff > 0 ? `+${diff}` : diff} {p.saleUnit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#EAE1D7]">
              <span className="text-xs text-[#7A5E4F]">
                * اعتماد المحضر سيقوم بتسوية وتعديل رصيد المخزون الدفتري تلقائياً ليطابق العد الفعلي.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveStocktake(e, 'approved')}
                  className="px-4 py-1.5 bg-[#2B7A4B] text-white rounded-lg text-xs font-bold"
                >
                  اعتماد التسوية فوراً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  FileSpreadsheet,
  Trash2,
  Calendar,

  Layers,
  X,
} from 'lucide-react';
import { SpoilageRecord, Product } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const SpoilageScreen: React.FC = () => {
  const [spoilageList, setSpoilageList] = useState<SpoilageRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(0.5);
  const [reason, setReason] = useState<SpoilageRecord['reason']>('roasting_error');
  const [reasonText, setReasonText] = useState('خطأ في درجة تحميص الدفعة');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setSpoilageList(db.getSpoilage());
    setProducts(db.getProducts().filter((p) => p.isActive));
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const totalLoss = spoilageList.reduce((acc, s) => acc + s.totalCostLoss, 0);

  const handleRecordSpoilage = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || quantity <= 0) return;

    const stockQty = prod.type === 'weight' ? Math.round(quantity * 1000) : quantity;

    db.recordSpoilage({
      spoilageNumber: 'SPO-' + (spoilageList.length + 101),
      productId: prod.id,
      productName: prod.name,
      quantity,
      stockQuantity: stockQty,
      unit: prod.saleUnit,
      costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
      reason,
      reasonText,
      date: new Date().toISOString().split('T')[0],
      reportedBy: db.getSession().name,
      notes,
    });

    setQuantity(0.5);
    setNotes('');
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = spoilageList.map((s) => ({
      'رقم المحضر': s.spoilageNumber,
      'المنتج': s.productName,
      'الكمية التالفة': `${s.quantity} ${s.unit}`,
      'تكلفة الوحدة (ج.م)': s.costPerUnit,
      'إجمالي الخسارة (ج.م)': s.totalCostLoss,
      'السبب': s.reasonText,
      'التاريخ': s.date,
      'المسؤول': s.reportedBy,
    }));
    ExportService.exportToExcel(rows, `تالف_وهالك_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">التالف والهالك وخسائر البضاعة</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            تسجيل عينات الفحص، احتراق التحميص، انتهاء الصلاحية، وخصم المخزون مع قيد خسارة التكلفة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => {
              setSelectedProductId(products[0]?.id || '');
              setIsModalOpen(true);
            }}
            className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ تسجيل هالك / تالف</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7A5E4F]">إجمالي خسائر التالف والهالك المحسوبة</div>
            <div className="text-lg font-bold font-mono text-rose-700">
              {formatCurrency(totalLoss)}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#7A5E4F]">
          عدد الحالات: <strong className="text-[#341B11]">{spoilageList.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">رقم المحضر</th>
                <th className="py-3 px-4">المنتج</th>
                <th className="py-3 px-4 text-center">الكمية التالفة</th>
                <th className="py-3 px-4">تكلفة الوحدة</th>
                <th className="py-3 px-4">خسارة التكلفة</th>
                <th className="py-3 px-4">السبب</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">المعتمد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {spoilageList.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">{s.spoilageNumber}</td>
                  <td className="py-2.5 px-4 font-bold text-[#2B170E]">{s.productName}</td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-700">
                    -{s.quantity} {s.unit}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[#7A5E4F]">{formatCurrency(s.costPerUnit)}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-rose-700">
                    {formatCurrency(s.totalCostLoss)}
                  </td>
                  <td className="py-2.5 px-4 text-[#542E1D]">{s.reasonText}</td>
                  <td className="py-2.5 px-4 font-mono text-[#6B5345]">{s.date}</td>
                  <td className="py-2.5 px-4 text-[#7A5E4F]">{s.reportedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Spoilage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">تسجيل بضاعة تالفة أو هالكة</h3>
            <form onSubmit={handleRecordSpoilage} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">المنتج *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.saleUnit}) — المتاح: {p.type === 'weight' ? `${p.stockQuantity / 1000} كجم` : p.stockQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">الكمية التالفة *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">سبب التلف *</label>
                <select
                  value={reason}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    setReason(r);
                    const map: Record<string, string> = {
                      roasting_error: 'خطأ في درجة تحميص الدفعة',
                      expired: 'انتهاء فترة الصلاحية',
                      damaged: 'كسر أو تلف أثناء التخزين والنقل',
                      humidity: 'تلف بسبب الرطوبة وسوء التهوية',
                      sample: 'عينات تذوق وضيافة للعملاء',
                      other: 'أسباب تشغيلية أخرى',
                    };
                    setReasonText(map[r] || 'أخرى');
                  }}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                >
                  <option value="roasting_error">خطأ في التحميص (احتراق / تحميص غير كافٍ)</option>
                  <option value="humidity">تلف بسبب الرطوبة</option>
                  <option value="expired">انتهاء الصلاحية</option>
                  <option value="sample">عينات تذوق وضيافة</option>
                  <option value="damaged">كسر عبوات أثناء النقل</option>
                  <option value="other">أسباب أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="رقم التشغيلة أو تفاصيل المعاينة..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 text-white rounded-lg font-bold"
                >
                  تسجيل وخصم المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

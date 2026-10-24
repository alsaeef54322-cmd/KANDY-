import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { SaleInvoice, SalesReturn } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';
import { ReceiptModal } from '../common/ReceiptModal';

export const InvoicesScreen: React.FC = () => {
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'debt' | 'returned'>('all');

  // Print Receipt Modal
  const [printingSale, setPrintingSale] = useState<SaleInvoice | null>(null);

  // Return Processing Modal
  const [returnTargetSale, setReturnTargetSale] = useState<SaleInvoice | null>(null);
  const [returnItems, setReturnItems] = useState<{ [productId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('رغبة العميل');

  const loadData = () => {
    setSales(db.getSales());
    setReturns(db.getSalesReturns());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.cashierName.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sales, searchQuery, statusFilter]);

  const handleOpenReturnModal = (sale: SaleInvoice) => {
    setReturnTargetSale(sale);
    const initialQty: { [productId: string]: number } = {};
    sale.items.forEach((item) => {
      initialQty[item.productId] = item.quantity; // default full return or user adjusts
    });
    setReturnItems(initialQty);
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTargetSale) return;

    let totalRefund = 0;
    let totalCostRestored = 0;
    const itemsReturned = [];

    for (const item of returnTargetSale.items) {
      const qty = returnItems[item.productId] || 0;
      if (qty > 0) {
        const itemRefund = qty * item.unitPrice;
        totalRefund += itemRefund;

        let stockReturned = qty;
        if (item.productType === 'weight') {
          stockReturned = Math.round(qty * 1000);
        }
        const costRestored = (item.costPrice / (item.quantity || 1)) * qty;
        totalCostRestored += costRestored;

        itemsReturned.push({
          productId: item.productId,
          productName: item.productName,
          quantityReturned: qty,
          stockQuantityReturned: stockReturned,
          unitName: item.unitName,
          refundAmount: itemRefund,
          costRestored,
        });
      }
    }

    if (itemsReturned.length === 0) {
      alert('يرجى تحديد كمية صنف واحد على الأقل للمرتجع');
      return;
    }

    db.recordSalesReturn({
      returnNumber: 'RET-' + (returns.length + 101),
      saleInvoiceId: returnTargetSale.id,
      saleInvoiceNumber: returnTargetSale.invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      items: itemsReturned,
      totalRefund,
      costRestoredTotal: totalCostRestored,
      reason: returnReason,
      cashierName: db.getSession().name,
    });

    setReturnTargetSale(null);
  };

  const handleExportExcel = () => {
    const rows = filteredSales.map((s) => ({
      'رقم الفاتورة': s.invoiceNumber,
      'التاريخ': s.date,
      'العميل': s.customerName || 'عميل نقدي',
      'عدد الأصناف': s.items.length,
      'الإجمالي (ج.م)': s.total,
      'تكلفة البضاعة المباعة (ج.م)': s.cogsTotal,
      'مجمل الربح (ج.م)': s.grossProfit,
      'المدفوع (ج.م)': s.paidAmount,
      'المتبقي (ج.م)': s.remainingAmount,
      'طريقة الدفع': s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'card' ? 'بطاقة' : 'آجل',
      'الحالة': s.status === 'paid' ? 'مدفوعة' : s.status === 'returned' ? 'مرتجعة' : 'آجلة',
      'الكاشير': s.cashierName,
    }));
    ExportService.exportToExcel(rows, `فواتير_مبيعات_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">الفواتير السابقة والمرتجعات</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            أرشيف فواتير الكاشير والمبيعات، إعادة الطباعة، وتسجيل المرتجعات مع إعادة المخزون
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
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة أو اسم العميل..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#DAC8B6]">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'paid', label: 'مدفوعة' },
              { id: 'partial', label: 'جزئية' },
              { id: 'debt', label: 'آجلة' },
              { id: 'returned', label: 'مرتجعة' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                  statusFilter === st.id
                    ? 'bg-[#542E1D] text-white'
                    : 'text-[#6B5345] hover:bg-[#F3ECE2]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#7A5E4F] font-semibold">
          عدد الفواتير: {filteredSales.length}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">الأصناف المباعة</th>
                <th className="py-3 px-4">الإجمالي (ج.م)</th>
                <th className="py-3 px-4">مجمل الربح</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">
                    #{s.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-4 text-[#6B5345] font-mono">{s.date}</td>
                  <td className="py-2.5 px-4 font-bold text-[#2B170E]">
                    {s.customerName || 'عميل نقدي عام'}
                  </td>
                  <td className="py-2.5 px-4 text-[#4A2613]">
                    <span className="truncate max-w-[200px] block">
                      {s.items.map((i) => `${i.productName} (${i.quantity} ${i.unitName})`).join('، ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#341B11]">
                    {formatCurrency(s.total)}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2B7A4B]">
                    {formatCurrency(s.grossProfit)}
                  </td>
                  <td className="py-2.5 px-4">
                    {s.status === 'paid' && (
                      <span className="text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] px-2 py-0.5 rounded">
                        مدفوعة
                      </span>
                    )}
                    {s.status === 'partial' && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        جزئية
                      </span>
                    )}
                    {s.status === 'debt' && (
                      <span className="text-[11px] font-bold text-[#8C4A26] bg-[#FAF3EC] px-2 py-0.5 rounded">
                        آجلة
                      </span>
                    )}
                    {s.status === 'returned' && (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        مرتجعة
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setPrintingSale(s)}
                        title="طباعة إيصال الفاتورة"
                        className="p-1.5 text-[#542E1D] hover:bg-[#F3ECE2] rounded-md transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {s.status !== 'returned' && (
                        <button
                          onClick={() => handleOpenReturnModal(s)}
                          title="تسجيل مرتجع بيع"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Return Modal */}
      {returnTargetSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">
              تسجيل مرتجع بيع للفاتورة #{returnTargetSale.invoiceNumber}
            </h3>

            <form onSubmit={handleConfirmReturn} className="space-y-3 text-xs">
              <div className="space-y-2 border border-[#EAE1D7] p-2.5 rounded-lg bg-[#FAF7F2]">
                <div className="font-semibold text-[#542E1D]">حدد الكميات المرتجعة:</div>
                {returnTargetSale.items.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center bg-white p-2 rounded border border-[#EDE2D4]">
                    <div>
                      <div className="font-bold text-[#341B11]">{item.productName}</div>
                      <div className="text-[10px] text-[#8C7A6D]">سعر الوحدة: {item.unitPrice} ج.م</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={item.productType === 'weight' ? '0.05' : '1'}
                        min="0"
                        max={item.quantity}
                        value={returnItems[item.productId] ?? item.quantity}
                        onChange={(e) =>
                          setReturnItems({
                            ...returnItems,
                            [item.productId]: Number(e.target.value),
                          })
                        }
                        className="w-18 p-1 text-xs border border-[#DAC8B6] rounded font-mono text-center"
                      />
                      <span className="text-[10px] text-[#6B5345]">{item.unitName}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">سبب الإرجاع</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                >
                  <option value="رغبة العميل في الاستبدال">رغبة العميل في الاستبدال</option>
                  <option value="عيب في المنتج أو التغليف">عيب في المنتج أو التغليف</option>
                  <option value="خطأ في الوزن أو السعر">خطأ في الوزن أو السعر</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setReturnTargetSale(null)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 text-white rounded-lg font-bold"
                >
                  تأكيد الإرجاع وإعادة المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      {printingSale && (
        <ReceiptModal sale={printingSale} onClose={() => setPrintingSale(null)} />
      )}
    </div>
  );
};

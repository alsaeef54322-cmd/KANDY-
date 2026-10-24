import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,

  AlertCircle,
  Eye,
  Trash2,
  X,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { PurchaseInvoice, Supplier, Product, PurchaseItem } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const PurchasesScreen: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<
    {
      productId: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      total: number;
    }[]
  >([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setPurchases(db.getPurchases());
    setSuppliers(db.getSuppliers());
    setProducts(db.getProducts().filter((p) => p.isActive));
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalPurchases = purchases.reduce((acc, p) => acc + p.total, 0);
    const totalPaid = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalDue = purchases.reduce((acc, p) => acc + p.remainingAmount, 0);
    return { totalPurchases, totalPaid, totalDue };
  }, [purchases]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  const openNewPurchaseModal = () => {
    const nextNum = 'P' + (purchases.length + 1).toString().padStart(3, '0');
    setInvoiceNumber(nextNum);
    setSupplierId(suppliers[0]?.id || '');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setShippingFee(0);
    setDiscount(0);
    setPaidAmount(0);
    setPaymentMethod('cash');
    setNotes('');
    if (products.length > 0) {
      const p = products[0];
      setItems([
        {
          productId: p.id,
          quantity: p.type === 'weight' ? 10 : 5,
          unit: p.purchaseUnit,
          unitPrice: p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit,
          total: (p.type === 'weight' ? 10 : 5) * (p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit),
        },
      ]);
    } else {
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    const p = products[0];
    const unitPrice = p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit;
    setItems([
      ...items,
      {
        productId: p.id,
        quantity: 5,
        unit: p.purchaseUnit,
        unitPrice,
        total: 5 * unitPrice,
      },
    ]);
  };

  const updateItemRow = (idx: number, field: string, val: any) => {
    const updated = [...items];
    const row = { ...updated[idx], [field]: val };

    if (field === 'productId') {
      const p = products.find((prod) => prod.id === val);
      if (p) {
        row.unit = p.purchaseUnit;
        row.unitPrice = p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit;
      }
    }

    row.total = Math.round(row.quantity * row.unitPrice * 100) / 100;
    updated[idx] = row;
    setItems(updated);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const calculatedSubtotal = useMemo(() => {
    return items.reduce((acc, i) => acc + i.total, 0);
  }, [items]);

  const calculatedTotal = useMemo(() => {
    return Math.max(0, calculatedSubtotal + Number(shippingFee) - Number(discount));
  }, [calculatedSubtotal, shippingFee, discount]);

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل للفاتورة');
      return;
    }

    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      alert('يرجى تحديد المورد');
      return;
    }

    const purchaseItems: PurchaseItem[] = items.map((i) => {
      const prod = products.find((p) => p.id === i.productId)!;
      let stockAdded = i.quantity;
      if (prod.type === 'weight') {
        stockAdded = Math.round(i.quantity * 1000); // convert kg to grams
      } else if (prod.unitConversionRatio > 1) {
        stockAdded = i.quantity * prod.unitConversionRatio;
      }

      const costPerStockUnit = i.total / (stockAdded > 0 ? stockAdded : 1);

      return {
        productId: prod.id,
        productName: prod.name,
        purchaseQuantity: i.quantity,
        purchaseUnit: i.unit,
        conversionRatio: prod.unitConversionRatio,
        stockQuantityAdded: stockAdded,
        purchasePricePerUnit: i.unitPrice,
        costPerStockUnit,
        total: i.total,
      };
    });

    const paid = Number(paidAmount) || 0;
    const remaining = Math.max(0, calculatedTotal - paid);

    db.recordPurchase({
      invoiceNumber,
      supplierId: sup.id,
      supplierName: sup.name,
      date: invoiceDate,
      items: purchaseItems,
      subtotal: calculatedSubtotal,
      discount: Number(discount) || 0,
      shippingFee: Number(shippingFee) || 0,
      total: calculatedTotal,
      paidAmount: paid,
      remainingAmount: remaining,
      paymentMethod,
      status: remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      notes,
    });

    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = filteredPurchases.map((p) => ({
      'رقم الفاتورة': p.invoiceNumber,
      'المورد': p.supplierName,
      'التاريخ': p.date,
      'عدد الأصناف': p.items.length,
      'الإجمالي (ج.م)': p.total,
      'المدفوع (ج.م)': p.paidAmount,
      'المتبقي (ج.م)': p.remainingAmount,
      'طريقة الدفع': p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'transfer' ? 'تحويل' : 'آجل',
      'الحالة': p.status === 'paid' ? 'مدفوعة' : p.status === 'partial' ? 'جزئية' : 'مستحقة',
    }));
    ExportService.exportToExcel(rows, `مشتريات_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">المشتريات وتوريد البضاعة</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            تسجيل فواتير الشراء، تحديث كميات وتكلفة المخزون تلقائياً، ومتابعة حسابات الموردين
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
            onClick={openNewPurchaseModal}
            className="px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>+ إضافة فاتورة مشتريات</span>
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards (from mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs">
          <div className="text-xs text-[#7A5E4F] font-semibold mb-1">إجمالي المشتريات</div>
          <div className="text-xl font-bold font-mono text-[#341B11]">
            {formatCurrency(summary.totalPurchases)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">كافة الفواتير المسجلة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs">
          <div className="text-xs text-[#2B7A4B] font-semibold mb-1">المدفوعات الفعلية للموردين</div>
          <div className="text-xl font-bold font-mono text-[#2B7A4B]">
            {formatCurrency(summary.totalPaid)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">مدفوع نقداً وتحويل بنكي</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs">
          <div className="text-xs text-amber-700 font-semibold mb-1">المستحق المتبقي للموردين</div>
          <div className="text-xl font-bold font-mono text-amber-700">
            {formatCurrency(summary.totalDue)}
          </div>
          <div className="text-[10px] text-amber-600 mt-1">ديون مشتريات آجلة</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة أو اسم المورد..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#DAC8B6]">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'paid', label: 'مدفوعة' },
              { id: 'partial', label: 'جزئية' },
              { id: 'unpaid', label: 'مستحقة' },
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
          عدد الفواتير: {filteredPurchases.length}
        </div>
      </div>

      {/* Purchases Table (matching mockup) */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">المورد</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">أصناف الشراء</th>
                <th className="py-3 px-4">الإجمالي (ج.م)</th>
                <th className="py-3 px-4">المدفوع (ج.م)</th>
                <th className="py-3 px-4">المتبقي (ج.م)</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredPurchases.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-[#FAF6F2] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">
                      #{p.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-[#2B170E]">{p.supplierName}</td>
                    <td className="py-2.5 px-4 text-[#6B5345] font-mono">{p.date}</td>
                    <td className="py-2.5 px-4 text-[#4A2613]">
                      <span className="truncate max-w-[200px] block">
                        {p.items.map((i) => `${i.productName} (${i.purchaseQuantity} ${i.purchaseUnit})`).join('، ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#2B170E]">
                      {p.total.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#2B7A4B]">
                      {p.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-700">
                      {p.remainingAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      {p.status === 'paid' && (
                        <span className="text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] border border-[#BDE3CB] px-2 py-0.5 rounded-md">
                          مدفوعة
                        </span>
                      )}
                      {p.status === 'partial' && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          جزئية
                        </span>
                      )}
                      {p.status === 'unpaid' && (
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          مستحقة
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedInvoice(p)}
                        className="p-1.5 text-[#542E1D] hover:bg-[#F3ECE2] rounded-md transition-colors"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#D5C2B0]">
            <div className="p-4 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#341B11]">تسجيل فاتورة مشتريات وتوريد بضاعة</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    المورد *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.balanceDue > 0 ? `(مستحق له: ${s.balanceDue} ج.م)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    رقم الفاتورة *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    تاريخ الفاتورة *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Items Table in Modal */}
              <div className="border border-[#E6D9CC] rounded-xl overflow-hidden bg-white">
                <div className="p-2.5 bg-[#FAF7F2] border-b border-[#E6D9CC] flex items-center justify-between">
                  <span className="font-bold text-[#542E1D]">أصناف الفاتورة والكميات المستلمة</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 bg-[#542E1D] text-white rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="p-2 space-y-2 max-h-56 overflow-y-auto">
                  {items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#FAF7F2] p-2 rounded-lg border border-[#EDE2D4]">
                      <select
                        value={row.productId}
                        onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                        className="flex-1 p-1.5 bg-white border border-[#DAC8B6] rounded text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.saleUnit})
                          </option>
                        ))}
                      </select>

                      <div className="w-20">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value))}
                          placeholder="الكمية"
                          className="w-full p-1.5 bg-white border border-[#DAC8B6] rounded text-center font-mono font-bold text-xs"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={row.unitPrice}
                          onChange={(e) => updateItemRow(idx, 'unitPrice', Number(e.target.value))}
                          placeholder="السعر"
                          className="w-full p-1.5 bg-white border border-[#DAC8B6] rounded text-center font-mono font-bold text-xs"
                        />
                      </div>

                      <div className="w-24 text-left font-mono font-bold text-xs text-[#542E1D]">
                        {row.total.toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-rose-500 hover:text-rose-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EDE2D4] space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">مصاريف نقل وشحن (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border border-[#DAC8B6] rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">خصم من المورد (ج.م)</label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full p-1.5 bg-white border border-[#DAC8B6] rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">طريقة الدفع</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full p-1.5 bg-white border border-[#DAC8B6] rounded font-semibold"
                    >
                      <option value="cash">نقدي (صرف من الخزنة)</option>
                      <option value="transfer">تحويل بنكي</option>
                      <option value="credit">آجل بالكامل</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#EAE1D7]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#542E1D] mb-0.5">
                      المبلغ المدفوع فوراً (ج.م):
                    </label>
                    <input
                      type="number"
                      step="10"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-[#DAC8B6] rounded-lg font-mono font-bold text-sm text-[#2B7A4B]"
                    />
                  </div>

                  <div className="flex flex-col justify-end text-left">
                    <div className="text-[11px] text-[#6B5345]">إجمالي الفاتورة: {formatCurrency(calculatedTotal)}</div>
                    <div className="text-sm font-extrabold text-amber-700 font-mono">
                      المتبقي الآجل: {formatCurrency(Math.max(0, calculatedTotal - paidAmount))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  ملاحظات الفاتورة أو رقم إذن الاستلام
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="رقم التشغيلة، تقرير الفحص..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-[#EAE1D7] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#DAC8B6] rounded-lg text-[#542E1D] font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold"
                >
                  حفظ وتأكيد الاستلام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Viewer Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-[#DAC8B6] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#EAE1D7]">
              <div>
                <h3 className="font-bold text-[#542E1D]">تفاصيل فاتورة مشتريات #{selectedInvoice.invoiceNumber}</h3>
                <span className="text-xs text-[#8C7A6D]">{selectedInvoice.date} · {selectedInvoice.supplierName}</span>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-[#7A5E4F]">
                    <th className="py-1">الصنف</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-center">السعر</th>
                    <th className="py-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {selectedInvoice.items.map((i, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 font-['Cairo',sans-serif]">{i.productName}</td>
                      <td className="text-center">{i.purchaseQuantity} {i.purchaseUnit}</td>
                      <td className="text-center">{i.purchasePricePerUnit}</td>
                      <td className="text-left font-bold">{i.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-[#EAE1D7] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>الإجمالي:</span>
                  <strong className="font-mono">{formatCurrency(selectedInvoice.total)}</strong>
                </div>
                <div className="flex justify-between text-[#2B7A4B]">
                  <span>المدفوع:</span>
                  <strong className="font-mono">{formatCurrency(selectedInvoice.paidAmount)}</strong>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>المتبقي:</span>
                  <strong className="font-mono">{formatCurrency(selectedInvoice.remainingAmount)}</strong>
                </div>
                {selectedInvoice.notes && (
                  <div className="text-[11px] text-[#6B5345] pt-1">ملاحظة: {selectedInvoice.notes}</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

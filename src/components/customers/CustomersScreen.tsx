import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  FileSpreadsheet,
  FileText,
  Banknote,

  X,
  CheckCircle,
} from 'lucide-react';
import { Customer, SaleInvoice } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Form State
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<'cash' | 'transfer'>('cash');
  const [collectNotes, setCollectNotes] = useState('');

  const loadData = () => {
    setCustomers(db.getCustomers());
    setSales(db.getSales());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const totalDebtAll = useMemo(() => {
    return customers.reduce((acc, c) => acc + c.balanceDue, 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [customers, searchQuery]);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCust: Customer = {
      id: 'cust-' + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      totalPurchases: 0,
      totalPaid: 0,
      balanceDue: 0,
      status: 'active',
      notes,
      createdAt: new Date().toISOString(),
    };

    db.saveCustomer(newCust);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || collectAmount <= 0) return;

    db.recordCustomerPayment(paymentCustomer.id, collectAmount, collectMethod, collectNotes);
    setPaymentCustomer(null);
    setCollectAmount(0);
    setCollectNotes('');
  };

  const handleExportExcel = () => {
    const rows = filteredCustomers.map((c) => ({
      'اسم العميل': c.name,
      'رقم الهاتف': c.phone,
      'العنوان': c.address || '-',
      'إجمالي المشتريات (ج.م)': c.totalPurchases,
      'إجمالي المسدد (ج.م)': c.totalPaid,
      'الديون المستحقة (ج.م)': c.balanceDue,
      'الحالة': c.status === 'active' ? 'نشط' : 'معطل',
    }));
    ExportService.exportToExcel(rows, `عملاء_وديون_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#341B11]">العملاء وحسابات الديون الآجلة</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            سجل العملاء، متابعة المبيعات الآجلة، تحصيل الديون، وإصدار كشوف الحساب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 sm:px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>+ إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#542E1D] text-white flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5 text-[#FDE68A]" />
          </div>
          <div>
            <div className="text-xs text-[#7A5E4F]">إجمالي الديون المستحقة على العملاء</div>
            <div className="text-lg font-bold font-mono text-[#542E1D]">
              {formatCurrency(totalDebtAll)}
            </div>
          </div>
        </div>

        <div className="text-xs text-[#7A5E4F]">
          عدد العملاء: <strong className="text-[#341B11]">{customers.length}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E6D9CC] shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
            className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">الرمز</th>
                <th className="py-3 px-4">اسم العميل</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">العنوان</th>
                <th className="py-3 px-4">المديونية الحالية (ج.م)</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="w-8 h-8 rounded-lg bg-[#F5ECE1] text-[#542E1D] flex items-center justify-center font-bold text-xs border border-[#E0D2C3]">
                      {c.name.slice(0, 2)}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-[#2B170E]">{c.name}</td>
                  <td className="py-2.5 px-4 font-mono text-[#6B5345]">{c.phone}</td>
                  <td className="py-2.5 px-4 text-[#7A5E4F]">{c.address || '-'}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">
                    {c.balanceDue > 0 ? formatCurrency(c.balanceDue) : '0.00 ج.م'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] border border-[#BDE3CB] px-2 py-0.5 rounded-md">
                      <CheckCircle className="w-3 h-3 text-[#2B7A4B]" />
                      <span>نشط</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setStatementCustomer(c)}
                        className="px-2.5 py-1 text-xs bg-[#FAF7F2] hover:bg-[#F3ECE2] text-[#542E1D] border border-[#DAC8B6] rounded font-semibold flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>كشف حساب</span>
                      </button>
                      {c.balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setPaymentCustomer(c);
                            setCollectAmount(c.balanceDue);
                          }}
                          className="px-2.5 py-1 text-xs bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded font-semibold flex items-center gap-1"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>تحصيل دفعة</span>
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

      {/* Customer Statement Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5 border border-[#DAC8B6] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#EAE1D7]">
              <div>
                <h3 className="font-bold text-[#542E1D]">كشف حساب العميل: {statementCustomer.name}</h3>
                <span className="text-xs text-[#8C7A6D]">الهاتف: {statementCustomer.phone}</span>
              </div>
              <button onClick={() => setStatementCustomer(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE2D4]">
              <div>
                <div className="text-[10px] text-[#7A5E4F]">إجمالي المشتريات</div>
                <div className="text-xs font-bold font-mono text-[#341B11]">
                  {formatCurrency(statementCustomer.totalPurchases)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#2B7A4B]">إجمالي المسدد</div>
                <div className="text-xs font-bold font-mono text-[#2B7A4B]">
                  {formatCurrency(statementCustomer.totalPaid)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#542E1D]">الرصيد المدين المتبقي</div>
                <div className="text-xs font-bold font-mono text-[#542E1D]">
                  {formatCurrency(statementCustomer.balanceDue)}
                </div>
              </div>
            </div>

            {/* List of customer sales */}
            <div className="max-h-56 overflow-y-auto space-y-2">
              <div className="text-xs font-bold text-[#542E1D]">فواتير المبيعات المرتبطة:</div>
              {sales.filter((s) => s.customerId === statementCustomer.id).length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">لا توجد فواتير سابقة لهذا العميل</div>
              ) : (
                sales
                  .filter((s) => s.customerId === statementCustomer.id)
                  .map((s) => (
                    <div key={s.id} className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EDE2D4] flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold font-mono text-[#542E1D]">فاتورة #{s.invoiceNumber}</div>
                        <div className="text-[10px] text-[#8C7A6D]">{s.date} · {s.items.length} أصناف</div>
                      </div>
                      <div className="text-left font-mono">
                        <div className="font-bold text-[#341B11]">{formatCurrency(s.total)}</div>
                        <div className="text-[10px] text-amber-700">المتبقي: {formatCurrency(s.remainingAmount)}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#EAE1D7]">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Debt Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">تحصيل دفعة من العميل: {paymentCustomer.name}</h3>
            <form onSubmit={handleCollectPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  المبلغ المحصل (ج.م) *
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  max={paymentCustomer.balanceDue}
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold text-sm text-[#2B7A4B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  طريقة التحصيل
                </label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as any)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-semibold"
                >
                  <option value="cash">نقداً (توريد للخزنة)</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  بيان السداد
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="سداد دفعة حساب..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2B7A4B] text-white rounded-lg font-bold"
                >
                  تأكيد التحصيل والتوريد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="text-sm font-bold text-[#341B11]">إضافة عميل جديد</h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الكامل أو اسم الكافيه..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">العنوان</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المنطقة أو الحي..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg font-bold"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

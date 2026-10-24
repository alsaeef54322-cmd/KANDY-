import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,

  Banknote,
  CreditCard,
  X,
  Printer,
} from 'lucide-react';
import { Expense } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';
import { printReportDocument } from '../../services/printService';

export const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'accrued'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payingExpense, setPayingExpense] = useState<Expense | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<Expense['category']>('utilities');
  const [formCategoryLabel, setFormCategoryLabel] = useState('كهرباء ومياه');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'paid' | 'accrued'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setExpenses(db.getExpenses());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const paidExpenses = expenses.filter((e) => e.status === 'paid').reduce((acc, e) => acc + e.amount, 0);
    const accruedExpenses = expenses.filter((e) => e.status === 'accrued').reduce((acc, e) => acc + e.amount, 0);
    return { totalExpenses, paidExpenses, accruedExpenses };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.categoryLabel.toLowerCase().includes(q) ||
        e.recipient.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [expenses, searchQuery, categoryFilter, statusFilter]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    db.recordExpense({
      code: 'EXP-' + (expenses.length + 105),
      category: formCategory,
      categoryLabel: formCategoryLabel,
      description,
      amount,
      date: dueDate,
      dueDate,
      paymentDate: status === 'paid' ? dueDate : undefined,
      paymentMethod: status === 'paid' ? paymentMethod : undefined,
      status,
      recipient: recipient || 'جهة الصرف',
      recordedBy: db.getSession().name,
      notes,
    });

    setDescription('');
    setAmount(0);
    setRecipient('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleConfirmPay = (paymentMethodChosen: 'cash' | 'transfer') => {
    if (!payingExpense) return;
    db.payExpense(payingExpense.id, paymentMethodChosen);
    setPayingExpense(null);
  };

  const handleExportExcel = () => {
    const rows = filteredExpenses.map((e) => ({
      'كود المصروف': e.code,
      'التصنيف': e.categoryLabel,
      'البيان والوصف': e.description,
      'المبلغ (ج.م)': e.amount,
      'تاريخ الاستحقاق': e.dueDate,
      'تاريخ السداد': e.paymentDate || '-',
      'طريقة الدفع': e.paymentMethod === 'cash' ? 'نقدي من الخزنة' : e.paymentMethod === 'transfer' ? 'تحويل' : '-',
      'الحالة': e.status === 'paid' ? 'مدفوعة' : 'مستحقة',
      'المستفيد': e.recipient,
    }));
    ExportService.exportToExcel(rows, `مصروفات_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrintExpenses = () => {
    printReportDocument({
      title: 'كشف المصروفات والالتزامات التشغيلية',
      subtitle: 'محمصة كاندي — الأستاذ إبراهيم راغب',
      kpis: [
        { label: 'إجمالي المصروفات', value: formatCurrency(summary.totalExpenses), color: '#B71C1C' },
        { label: 'المصروفات المسددة', value: formatCurrency(summary.paidExpenses), color: '#2B7A4B' },
        { label: 'المصروفات المستحقة', value: formatCurrency(summary.accruedExpenses), color: '#C28B38' },
      ],
      columns: [
        { header: 'كود المصروف', align: 'center', width: '15%' },
        { header: 'التصنيف', align: 'right', width: '20%' },
        { header: 'البيان والوصف', align: 'right', width: '25%' },
        { header: 'المبلغ', align: 'left', width: '15%' },
        { header: 'الاستحقاق', align: 'center', width: '15%' },
        { header: 'الحالة', align: 'center', width: '10%' },
      ],
      rows: filteredExpenses.map((e) => [
        e.code,
        e.categoryLabel,
        e.description,
        formatCurrency(e.amount),
        e.dueDate,
        e.status === 'paid' ? 'مدفوعة' : 'مستحقة',
      ]),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">المصروفات التشغيلية</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            إدارة مصروفات المحل، الإيجار، الرواتب، التعبئة، والكهرباء مع الفصل بين المستحق والمدفوع
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrintExpenses}
            className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#8C4A26]" />
            <span>طباعة الكشف</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>+ تسجيل مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards (from mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs">
          <div className="text-xs text-[#7A5E4F] font-semibold mb-1">إجمالي المصروفات المسجلة</div>
          <div className="text-xl font-bold font-mono text-[#341B11]">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">كافة الالتزامات التشغيلية</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs">
          <div className="text-xs text-[#2B7A4B] font-semibold mb-1">المصروفات المسددة فعلياً</div>
          <div className="text-xl font-bold font-mono text-[#2B7A4B]">
            {formatCurrency(summary.paidExpenses)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1">تم خصمها من الخزنة والحسابات</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E6D9CC] shadow-2xs">
          <div className="text-xs text-amber-700 font-semibold mb-1">المصروفات المستحقة المعلقة</div>
          <div className="text-xl font-bold font-mono text-amber-700">
            {formatCurrency(summary.accruedExpenses)}
          </div>
          <div className="text-[10px] text-amber-600 mt-1">مستحقة ولم تسدد بعد</div>
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
              placeholder="ابحث بالبيان، التصنيف، أو المستفيد..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#DAC8B6]">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'paid', label: 'مدفوعة' },
              { id: 'accrued', label: 'مستحقة' },
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
          عدد القيود: {filteredExpenses.length}
        </div>
      </div>

      {/* Expenses Table (matching mockup) */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">الوصف والبيان</th>
                <th className="py-3 px-4">المبلغ (ج.م)</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">طريقة الدفع</th>
                <th className="py-3 px-4">المستفيد</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#542E1D]">
                    {exp.categoryLabel}
                  </td>
                  <td className="py-2.5 px-4 text-[#2B170E]">{exp.description}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#341B11]">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-[#6B5345] font-mono">{exp.dueDate}</td>
                  <td className="py-2.5 px-4 text-[#7A5E4F]">
                    {exp.paymentMethod === 'cash' ? 'نقدي (خزنة)' : exp.paymentMethod === 'transfer' ? 'تحويل بنكي' : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-[#6B5345]">{exp.recipient}</td>
                  <td className="py-2.5 px-4">
                    {exp.status === 'paid' ? (
                      <span className="text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] border border-[#BDE3CB] px-2 py-0.5 rounded-md">
                        مدفوعة
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        مستحقة
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {exp.status === 'accrued' && (
                      <button
                        onClick={() => setPayingExpense(exp)}
                        className="px-2.5 py-1 text-xs bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded font-semibold flex items-center gap-1 mx-auto"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>سداد الآن</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="text-sm font-bold text-[#341B11]">تسجيل مصروف تشغيلي جديد</h3>
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    تصنيف المصروف *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setFormCategory(cat);
                      const labels: Record<string, string> = {
                        rent: 'إيجار المحل',
                        salaries: 'رواتب الموظفين',
                        utilities: 'كهرباء ومياه',
                        packaging: 'تعبئة وتغليف',
                        shipping: 'نقل وشحن',
                        maintenance: 'صيانة ومعدات',
                        supplies: 'أدوات ومستلزمات',
                        admin: 'مصروفات إدارية',
                        other: 'مصروفات أخرى',
                      };
                      setFormCategoryLabel(labels[cat] || cat);
                    }}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                  >
                    <option value="rent">إيجار المحل</option>
                    <option value="utilities">كهرباء ومياه</option>
                    <option value="salaries">رواتب الموظفين</option>
                    <option value="packaging">تعبئة وتغليف</option>
                    <option value="shipping">نقل وشحن</option>
                    <option value="maintenance">صيانة</option>
                    <option value="supplies">أدوات ومستلزمات</option>
                    <option value="admin">إدارية وعمومية</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    المبلغ (ج.م) *
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold text-sm text-[#341B11]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  البيان والوصف *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: فاتورة استهلاك كهرباء المحمصة"
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    حالة المصروف *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-semibold"
                  >
                    <option value="paid">مدفوع الآن</option>
                    <option value="accrued">مستحق (آجل)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    طريقة الدفع (في حالة السداد)
                  </label>
                  <select
                    disabled={status === 'accrued'}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg disabled:opacity-40"
                  >
                    <option value="cash">نقداً (خصم من الخزنة)</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="card">بطاقة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    المستفيد / الجهة
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="شركة الكهرباء، مالك العقار..."
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                  />
                </div>
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
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Accrued Expense Modal */}
      {payingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">سداد المصروف المستحق: {payingExpense.categoryLabel}</h3>
            <div className="text-xs text-[#6B5345]">
              المبلغ المستحق السداد: <strong className="text-sm font-mono text-[#341B11]">{formatCurrency(payingExpense.amount)}</strong>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleConfirmPay('cash')}
                className="w-full py-2 bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Banknote className="w-4 h-4" />
                <span>سداد نقداً (صرف من الخزنة)</span>
              </button>
              <button
                onClick={() => handleConfirmPay('transfer')}
                className="w-full py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>سداد عبر تحويل بنكي</span>
              </button>
              <button
                onClick={() => setPayingExpense(null)}
                className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-800"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

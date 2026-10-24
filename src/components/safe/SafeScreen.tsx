import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Calendar,
  Search,

  CheckCircle2,
  Lock,
  Wallet,
} from 'lucide-react';
import { CashTransaction } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const SafeScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [safeBalance, setSafeBalance] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');

  // Manual Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  const loadData = () => {
    setTransactions(db.getCashTransactions());
    setSafeBalance(db.getSafeBalance());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const totals = useMemo(() => {
    const totalIn = transactions.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
    return { totalIn, totalOut };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.description.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q) ||
        t.transactionNumber.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [transactions, searchQuery, typeFilter]);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustAmount <= 0 || !adjustReason.trim()) return;

    db.recordCashTransaction({
      type: adjustType,
      category: 'adjustment',
      categoryLabel: adjustType === 'in' ? 'إيداع تسوية خزنة' : 'سحب تسوية خزنة',
      amount: adjustAmount,
      description: adjustReason,
    });

    setAdjustAmount(0);
    setAdjustReason('');
    setIsAdjustModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = filteredTransactions.map((t) => ({
      'رقم الحركة': t.transactionNumber,
      'التاريخ': t.date,
      'النوع': t.type === 'in' ? 'مقبوضات واردة (+)' : 'مدفوعات صادرة (-)',
      'التصنيف': t.categoryLabel,
      'البيان والوصف': t.description,
      'المبلغ (ج.م)': t.amount,
      'الرصيد بعد الحركة (ج.م)': t.balanceAfter,
      'المسؤول': t.performedBy,
    }));
    ExportService.exportToExcel(rows, `كشف_حركة_الخزنة_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DC CE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">الخزنة والحسابات النقدية</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            دفتر يومية الصندوق: المقبوضات النقدية الفعلية، المدفوعات، وإقفال الخزنة
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
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F3ECE2] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>قيد تسوية / إيداع أو سحب</span>
          </button>
        </div>
      </div>

      {/* Top Safe Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Main Safe Balance */}
        <div className="bg-[#FAF3EB] p-5 rounded-2xl border-2 border-[#D9C4B0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#7A5E4F] mb-1 font-semibold">
            <span>الرصيد النقدي المتوفر بالخزنة</span>
            <Landmark className="w-4 h-4 text-[#8C4A26]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#2B7A4B]">
            {formatCurrency(safeBalance)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1.5">
            رصيد الخزنة الفعلي بعد كافة الحركات
          </div>
        </div>

        {/* Total Inflows */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#2B7A4B] mb-1 font-semibold">
            <span>إجمالي المقبوضات النقدية (In)</span>
            <ArrowDownLeft className="w-4 h-4 text-[#2B7A4B]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#2B7A4B]">
            {formatCurrency(totals.totalIn)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1.5">مبيعات كاش وتحصيل عملاء</div>
        </div>

        {/* Total Outflows */}
        <div className="bg-white p-5 rounded-2xl border border-[#E6D9CC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-700 mb-1 font-semibold">
            <span>إجمالي المدفوعات النقدية (Out)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700">
            {formatCurrency(totals.totalOut)}
          </div>
          <div className="text-[10px] text-[#8C7A6D] mt-1.5">موردين ومصروفات ورواتب كاش</div>
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
              placeholder="ابحث بالبيان أو رقم السند..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#DAC8B6]">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'in', label: 'مقبوضات (+)' },
              { id: 'out', label: 'مدفوعات (-)' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setTypeFilter(st.id as any)}
                className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                  typeFilter === st.id
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
          عدد القيود النقدية: {filteredTransactions.length}
        </div>
      </div>

      {/* Cash Ledger Table */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">رقم السند</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">البيان والوصف</th>
                <th className="py-3 px-4 text-center">المبلغ (ج.م)</th>
                <th className="py-3 px-4 text-left">الرصيد بعد الحركة</th>
                <th className="py-3 px-4">المسؤول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredTransactions.map((tx) => {
                const isIn = tx.type === 'in';

                return (
                  <tr key={tx.id} className="hover:bg-[#FAF6F2] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">
                      {tx.transactionNumber}
                    </td>
                    <td className="py-2.5 px-4 text-[#6B5345] font-mono">{tx.date}</td>
                    <td className="py-2.5 px-4 font-bold text-[#341B11]">{tx.categoryLabel}</td>
                    <td className="py-2.5 px-4 text-[#4A2613]">{tx.description}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2.5 py-0.5 rounded text-xs inline-block ${
                          isIn
                            ? 'bg-[#EDF8F1] text-[#2B7A4B] border border-[#BDE3CB]'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isIn ? `+${tx.amount.toFixed(2)}` : `-${tx.amount.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-bold text-[#2B170E]">
                      {formatCurrency(tx.balanceAfter)}
                    </td>
                    <td className="py-2.5 px-4 text-[#7A5E4F]">{tx.performedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="text-sm font-bold text-[#341B11]">قيد تسوية نقدية للخزنة</h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">نوع الحركة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      adjustType === 'in'
                        ? 'bg-[#2B7A4B] text-white border-[#2B7A4B]'
                        : 'bg-white text-[#6B5345] border-[#DAC8B6]'
                    }`}
                  >
                    إيداع (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      adjustType === 'out'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-[#6B5345] border-[#DAC8B6]'
                    }`}
                  >
                    سحب (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  required
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">السبب والمبرر المحاسبي *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: تغذية الصندوق أو تسوية جرد نقدية"
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg font-bold"
                >
                  اعتماد التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

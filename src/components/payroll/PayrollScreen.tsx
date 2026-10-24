import React, { useState, useEffect, useMemo } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Users,
  Search,
  Banknote,
  FileSpreadsheet,
  Calendar,
  X,

  CreditCard,
  UserCheck,
} from 'lucide-react';
import { Employee, PayrollRecord, EmployeeAdvance } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const PayrollScreen: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'advances'>('employees');

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  // Forms
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(4500);

  // Advance Form
  const [advanceEmpId, setAdvanceEmpId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(500);
  const [advanceNotes, setAdvanceNotes] = useState('');

  // Payroll Form
  const [payrollEmpId, setPayrollEmpId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState('2025-10');
  const [bonuses, setBonuses] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [advanceDeduction, setAdvanceDeduction] = useState<number>(0);

  const loadData = () => {
    setEmployees(db.getEmployees());
    setPayroll(db.getPayroll());
    setAdvances(db.getAdvances());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    db.saveEmployee({
      id: 'emp-' + Date.now(),
      name: empName.trim(),
      role: empRole.trim() || 'موظف محمصة',
      phone: empPhone.trim(),
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: Number(empSalary) || 4000,
      status: 'active',
      currentAdvancesBalance: 0,
      createdAt: new Date().toISOString(),
    });

    setEmpName('');
    setEmpRole('');
    setEmpPhone('');
    setIsEmployeeModalOpen(false);
  };

  const handleDisburseAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === advanceEmpId);
    if (!emp || advanceAmount <= 0) return;

    db.recordAdvance({
      advanceNumber: 'ADV-' + (advances.length + 1002),
      employeeId: emp.id,
      employeeName: emp.name,
      amount: advanceAmount,
      date: new Date().toISOString().split('T')[0],
      status: 'disbursed',
      remainingAmount: advanceAmount,
      paidFromSafe: true,
      notes: advanceNotes,
    });

    setAdvanceAmount(500);
    setAdvanceNotes('');
    setIsAdvanceModalOpen(false);
  };

  const handleGeneratePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === payrollEmpId);
    if (!emp) return;

    const netSalary = Math.max(0, emp.baseSalary + Number(bonuses) - Number(deductions) - Number(advanceDeduction));

    db.recordPayroll({
      month: payrollMonth,
      employeeId: emp.id,
      employeeName: emp.name,
      baseSalary: emp.baseSalary,
      bonuses: Number(bonuses),
      deductions: Number(deductions),
      advanceDeduction: Number(advanceDeduction),
      netSalary,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      paidBy: db.getSession().name,
      notes: `مسير راتب شهر ${payrollMonth}`,
    });

    setBonuses(0);
    setDeductions(0);
    setAdvanceDeduction(0);
    setIsPayrollModalOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#341B11]">الموظفون والرواتب والسلف</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            إدارة كادر العمل، صرف السلف النقدية، واحتساب وصرف الرواتب دون ازدواج حساب السلف
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAdvanceEmpId(employees[0]?.id || '');
              setIsAdvanceModalOpen(true);
            }}
            className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#8C4A26] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>+ سلفة نقدية</span>
          </button>
          <button
            onClick={() => {
              setPayrollEmpId(employees[0]?.id || '');
              setIsPayrollModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <BadgeDollarSign className="w-4 h-4" />
            <span>+ مسير راتب</span>
          </button>
          <button
            onClick={() => setIsEmployeeModalOpen(true)}
            className="px-3.5 sm:px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>+ موظف</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E0D2C3] pb-1">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'employees'
              ? 'bg-[#542E1D] text-white'
              : 'text-[#6B5345] hover:bg-[#F3ECE2]'
          }`}
        >
          سجل الموظفين ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'payroll'
              ? 'bg-[#542E1D] text-white'
              : 'text-[#6B5345] hover:bg-[#F3ECE2]'
          }`}
        >
          مسيرات الرواتب ({payroll.length})
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'advances'
              ? 'bg-[#542E1D] text-white'
              : 'text-[#6B5345] hover:bg-[#F3ECE2]'
          }`}
        >
          سجل السلف النقدية ({advances.length})
        </button>
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">اسم الموظف</th>
                <th className="py-3 px-4">المسمى الوظيفي</th>
                <th className="py-3 px-4">الهاتف</th>
                <th className="py-3 px-4">الراتب الأساسي</th>
                <th className="py-3 px-4">رصيد السلف الحالية</th>
                <th className="py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#2B170E]">{emp.name}</td>
                  <td className="py-2.5 px-4 text-[#542E1D]">{emp.role}</td>
                  <td className="py-2.5 px-4 font-mono text-[#6B5345]">{emp.phone}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#341B11]">
                    {formatCurrency(emp.baseSalary)}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-700">
                    {emp.currentAdvancesBalance > 0 ? formatCurrency(emp.currentAdvancesBalance) : '0.00 ج.م'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] px-2 py-0.5 rounded">
                      نشط
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">الشهر</th>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-4">الراتب الأساسي</th>
                <th className="py-3 px-4">المكافآت</th>
                <th className="py-3 px-4">الخصومات</th>
                <th className="py-3 px-4">تسوية السلفة</th>
                <th className="py-3 px-4">صافي الراتب المسدد</th>
                <th className="py-3 px-4">تاريخ الصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {payroll.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">{p.month}</td>
                  <td className="py-2.5 px-4 font-bold text-[#2B170E]">{p.employeeName}</td>
                  <td className="py-2.5 px-4 font-mono">{formatCurrency(p.baseSalary)}</td>
                  <td className="py-2.5 px-4 font-mono text-[#2B7A4B]">+{p.bonuses}</td>
                  <td className="py-2.5 px-4 font-mono text-rose-600">-{p.deductions}</td>
                  <td className="py-2.5 px-4 font-mono text-amber-700">-{p.advanceDeduction}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#1E5C36]">
                    {formatCurrency(p.netSalary)}
                  </td>
                  <td className="py-2.5 px-4 text-[#6B5345] font-mono">{p.paidDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ADVANCES */}
      {activeTab === 'advances' && (
        <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">رقم إذن السلفة</th>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-4">تاريخ الصرف</th>
                <th className="py-3 px-4">المبلغ المنصرف (ج.م)</th>
                <th className="py-3 px-4">المتبقي للخصم</th>
                <th className="py-3 px-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {advances.map((a) => (
                <tr key={a.id} className="hover:bg-[#FAF6F2] transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">{a.advanceNumber}</td>
                  <td className="py-2.5 px-4 font-bold text-[#2B170E]">{a.employeeName}</td>
                  <td className="py-2.5 px-4 text-[#6B5345] font-mono">{a.date}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#341B11]">
                    {formatCurrency(a.amount)}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-700">
                    {formatCurrency(a.remainingAmount)}
                  </td>
                  <td className="py-2.5 px-4 text-[#7A5E4F]">{a.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">صرف سلفة نقدية من الخزنة</h3>
            <form onSubmit={handleDisburseAdvance} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">الموظف *</label>
                <select
                  value={advanceEmpId}
                  onChange={(e) => setAdvanceEmpId(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} (الراتب: {e.baseSalary} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">قيمة السلفة (ج.م) *</label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">السبب أو المبرر</label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="سلفة طارئة معتمدة..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg font-bold"
                >
                  صرف السلفة نقداً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payroll Modal */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">إصدار وصرف مسير راتب</h3>
            <form onSubmit={handleGeneratePayroll} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">الموظف *</label>
                <select
                  value={payrollEmpId}
                  onChange={(e) => {
                    setPayrollEmpId(e.target.value);
                    const selected = employees.find((emp) => emp.id === e.target.value);
                    if (selected && selected.currentAdvancesBalance > 0) {
                      setAdvanceDeduction(selected.currentAdvancesBalance);
                    } else {
                      setAdvanceDeduction(0);
                    }
                  }}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — أساسي: {e.baseSalary} ج.م {e.currentAdvancesBalance > 0 ? `(سلفة: ${e.currentAdvancesBalance})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">الشهر</label>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#2B7A4B] mb-1">مكافآت (+)</label>
                  <input
                    type="number"
                    min="0"
                    value={bonuses}
                    onChange={(e) => setBonuses(Number(e.target.value))}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-600 mb-1">خصومات (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-amber-700 mb-1">
                  خصم من السلفة المستحقة (-)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advanceDeduction}
                  onChange={(e) => setAdvanceDeduction(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2B7A4B] text-white rounded-lg font-bold"
                >
                  صرف الراتب نقداً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="font-bold text-[#542E1D]">إضافة موظف جديد</h3>
            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="كاشير، مسؤول تحميص، تعبئة..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="010..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#542E1D] mb-1">الراتب الأساسي (ج.م) *</label>
                <input
                  type="number"
                  required
                  value={empSalary}
                  onChange={(e) => setEmpSalary(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg font-bold"
                >
                  حفظ الموظف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

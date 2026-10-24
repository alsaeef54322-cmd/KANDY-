import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,

  Layers,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Receipt,
  Truck,
  Boxes,
  Users,
  Wallet,
  Landmark,
} from 'lucide-react';
import { db } from '../../services/storage';
import { computeFinancialSummary, formatCurrency, DateFilterType } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

type ReportType =
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'profit_loss'
  | 'expenses'
  | 'suppliers'
  | 'customers'
  | 'safe'
  | 'spoilage'
  | 'payroll';

export const ReportsScreen: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('profit_loss');
  const [period, setPeriod] = useState<DateFilterType>('month');

  const financialSummary = useMemo(() => computeFinancialSummary(period), [period]);
  const sales = useMemo(() => db.getSales(), []);
  const purchases = useMemo(() => db.getPurchases(), []);
  const products = useMemo(() => db.getProducts(), []);
  const suppliers = useMemo(() => db.getSuppliers(), []);
  const customers = useMemo(() => db.getCustomers(), []);
  const expenses = useMemo(() => db.getExpenses(), []);
  const safeTransactions = useMemo(() => db.getCashTransactions(), []);
  const spoilage = useMemo(() => db.getSpoilage(), []);
  const employees = useMemo(() => db.getEmployees(), []);

  const reportDefinitions: { id: ReportType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profit_loss', label: 'الأرباح والخسائر والمركز المالي', icon: TrendingUp },
    { id: 'sales', label: 'المبيعات والفواتير', icon: Receipt },
    { id: 'purchases', label: 'المشتريات والتوريدات', icon: Truck },
    { id: 'inventory', label: 'المخزون وقيمة الأصناف بالتكلفة', icon: Boxes },
    { id: 'expenses', label: 'المصروفات التشغيلية', icon: Wallet },
    { id: 'suppliers', label: 'الموردون والمستحقات', icon: Users },
    { id: 'customers', label: 'العملاء والديون الآجلة', icon: Users },
    { id: 'safe', label: 'حركة الخزنة والسيولة النقدية', icon: Landmark },
    { id: 'spoilage', label: 'التالف والهالك وعينات الفحص', icon: Layers },
    { id: 'payroll', label: 'الرواتب والسلف وكادر العمل', icon: BarChart3 },
  ];

  // Export current active report to Excel
  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];

    switch (selectedReport) {
      case 'profit_loss':
        ExportService.exportFinancialReport(financialSummary);
        break;

      case 'sales': {
        const rows = sales.map((s) => ({
          'رقم الفاتورة': s.invoiceNumber,
          'التاريخ': s.date,
          'العميل': s.customerName || 'عميل نقدي عام',
          'الإجمالي (ج.م)': s.total,
          'تكلفة البضاعة المباعة (ج.م)': s.cogsTotal,
          'مجمل الربح (ج.م)': s.grossProfit,
          'طريقة الدفع': s.paymentMethod,
          'الكاشير': s.cashierName,
        }));
        ExportService.exportToExcel(rows, `تقرير_مبيعات_كاندي_${dateStr}`);
        break;
      }

      case 'purchases': {
        const rows = purchases.map((p) => ({
          'رقم الفاتورة': p.invoiceNumber,
          'المورد': p.supplierName,
          'التاريخ': p.date,
          'الإجمالي (ج.م)': p.total,
          'المدفوع': p.paidAmount,
          'المتبقي': p.remainingAmount,
          'الحالة': p.status,
        }));
        ExportService.exportToExcel(rows, `تقرير_مشتريات_كاندي_${dateStr}`);
        break;
      }

      case 'inventory': {
        const rows = products.map((p) => ({
          'كود الصنف': p.code,
          'اسم المنتج': p.name,
          'القسم': p.categoryName,
          'سعر البيع': p.salePricePerSaleUnit,
          'تكلفة الوحدة': p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit,
          'الكمية بالمخزون': p.type === 'weight' ? `${p.stockQuantity / 1000} كجم` : p.stockQuantity,
          'قيمة المخزون بالتكلفة (ج.م)': Math.round(p.stockQuantity * p.costPricePerStockUnit * 100) / 100,
        }));
        ExportService.exportToExcel(rows, `تقرير_المخزون_والتكلفة_${dateStr}`);
        break;
      }

      case 'expenses': {
        const rows = expenses.map((e) => ({
          'كود المصروف': e.code,
          'التصنيف': e.categoryLabel,
          'الوصف': e.description,
          'المبلغ (ج.م)': e.amount,
          'التاريخ': e.dueDate,
          'الحالة': e.status,
          'المستفيد': e.recipient,
        }));
        ExportService.exportToExcel(rows, `تقرير_المصروفات_${dateStr}`);
        break;
      }

      case 'suppliers': {
        const rows = suppliers.map((s) => ({
          'المورد': s.name,
          'الهاتف': s.phone,
          'إجمالي المشتريات': s.totalPurchases,
          'إجمالي المسدد': s.totalPaid,
          'المستحق للمورد (ج.م)': s.balanceDue,
        }));
        ExportService.exportToExcel(rows, `تقرير_حسابات_الموردين_${dateStr}`);
        break;
      }

      case 'customers': {
        const rows = customers.map((c) => ({
          'العميل': c.name,
          'الهاتف': c.phone,
          'إجمالي المشتريات': c.totalPurchases,
          'إجمالي المسدد': c.totalPaid,
          'الديون المستحقة (ج.م)': c.balanceDue,
        }));
        ExportService.exportToExcel(rows, `تقرير_حسابات_العملاء_${dateStr}`);
        break;
      }

      case 'safe': {
        const rows = safeTransactions.map((t) => ({
          'رقم السند': t.transactionNumber,
          'التاريخ': t.date,
          'النوع': t.type === 'in' ? 'وارد' : 'صادر',
          'التصنيف': t.categoryLabel,
          'المبلغ': t.amount,
          'الرصيد بعد الحركة': t.balanceAfter,
          'البيان': t.description,
        }));
        ExportService.exportToExcel(rows, `تقرير_حركة_الخزنة_${dateStr}`);
        break;
      }

      case 'spoilage': {
        const rows = spoilage.map((sp) => ({
          'رقم المحضر': sp.spoilageNumber,
          'المنتج': sp.productName,
          'الكمية': `${sp.quantity} ${sp.unit}`,
          'الخسارة المالية (ج.م)': sp.totalCostLoss,
          'السبب': sp.reasonText,
          'التاريخ': sp.date,
        }));
        ExportService.exportToExcel(rows, `تقرير_التالف_${dateStr}`);
        break;
      }

      case 'payroll': {
        const rows = employees.map((emp) => ({
          'اسم الموظف': emp.name,
          'المسمى الوظيفي': emp.role,
          'الراتب الأساسي': emp.baseSalary,
          'رصيد السلف الحالية': emp.currentAdvancesBalance,
        }));
        ExportService.exportToExcel(rows, `تقرير_الموظفين_والرواتب_${dateStr}`);
        break;
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11]">مركز التقارير المالية والإدارية الشامل</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            استخراج تقارير الأرباح والخسائر، المبيعات، المخزون، والديون بصيغة جداول Excel (XLSX) وطباعة الفواتير
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E0D2C3] shadow-2xs">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'الأسبوع' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'all', label: 'الكل' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as DateFilterType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === tab.id
                    ? 'bg-[#542E1D] text-white shadow-xs'
                    : 'text-[#6B5345] hover:bg-[#F5ECE1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-1.5 bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FDE68A]" />
            <span>تصدير Excel (XLSX)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>

      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {reportDefinitions.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReport === rep.id;

          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#542E1D] text-white shadow-xs'
                  : 'bg-white text-[#6B5345] border border-[#E0D2C3] hover:bg-[#F5ECE1]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FDE68A]' : 'text-[#8C6F5E]'}`} />
              <span>{rep.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Report Preview Container */}
      <div className="bg-white rounded-2xl border border-[#E6D9CC] shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D7]">
          <div>
            <h3 className="text-base font-bold text-[#341B11]">
              معاينة: {reportDefinitions.find((r) => r.id === selectedReport)?.label}
            </h3>
            <p className="text-xs text-[#8C7A6D] mt-0.5">
              بيانات حقيقية معتمدة مستخرجة آلياً · الفترة: {financialSummary.periodLabel}
            </p>
          </div>
        </div>

        {/* Dynamic preview based on selected report */}
        {selectedReport === 'profit_loss' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4]">
                <div className="text-[11px] text-[#6B5345]">صافي المبيعات</div>
                <div className="text-base font-bold font-mono text-[#341B11]">{formatCurrency(financialSummary.netSales)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4]">
                <div className="text-[11px] text-[#6B5345]">تكلفة البضاعة المباعة</div>
                <div className="text-base font-bold font-mono text-amber-700">{formatCurrency(financialSummary.cogs)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4]">
                <div className="text-[11px] text-[#6B5345]">المصروفات التشغيلية</div>
                <div className="text-base font-bold font-mono text-rose-600">{formatCurrency(financialSummary.operatingExpenses)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#EDF8F1] border border-[#BDE3CB]">
                <div className="text-[11px] text-[#1E5C36]">صافي الربح النهائي</div>
                <div className="text-base font-extrabold font-mono text-[#1E5C36]">{formatCurrency(financialSummary.netProfit)}</div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">العميل</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">مجمل الربح</th>
                  <th className="py-2.5 px-3">الكاشير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">#{s.invoiceNumber}</td>
                    <td className="py-2 px-3 text-[#6B5345] font-mono">{s.date}</td>
                    <td className="py-2 px-3">{s.customerName || 'عميل نقدي عام'}</td>
                    <td className="py-2 px-3 font-mono font-bold">{formatCurrency(s.total)}</td>
                    <td className="py-2 px-3 font-mono text-[#2B7A4B]">{formatCurrency(s.grossProfit)}</td>
                    <td className="py-2 px-3 text-[#7A5E4F]">{s.cashierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">الكود</th>
                  <th className="py-2.5 px-3">المنتج</th>
                  <th className="py-2.5 px-3">القسم</th>
                  <th className="py-2.5 px-3">الكمية بالمخزون</th>
                  <th className="py-2.5 px-3">تكلفة الوحدة</th>
                  <th className="py-2.5 px-3">القيمة بالتكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-mono">{p.code}</td>
                    <td className="py-2 px-3 font-bold text-[#2B170E]">{p.name}</td>
                    <td className="py-2 px-3">{p.categoryName}</td>
                    <td className="py-2 px-3 font-mono font-bold">
                      {p.type === 'weight' ? `${(p.stockQuantity / 1000).toFixed(3)} كجم` : `${p.stockQuantity} ${p.stockUnit}`}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {formatCurrency(p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">
                      {formatCurrency(p.stockQuantity * p.costPricePerStockUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'suppliers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">المورد</th>
                  <th className="py-2.5 px-3">الهاتف</th>
                  <th className="py-2.5 px-3">إجمالي المشتريات</th>
                  <th className="py-2.5 px-3">المسدد</th>
                  <th className="py-2.5 px-3">المستحق الحالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-bold text-[#2B170E]">{s.name}</td>
                    <td className="py-2 px-3 font-mono">{s.phone}</td>
                    <td className="py-2 px-3 font-mono">{formatCurrency(s.totalPurchases)}</td>
                    <td className="py-2 px-3 font-mono text-[#2B7A4B]">{formatCurrency(s.totalPaid)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-amber-700">{formatCurrency(s.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

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
  CalendarDays,
  CalendarRange,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { db } from '../../services/storage';
import {
  computeFinancialSummary,
  formatCurrency,
  DateFilterType,
  filterByDate,
} from '../../services/accounting';
import { ExportService } from '../../services/exportService';
import { printReportDocument, PrintReportColumn, PrintReportKPI } from '../../services/printService';

type ReportType =
  | 'profit_loss'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'expenses'
  | 'suppliers'
  | 'customers'
  | 'safe'
  | 'spoilage'
  | 'payroll';

export const ReportsScreen: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('profit_loss');
  const [period, setPeriod] = useState<DateFilterType>('month');
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');
  const [tableSearch, setTableSearch] = useState('');

  // Period label helper
  const periodLabelText = useMemo(() => {
    switch (period) {
      case 'today':
        return 'اليوم';
      case 'week':
        return 'الأسبوع الحالي';
      case 'month':
        return 'هذا الشهر';
      case 'last_month':
        return 'الشهر السابق';
      case 'all':
      default:
        return 'كافة الفترات';
    }
  }, [period]);

  // Compute live data with date filters
  const financialSummary = useMemo(() => computeFinancialSummary(period), [period]);

  const allSales = useMemo(() => db.getSales(), []);
  const allPurchases = useMemo(() => db.getPurchases(), []);
  const allExpenses = useMemo(() => db.getExpenses(), []);
  const allSafeTransactions = useMemo(() => db.getCashTransactions(), []);
  const allSpoilage = useMemo(() => db.getSpoilage(), []);

  // Filtered by selected period
  const sales = useMemo(() => filterByDate(allSales, period), [allSales, period]);
  const purchases = useMemo(() => filterByDate(allPurchases, period), [allPurchases, period]);
  const expenses = useMemo(() => filterByDate(allExpenses, period), [allExpenses, period]);
  const safeTransactions = useMemo(
    () => filterByDate(allSafeTransactions, period),
    [allSafeTransactions, period]
  );
  const spoilage = useMemo(() => filterByDate(allSpoilage, period), [allSpoilage, period]);

  // General datasets
  const products = useMemo(() => db.getProducts(), []);
  const suppliers = useMemo(() => db.getSuppliers(), []);
  const customers = useMemo(() => db.getCustomers(), []);
  const employees = useMemo(() => db.getEmployees(), []);

  // --- RECHARTS: Aggregated Daily Sales Data ---
  const dailySalesData = useMemo(() => {
    const map = new Map<
      string,
      { date: string; displayDate: string; sales: number; profit: number; count: number }
    >();

    allSales.forEach((s) => {
      const d = s.date.split('T')[0];
      const existing = map.get(d) || {
        date: d,
        displayDate: d.substring(5), // MM-DD
        sales: 0,
        profit: 0,
        count: 0,
      };
      existing.sales += s.total;
      existing.profit += s.grossProfit;
      existing.count += 1;
      map.set(d, existing);
    });

    const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-14); // show last 14 active days
  }, [allSales]);

  // --- RECHARTS: Aggregated Monthly Sales Data ---
  const monthlySalesData = useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; monthLabel: string; sales: number; profit: number; count: number }
    >();
    const monthNames: Record<string, string> = {
      '01': 'يناير',
      '02': 'فبراير',
      '03': 'مارس',
      '04': 'أبريل',
      '05': 'مايو',
      '06': 'يونيو',
      '07': 'يوليو',
      '08': 'أغسطس',
      '09': 'سبتمبر',
      '10': 'أكتوبر',
      '11': 'نوفمبر',
      '12': 'ديسمبر',
    };

    allSales.forEach((s) => {
      const monthKey = s.date.substring(0, 7); // YYYY-MM
      const [year, month] = monthKey.split('-');
      const label = `${monthNames[month] || month} ${year}`;
      const existing = map.get(monthKey) || {
        monthKey,
        monthLabel: label,
        sales: 0,
        profit: 0,
        count: 0,
      };
      existing.sales += s.total;
      existing.profit += s.grossProfit;
      existing.count += 1;
      map.set(monthKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [allSales]);

  // Overall chart summary metrics
  const totalChartSales = useMemo(() => {
    return allSales.reduce((acc, s) => acc + s.total, 0);
  }, [allSales]);

  const totalChartProfit = useMemo(() => {
    return allSales.reduce((acc, s) => acc + s.grossProfit, 0);
  }, [allSales]);

  const peakDaySale = useMemo(() => {
    if (!dailySalesData.length) return null;
    return [...dailySalesData].sort((a, b) => b.sales - a.sales)[0];
  }, [dailySalesData]);

  // Report Definitions (10 Full Reports)
  const reportDefinitions: {
    id: ReportType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
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

  // Dedicated Print Engine Trigger for Active Report
  const handlePrintActiveReport = () => {
    const activeDef = reportDefinitions.find((r) => r.id === selectedReport);
    const title = activeDef ? activeDef.label : 'تقرير كاندي';

    let columns: PrintReportColumn[] = [];
    let rows: (string | number)[][] = [];
    let kpis: PrintReportKPI[] = [];
    let summaryNotes: string[] = [];

    switch (selectedReport) {
      case 'profit_loss':
        kpis = [
          { label: 'صافي المبيعات', value: formatCurrency(financialSummary.netSales), color: '#341B11' },
          { label: 'تكلفة البضاعة (COGS)', value: formatCurrency(financialSummary.cogs), color: '#C28B38' },
          { label: 'مجمل الربح', value: formatCurrency(financialSummary.grossProfit), color: '#2B7A4B' },
          { label: 'صافي الربح النهائي', value: formatCurrency(financialSummary.netProfit), color: '#1B5E20' },
        ];
        columns = [
          { header: 'البند المالي / البيان', align: 'right', width: '45%' },
          { header: 'المبلغ (ج.م)', align: 'left', width: '25%' },
          { header: 'النسبة المئوية', align: 'center', width: '30%' },
        ];
        rows = [
          ['إجمالي المبيعات (Gross Sales)', formatCurrency(financialSummary.grossSales), '100%'],
          ['الخصومات والمرتجعات', formatCurrency(financialSummary.discounts + financialSummary.returns), '-'],
          ['صافي المبيعات (Net Sales)', formatCurrency(financialSummary.netSales), '100%'],
          ['تكلفة البضاعة المباعة (COGS)', formatCurrency(financialSummary.cogs), `${financialSummary.grossMarginPercent ? (100 - financialSummary.grossMarginPercent).toFixed(1) : 0}%`],
          ['مجمل الربح التجاري (Gross Profit)', formatCurrency(financialSummary.grossProfit), `${financialSummary.grossMarginPercent.toFixed(1)}%`],
          ['المصروفات التشغيلية والعمومية', formatCurrency(financialSummary.operatingExpenses), '-'],
          ['خسائر التالف والهالك', formatCurrency(financialSummary.spoilageLoss), '-'],
          ['صافي الربح المحاسبي النهائي (Net Profit)', formatCurrency(financialSummary.netProfit), `${financialSummary.netMarginPercent.toFixed(1)}%`],
          ['قيمة المخزون الحالي بالتكلفة', formatCurrency(financialSummary.inventoryCostValue), 'أصل متداول'],
          ['رصيد النقدية بالخزنة', formatCurrency(financialSummary.safeBalance), 'سيولة نقدية'],
        ];
        summaryNotes = [
          `نسبة مجمل الربح: ${financialSummary.grossMarginPercent.toFixed(1)}%`,
          `نسبة صافي الربح إلى المبيعات: ${financialSummary.netMarginPercent.toFixed(1)}%`,
        ];
        break;

      case 'sales':
        kpis = [
          { label: 'إجمالي المبيعات', value: formatCurrency(sales.reduce((acc, s) => acc + s.total, 0)), color: '#341B11' },
          { label: 'مجمل الربح', value: formatCurrency(sales.reduce((acc, s) => acc + s.grossProfit, 0)), color: '#2B7A4B' },
          { label: 'عدد الفواتير', value: sales.length.toString(), color: '#8C4A26' },
        ];
        columns = [
          { header: 'رقم الفاتورة', align: 'center', width: '15%' },
          { header: 'التاريخ', align: 'center', width: '15%' },
          { header: 'العميل', align: 'right', width: '20%' },
          { header: 'طريقة الدفع', align: 'center', width: '12%' },
          { header: 'الإجمالي (ج.م)', align: 'left', width: '14%' },
          { header: 'مجمل الربح (ج.م)', align: 'left', width: '14%' },
          { header: 'الكاشير', align: 'right', width: '10%' },
        ];
        rows = sales.map((s) => [
          `#${s.invoiceNumber}`,
          s.date.split('T')[0],
          s.customerName || 'عميل نقدي عام',
          s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'card' ? 'فيزا/بطاقة' : 'آجل',
          formatCurrency(s.total),
          formatCurrency(s.grossProfit),
          s.cashierName,
        ]);
        break;

      case 'purchases':
        kpis = [
          { label: 'إجمالي المشتريات', value: formatCurrency(purchases.reduce((acc, p) => acc + p.total, 0)), color: '#341B11' },
          { label: 'المسدد للموردين', value: formatCurrency(purchases.reduce((acc, p) => acc + p.paidAmount, 0)), color: '#2B7A4B' },
          { label: 'المتبقي آجل', value: formatCurrency(purchases.reduce((acc, p) => acc + p.remainingAmount, 0)), color: '#C28B38' },
        ];
        columns = [
          { header: 'رقم الفاتورة', align: 'center', width: '15%' },
          { header: 'المورد', align: 'right', width: '25%' },
          { header: 'التاريخ', align: 'center', width: '15%' },
          { header: 'الإجمالي (ج.م)', align: 'left', width: '15%' },
          { header: 'المدفوع', align: 'left', width: '15%' },
          { header: 'المتبقي', align: 'left', width: '15%' },
        ];
        rows = purchases.map((p) => [
          `#${p.invoiceNumber}`,
          p.supplierName,
          p.date,
          formatCurrency(p.total),
          formatCurrency(p.paidAmount),
          formatCurrency(p.remainingAmount),
        ]);
        break;

      case 'inventory': {
        const totalStockVal = products.reduce((acc, p) => acc + p.stockQuantity * p.costPricePerStockUnit, 0);
        kpis = [
          { label: 'إجمالي الأصناف', value: products.length.toString(), color: '#341B11' },
          { label: 'قيمة المخزون بالتكلفة', value: formatCurrency(totalStockVal), color: '#2B7A4B' },
          { label: 'أصناف قاربت على النفاد', value: products.filter((p) => p.stockQuantity <= p.minStockAlert).length.toString(), color: '#C28B38' },
        ];
        columns = [
          { header: 'الكود', align: 'center', width: '12%' },
          { header: 'اسم المنتج', align: 'right', width: '28%' },
          { header: 'القسم', align: 'right', width: '18%' },
          { header: 'الكمية المتوفرة', align: 'center', width: '16%' },
          { header: 'سعر البيع', align: 'left', width: '13%' },
          { header: 'القيمة بالتكلفة', align: 'left', width: '13%' },
        ];
        rows = products.map((p) => [
          p.code,
          p.name,
          p.categoryName,
          p.type === 'weight' ? `${(p.stockQuantity / 1000).toFixed(3)} كجم` : `${p.stockQuantity} ${p.stockUnit}`,
          formatCurrency(p.salePricePerSaleUnit),
          formatCurrency(p.stockQuantity * p.costPricePerStockUnit),
        ]);
        break;
      }

      case 'expenses': {
        const totalExp = expenses.reduce((acc, e) => acc + e.amount, 0);
        kpis = [
          { label: 'إجمالي المصروفات', value: formatCurrency(totalExp), color: '#B71C1C' },
          { label: 'عدد سندات الصرف', value: expenses.length.toString(), color: '#341B11' },
        ];
        columns = [
          { header: 'كود المصروف', align: 'center', width: '15%' },
          { header: 'التصنيف', align: 'right', width: '20%' },
          { header: 'البيان والوصف', align: 'right', width: '30%' },
          { header: 'المبلغ (ج.م)', align: 'left', width: '15%' },
          { header: 'التاريخ', align: 'center', width: '10%' },
          { header: 'المستفيد', align: 'right', width: '10%' },
        ];
        rows = expenses.map((e) => [
          e.code,
          e.categoryLabel,
          e.description,
          formatCurrency(e.amount),
          e.dueDate,
          e.recipient,
        ]);
        break;
      }

      case 'suppliers':
        kpis = [
          { label: 'عدد الموردين', value: suppliers.length.toString(), color: '#341B11' },
          { label: 'إجمالي مشتريات الموردين', value: formatCurrency(suppliers.reduce((acc, s) => acc + s.totalPurchases, 0)), color: '#341B11' },
          { label: 'إجمالي المستحق للموردين', value: formatCurrency(suppliers.reduce((acc, s) => acc + s.balanceDue, 0)), color: '#C28B38' },
        ];
        columns = [
          { header: 'اسم المورد', align: 'right', width: '30%' },
          { header: 'رقم الهاتف', align: 'center', width: '20%' },
          { header: 'إجمالي المشتريات', align: 'left', width: '18%' },
          { header: 'المسدد', align: 'left', width: '16%' },
          { header: 'المستحق الحالي', align: 'left', width: '16%' },
        ];
        rows = suppliers.map((s) => [
          s.name,
          s.phone,
          formatCurrency(s.totalPurchases),
          formatCurrency(s.totalPaid),
          formatCurrency(s.balanceDue),
        ]);
        break;

      case 'customers':
        kpis = [
          { label: 'عدد العملاء', value: customers.length.toString(), color: '#341B11' },
          { label: 'إجمالي مبيعات العملاء', value: formatCurrency(customers.reduce((acc, c) => acc + c.totalPurchases, 0)), color: '#341B11' },
          { label: 'إجمالي الديون المستحقة', value: formatCurrency(customers.reduce((acc, c) => acc + c.balanceDue, 0)), color: '#B71C1C' },
        ];
        columns = [
          { header: 'اسم العميل', align: 'right', width: '30%' },
          { header: 'رقم الهاتف', align: 'center', width: '20%' },
          { header: 'إجمالي المشتريات', align: 'left', width: '18%' },
          { header: 'المسدد', align: 'left', width: '16%' },
          { header: 'الديون المستحقة', align: 'left', width: '16%' },
        ];
        rows = customers.map((c) => [
          c.name,
          c.phone,
          formatCurrency(c.totalPurchases),
          formatCurrency(c.totalPaid),
          formatCurrency(c.balanceDue),
        ]);
        break;

      case 'safe':
        kpis = [
          { label: 'الرصيد النقدي بالخزنة', value: formatCurrency(financialSummary.safeBalance), color: '#2B7A4B' },
          { label: 'إجمالي المقبوضات (وارد)', value: formatCurrency(safeTransactions.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.amount, 0)), color: '#2B7A4B' },
          { label: 'إجمالي المدفوعات (صادر)', value: formatCurrency(safeTransactions.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.amount, 0)), color: '#B71C1C' },
        ];
        columns = [
          { header: 'رقم السند', align: 'center', width: '15%' },
          { header: 'التاريخ', align: 'center', width: '15%' },
          { header: 'النوع', align: 'center', width: '12%' },
          { header: 'التصنيف', align: 'right', width: '18%' },
          { header: 'المبلغ (ج.م)', align: 'left', width: '15%' },
          { header: 'الرصيد بعدها', align: 'left', width: '15%' },
          { header: 'البيان', align: 'right', width: '10%' },
        ];
        rows = safeTransactions.map((t) => [
          t.transactionNumber,
          t.date,
          t.type === 'in' ? 'وارد (+)' : 'صادر (-)',
          t.categoryLabel,
          formatCurrency(t.amount),
          formatCurrency(t.balanceAfter),
          t.description,
        ]);
        break;

      case 'spoilage':
        kpis = [
          { label: 'إجمالي الخسارة المالية', value: formatCurrency(spoilage.reduce((acc, s) => acc + s.totalCostLoss, 0)), color: '#B71C1C' },
          { label: 'عدد محاضر التالف', value: spoilage.length.toString(), color: '#341B11' },
        ];
        columns = [
          { header: 'رقم المحضر', align: 'center', width: '15%' },
          { header: 'المنتج', align: 'right', width: '30%' },
          { header: 'الكمية', align: 'center', width: '15%' },
          { header: 'خسارة التكلفة (ج.م)', align: 'left', width: '15%' },
          { header: 'السبب', align: 'right', width: '15%' },
          { header: 'التاريخ', align: 'center', width: '10%' },
        ];
        rows = spoilage.map((sp) => [
          sp.spoilageNumber,
          sp.productName,
          `${sp.quantity} ${sp.unit}`,
          formatCurrency(sp.totalCostLoss),
          sp.reasonText,
          sp.date,
        ]);
        break;

      case 'payroll':
        kpis = [
          { label: 'إجمالي كادر العمل', value: employees.length.toString(), color: '#341B11' },
          { label: 'إجمالي مسير الرواتب', value: formatCurrency(employees.reduce((acc, e) => acc + e.baseSalary, 0)), color: '#341B11' },
          { label: 'رصيد السلف القائمة', value: formatCurrency(employees.reduce((acc, e) => acc + e.currentAdvancesBalance, 0)), color: '#C28B38' },
        ];
        columns = [
          { header: 'اسم الموظف', align: 'right', width: '30%' },
          { header: 'المسمى الوظيفي', align: 'right', width: '25%' },
          { header: 'الراتب الأساسي', align: 'left', width: '15%' },
          { header: 'السلف القائمة', align: 'left', width: '15%' },
          { header: 'صافي المستحق التقديري', align: 'left', width: '15%' },
        ];
        rows = employees.map((emp) => [
          emp.name,
          emp.role,
          formatCurrency(emp.baseSalary),
          formatCurrency(emp.currentAdvancesBalance),
          formatCurrency(Math.max(0, emp.baseSalary - emp.currentAdvancesBalance)),
        ]);
        break;
    }

    printReportDocument({
      title,
      subtitle: 'محمصة كاندي — الأستاذ إبراهيم راغب',
      periodLabel: periodLabelText,
      kpis,
      columns,
      rows,
      summaryNotes,
    });
  };

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
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2] printable-content">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE] no-print">
        <div>
          <h2 className="text-xl font-bold text-[#341B11] flex items-center gap-2">
            <span>مركز التقارير المالية والإدارية الشامل</span>
            <span className="text-xs bg-[#542E1D]/10 text-[#542E1D] font-bold px-2 py-0.5 rounded-full">
              كاندي
            </span>
          </h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            المنظومة المتكاملة للأستاذ إبراهيم راغب لمتابعة المبيعات، الأرباح، المخزون، والطباعة الدقيقة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
            className="px-4 py-1.5 bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FDE68A]" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handlePrintActiveReport}
            className="px-3.5 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#FDE68A]" />
            <span>طباعة التقرير (A4)</span>
          </button>
        </div>
      </div>

      {/* --- VISUAL ANALYTICS CARD WITH RECHARTS --- */}
      <div className="bg-white rounded-2xl border border-[#E6D9CC] shadow-2xs p-5 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE1D7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8C4A26] to-[#542E1D] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#341B11] flex items-center gap-2">
                <span>المخطط البياني التفاعلي للمبيعات (Recharts)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  تحليل مباشر
                </span>
              </h3>
              <p className="text-[11px] text-[#7A5E4F] mt-0.5">
                متابعة حركة المبيعات اليومية والشهرية بصورة مرئية ودقيقة للأستاذ إبراهيم راغب
              </p>
            </div>
          </div>

          {/* Toggle between Daily & Monthly Views */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D5C7]">
            <button
              onClick={() => setChartView('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartView === 'daily'
                  ? 'bg-[#542E1D] text-white shadow-xs'
                  : 'text-[#6B5345] hover:bg-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>مبيعات الأيام (Daily)</span>
            </button>
            <button
              onClick={() => setChartView('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartView === 'monthly'
                  ? 'bg-[#542E1D] text-white shadow-xs'
                  : 'text-[#6B5345] hover:bg-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>مبيعات الشهور (Monthly)</span>
            </button>
          </div>
        </div>

        {/* Chart KPI Quick Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE1D7]">
            <span className="text-[11px] text-[#6B5345] block">إجمالي مبيعات النظام</span>
            <span className="text-base font-extrabold font-mono text-[#341B11]">
              {formatCurrency(totalChartSales)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE1D7]">
            <span className="text-[11px] text-[#6B5345] block">إجمالي الأرباح التجارية</span>
            <span className="text-base font-extrabold font-mono text-[#2B7A4B]">
              {formatCurrency(totalChartProfit)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE1D7]">
            <span className="text-[11px] text-[#6B5345] block">أعلى يوم في المبيعات</span>
            <span className="text-sm font-bold font-mono text-[#8C4A26]">
              {peakDaySale ? `${formatCurrency(peakDaySale.sales)} (${peakDaySale.displayDate})` : '—'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE1D7]">
            <span className="text-[11px] text-[#6B5345] block">عدد فواتير البيع</span>
            <span className="text-base font-extrabold font-mono text-[#542E1D]">
              {allSales.length} فاتورة
            </span>
          </div>
        </div>

        {/* Recharts Render Area */}
        <div className="h-64 w-full pt-2">
          {chartView === 'daily' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kandySalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8C4A26" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8C4A26" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="kandyProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2B7A4B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2B7A4B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                <XAxis dataKey="displayDate" stroke="#8C6F5E" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8C6F5E"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1).toLocaleString()} ج`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0),
                    name === 'sales' ? 'المبيعات اليومية' : 'مجمل الربح',
                  ]}
                  labelFormatter={(lbl) => `التاريخ: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#FAF7F2',
                    borderColor: '#D9C6B2',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'Cairo, sans-serif',
                    direction: 'rtl',
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'sales' ? 'المبيعات اليومية (ج.م)' : 'مجمل الربح (ج.م)')}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#8C4A26"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#kandySalesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#2B7A4B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#kandyProfitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                <XAxis dataKey="monthLabel" stroke="#8C6F5E" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8C6F5E"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1).toLocaleString()} ج`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0),
                    name === 'sales' ? 'مبيعات الشهر' : 'أرباح الشهر',
                  ]}
                  labelFormatter={(lbl) => `الشهر: ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#FAF7F2',
                    borderColor: '#D9C6B2',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'Cairo, sans-serif',
                    direction: 'rtl',
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'sales' ? 'إجمالي المبيعات (ج.م)' : 'مجمل الأرباح (ج.م)')}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                />
                <Bar dataKey="sales" fill="#542E1D" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Bar dataKey="profit" fill="#2B7A4B" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-print">
        {reportDefinitions.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReport === rep.id;

          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
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

      {/* Active Report Preview & Table Container */}
      <div className="bg-white rounded-2xl border border-[#E6D9CC] shadow-2xs p-6 space-y-4">
        {/* Printable Official Header (renders on screen & print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE1D7] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-[#341B11]">
                {reportDefinitions.find((r) => r.id === selectedReport)?.label}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#D9C6B2] text-[#6B5345] font-semibold">
                الفترة: {periodLabelText}
              </span>
            </div>
            <p className="text-xs text-[#8C7A6D] mt-0.5">
              بيانات حقيقية معتمدة مستخرجة آلياً · المدير المسؤول: الأستاذ إبراهيم راغب
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handlePrintActiveReport}
              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EAE1D7] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#8C4A26]" />
              <span>طباعة هذا التقرير</span>
            </button>
          </div>
        </div>

        {/* 1. Profit & Loss Report View */}
        {selectedReport === 'profit_loss' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4]">
                <div className="text-[11px] text-[#6B5345]">صافي المبيعات</div>
                <div className="text-base font-bold font-mono text-[#341B11]">
                  {formatCurrency(financialSummary.netSales)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4]">
                <div className="text-[11px] text-[#6B5345]">تكلفة البضاعة المباعة</div>
                <div className="text-base font-bold font-mono text-amber-700">
                  {formatCurrency(financialSummary.cogs)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4]">
                <div className="text-[11px] text-[#6B5345]">المصروفات التشغيلية</div>
                <div className="text-base font-bold font-mono text-rose-600">
                  {formatCurrency(financialSummary.operatingExpenses)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#EDF8F1] border border-[#BDE3CB]">
                <div className="text-[11px] text-[#1E5C36]">صافي الربح النهائي</div>
                <div className="text-base font-extrabold font-mono text-[#1E5C36]">
                  {formatCurrency(financialSummary.netProfit)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">البيان المالي</th>
                    <th className="py-2.5 px-3 text-left">المبلغ (ج.م)</th>
                    <th className="py-2.5 px-3 text-center">النسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6DC]">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-[#341B11]">إجمالي المبيعات</td>
                    <td className="py-2 px-3 font-mono font-bold text-left">{formatCurrency(financialSummary.grossSales)}</td>
                    <td className="py-2 px-3 font-mono text-center">100%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-[#6B5345]">الخصومات والمرتجعات</td>
                    <td className="py-2 px-3 font-mono text-rose-600 text-left">
                      {formatCurrency(financialSummary.discounts + financialSummary.returns)}
                    </td>
                    <td className="py-2 px-3 font-mono text-center">—</td>
                  </tr>
                  <tr className="bg-[#FAF7F2]/50 font-bold">
                    <td className="py-2 px-3 text-[#341B11]">صافي المبيعات (Net Sales)</td>
                    <td className="py-2 px-3 font-mono text-left">{formatCurrency(financialSummary.netSales)}</td>
                    <td className="py-2 px-3 font-mono text-center">100%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-amber-900">تكلفة البضاعة المباعة (COGS)</td>
                    <td className="py-2 px-3 font-mono text-amber-700 text-left">{formatCurrency(financialSummary.cogs)}</td>
                    <td className="py-2 px-3 font-mono text-center">
                      {(100 - financialSummary.grossMarginPercent).toFixed(1)}%
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 font-bold">
                    <td className="py-2 px-3 text-[#2B7A4B]">مجمل الربح (Gross Profit)</td>
                    <td className="py-2 px-3 font-mono text-[#2B7A4B] text-left">{formatCurrency(financialSummary.grossProfit)}</td>
                    <td className="py-2 px-3 font-mono text-[#2B7A4B] text-center">{financialSummary.grossMarginPercent.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-rose-800">المصروفات التشغيلية والرواتب</td>
                    <td className="py-2 px-3 font-mono text-rose-700 text-left">{formatCurrency(financialSummary.operatingExpenses)}</td>
                    <td className="py-2 px-3 font-mono text-center">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-rose-800">خسائر التالف والهالك</td>
                    <td className="py-2 px-3 font-mono text-rose-700 text-left">{formatCurrency(financialSummary.spoilageLoss)}</td>
                    <td className="py-2 px-3 font-mono text-center">—</td>
                  </tr>
                  <tr className="bg-emerald-100/60 font-extrabold text-sm">
                    <td className="py-2.5 px-3 text-[#1B5E20]">صافي الربح النهائي (Net Profit)</td>
                    <td className="py-2.5 px-3 font-mono text-[#1B5E20] text-left">{formatCurrency(financialSummary.netProfit)}</td>
                    <td className="py-2.5 px-3 font-mono text-[#1B5E20] text-center">{financialSummary.netMarginPercent.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Sales Report View */}
        {selectedReport === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">العميل</th>
                  <th className="py-2.5 px-3">طريقة الدفع</th>
                  <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  <th className="py-2.5 px-3 text-left">مجمل الربح</th>
                  <th className="py-2.5 px-3">الكاشير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {sales.length > 0 ? (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">#{s.invoiceNumber}</td>
                      <td className="py-2 px-3 text-[#6B5345] font-mono">{s.date.split('T')[0]}</td>
                      <td className="py-2 px-3">{s.customerName || 'عميل نقدي عام'}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'card' ? 'فيزا/بطاقة' : 'آجل'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-left">{formatCurrency(s.total)}</td>
                      <td className="py-2 px-3 font-mono text-[#2B7A4B] text-left">{formatCurrency(s.grossProfit)}</td>
                      <td className="py-2 px-3 text-[#7A5E4F]">{s.cashierName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      لا توجد فواتير مبيعات مسجلة في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Purchases Report View */}
        {selectedReport === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">المورد</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  <th className="py-2.5 px-3 text-left">المدفوع</th>
                  <th className="py-2.5 px-3 text-left">المتبقي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {purchases.length > 0 ? (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">#{p.invoiceNumber}</td>
                      <td className="py-2 px-3 font-bold text-[#2B170E]">{p.supplierName}</td>
                      <td className="py-2 px-3 text-[#6B5345] font-mono">{p.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-left">{formatCurrency(p.total)}</td>
                      <td className="py-2 px-3 font-mono text-[#2B7A4B] text-left">{formatCurrency(p.paidAmount)}</td>
                      <td className="py-2 px-3 font-mono text-amber-700 text-left">{formatCurrency(p.remainingAmount)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.status === 'paid' ? 'مسددة' : 'آجلة'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      لا توجد فواتير مشتريات مسجلة في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Inventory Report View */}
        {selectedReport === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">الكود</th>
                  <th className="py-2.5 px-3">المنتج</th>
                  <th className="py-2.5 px-3">القسم</th>
                  <th className="py-2.5 px-3">الكمية بالمخزون</th>
                  <th className="py-2.5 px-3 text-left">سعر البيع</th>
                  <th className="py-2.5 px-3 text-left">القيمة بالتكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-mono">{p.code}</td>
                    <td className="py-2 px-3 font-bold text-[#2B170E]">{p.name}</td>
                    <td className="py-2 px-3">{p.categoryName}</td>
                    <td className="py-2 px-3 font-mono font-bold">
                      {p.type === 'weight'
                        ? `${(p.stockQuantity / 1000).toFixed(3)} كجم`
                        : `${p.stockQuantity} ${p.stockUnit}`}
                    </td>
                    <td className="py-2 px-3 font-mono text-left">{formatCurrency(p.salePricePerSaleUnit)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#542E1D] text-left">
                      {formatCurrency(p.stockQuantity * p.costPricePerStockUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Expenses Report View */}
        {selectedReport === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">كود المصروف</th>
                  <th className="py-2.5 px-3">التصنيف</th>
                  <th className="py-2.5 px-3">الوصف والبيان</th>
                  <th className="py-2.5 px-3 text-left">المبلغ</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">المستفيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {expenses.length > 0 ? (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">{e.code}</td>
                      <td className="py-2 px-3 font-medium">{e.categoryLabel}</td>
                      <td className="py-2 px-3 text-[#341B11]">{e.description}</td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-700 text-left">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-2 px-3 text-[#6B5345] font-mono">{e.dueDate}</td>
                      <td className="py-2 px-3 text-[#7A5E4F]">{e.recipient}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      لا توجد مصروفات مسجلة في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Suppliers Accounts Report View */}
        {selectedReport === 'suppliers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">المورد</th>
                  <th className="py-2.5 px-3">الهاتف</th>
                  <th className="py-2.5 px-3 text-left">إجمالي المشتريات</th>
                  <th className="py-2.5 px-3 text-left">المسدد</th>
                  <th className="py-2.5 px-3 text-left">المستحق الحالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-bold text-[#2B170E]">{s.name}</td>
                    <td className="py-2 px-3 font-mono">{s.phone}</td>
                    <td className="py-2 px-3 font-mono text-left">{formatCurrency(s.totalPurchases)}</td>
                    <td className="py-2 px-3 font-mono text-[#2B7A4B] text-left">{formatCurrency(s.totalPaid)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-amber-700 text-left">
                      {formatCurrency(s.balanceDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Customers Debts Report View */}
        {selectedReport === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">العميل</th>
                  <th className="py-2.5 px-3">الهاتف</th>
                  <th className="py-2.5 px-3 text-left">إجمالي المشتريات</th>
                  <th className="py-2.5 px-3 text-left">المسدد</th>
                  <th className="py-2.5 px-3 text-left">الديون المستحقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-bold text-[#2B170E]">{c.name}</td>
                    <td className="py-2 px-3 font-mono">{c.phone}</td>
                    <td className="py-2 px-3 font-mono text-left">{formatCurrency(c.totalPurchases)}</td>
                    <td className="py-2 px-3 font-mono text-[#2B7A4B] text-left">{formatCurrency(c.totalPaid)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-rose-700 text-left">
                      {formatCurrency(c.balanceDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 8. Safe Cash Flow Report View */}
        {selectedReport === 'safe' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">رقم السند</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">التصنيف</th>
                  <th className="py-2.5 px-3 text-left">المبلغ</th>
                  <th className="py-2.5 px-3 text-left">الرصيد بعد الحركة</th>
                  <th className="py-2.5 px-3">البيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {safeTransactions.length > 0 ? (
                  safeTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">{t.transactionNumber}</td>
                      <td className="py-2 px-3 text-[#6B5345] font-mono">{t.date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.type === 'in' ? 'وارد (+)' : 'صادر (-)'}
                        </span>
                      </td>
                      <td className="py-2 px-3">{t.categoryLabel}</td>
                      <td className="py-2 px-3 font-mono font-bold text-left">{formatCurrency(t.amount)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[#2B7A4B] text-left">
                        {formatCurrency(t.balanceAfter)}
                      </td>
                      <td className="py-2 px-3 text-[#7A5E4F]">{t.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      لا توجد حركات نقدية في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 9. Spoilage Report View */}
        {selectedReport === 'spoilage' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">رقم المحضر</th>
                  <th className="py-2.5 px-3">المنتج</th>
                  <th className="py-2.5 px-3">الكمية</th>
                  <th className="py-2.5 px-3 text-left">خسارة التكلفة</th>
                  <th className="py-2.5 px-3">السبب</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {spoilage.length > 0 ? (
                  spoilage.map((sp) => (
                    <tr key={sp.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2 px-3 font-mono font-bold text-[#542E1D]">{sp.spoilageNumber}</td>
                      <td className="py-2 px-3 font-bold text-[#2B170E]">{sp.productName}</td>
                      <td className="py-2 px-3 font-mono">{`${sp.quantity} ${sp.unit}`}</td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-700 text-left">
                        {formatCurrency(sp.totalCostLoss)}
                      </td>
                      <td className="py-2 px-3">{sp.reasonText}</td>
                      <td className="py-2 px-3 text-[#6B5345] font-mono">{sp.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      لا توجد محاضر تالف مسجلة في هذه الفترة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 10. Payroll Report View */}
        {selectedReport === 'payroll' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF7F2] text-[#6B5345] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">اسم الموظف</th>
                  <th className="py-2.5 px-3">المسمى الوظيفي</th>
                  <th className="py-2.5 px-3 text-left">الراتب الأساسي</th>
                  <th className="py-2.5 px-3 text-left">رصيد السلف الحالية</th>
                  <th className="py-2.5 px-3 text-left">صافي الراتب التقديري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6DC]">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-bold text-[#2B170E]">{emp.name}</td>
                    <td className="py-2 px-3">{emp.role}</td>
                    <td className="py-2 px-3 font-mono font-bold text-left">{formatCurrency(emp.baseSalary)}</td>
                    <td className="py-2 px-3 font-mono text-amber-700 text-left">
                      {formatCurrency(emp.currentAdvancesBalance)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-[#2B7A4B] text-left">
                      {formatCurrency(Math.max(0, emp.baseSalary - emp.currentAdvancesBalance))}
                    </td>
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

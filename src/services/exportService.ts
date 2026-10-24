import * as XLSX from 'xlsx';
import { db } from './storage';
import { FinancialSummary, formatCurrency } from './accounting';

export class ExportService {
  /**
   * Export array of JSON records to genuine .xlsx Excel file
   */
  public static exportToExcel(
    data: Record<string, unknown>[],
    filename: string,
    sheetName: string = 'بيانات كاندي'
  ) {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      // Auto-fit column widths
      const colWidths = Object.keys(data[0] || {}).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...data.map((row) => String(row[key] ?? '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel file:', err);
      alert('حدث خطأ أثناء تصدير ملف Excel');
    }
  }

  /**
   * Export complete P&L Statement to genuine Excel (.xlsx)
   */
  public static exportFinancialReport(summary: FinancialSummary) {
    const filename = `تقرير_الأرباح_والخسائر_${summary.periodLabel.replace(/[\s/]/g, '_')}`;
    const rows = [
      { 'البند المالي': 'صافي المبيعات (Net Sales)', 'القيمة (ج.م)': summary.netSales, 'النسبة': '100%' },
      { 'البند المالي': 'تكلفة البضاعة المباعة (COGS)', 'القيمة (ج.م)': summary.cogs, 'النسبة': `${Math.round((summary.cogs / (summary.netSales || 1)) * 100)}%` },
      { 'البند المالي': 'مجمل الربح (Gross Profit)', 'القيمة (ج.م)': summary.grossProfit, 'النسبة': `${summary.grossMarginPercent}%` },
      { 'البند المالي': 'المصروفات التشغيلية (Operating Expenses)', 'القيمة (ج.م)': summary.operatingExpenses, 'النسبة': `${Math.round((summary.operatingExpenses / (summary.netSales || 1)) * 100)}%` },
      { 'البند المالي': 'خسائر التالف والهالك (Spoilage Loss)', 'القيمة (ج.م)': summary.spoilageLoss, 'النسبة': `${Math.round((summary.spoilageLoss / (summary.netSales || 1)) * 100)}%` },
      { 'البند المالي': 'صافي الربح النهائي (Net Profit)', 'القيمة (ج.م)': summary.netProfit, 'النسبة': `${summary.netMarginPercent}%` },
      { 'البند المالي': 'رصيد الخزنة النقدية الحالي', 'القيمة (ج.م)': summary.safeBalance, 'النسبة': '-' },
      { 'البند المالي': 'قيمة المخزون بسعر التكلفة', 'القيمة (ج.م)': summary.inventoryCostValue, 'النسبة': '-' },
      { 'البند المالي': 'إجمالي مستحقات الموردين', 'القيمة (ج.م)': summary.totalSupplierDebt, 'النسبة': '-' },
      { 'البند المالي': 'إجمالي ديون العملاء', 'القيمة (ج.م)': summary.totalCustomerDebt, 'النسبة': '-' },
    ];

    this.exportToExcel(rows, filename, 'قائمة الدخل والأرباح');
  }
}


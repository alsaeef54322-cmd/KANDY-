import { db } from './storage';
import { SaleInvoice, Expense, SpoilageRecord } from '../types';

export type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all' | 'custom';

export interface FinancialSummary {
  periodLabel: string;
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  spoilageLoss: number;
  netProfit: number;
  netMarginPercent: number;
  cashInflows: number;
  cashOutflows: number;
  safeBalance: number;
  inventoryCostValue: number;
  totalSupplierDebt: number;
  totalCustomerDebt: number;
  invoiceCount: number;
  lowStockCount: number;
  salesGrowthPercent: number;
}

export function filterByDate<T extends { date: string }>(
  items: T[],
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string
): T[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const currentMonthStr = todayStr.substring(0, 7); // e.g. "2025-10"

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = lastMonth.toISOString().substring(0, 7);

  return items.filter((item) => {
    const itemDate = item.date.split('T')[0];
    switch (filter) {
      case 'today':
        return itemDate === todayStr;
      case 'yesterday':
        return itemDate === yesterdayStr;
      case 'week':
        return itemDate >= weekAgoStr && itemDate <= todayStr;
      case 'month':
        return itemDate.startsWith(currentMonthStr);
      case 'last_month':
        return itemDate.startsWith(lastMonthStr);
      case 'custom':
        if (customStart && customEnd) {
          return itemDate >= customStart && itemDate <= customEnd;
        }
        return true;
      case 'all':
      default:
        return true;
    }
  });
}

export function computeFinancialSummary(
  filter: DateFilterType = 'month',
  customStart?: string,
  customEnd?: string
): FinancialSummary {
  const allSales = db.getSales();
  const allReturns = db.getSalesReturns();
  const allExpenses = db.getExpenses();
  const allSpoilage = db.getSpoilage();
  const products = db.getProducts();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const cashTransactions = db.getCashTransactions();
  const safeBalance = db.getSafeBalance();

  // Filter by period
  const sales = filterByDate(allSales, filter, customStart, customEnd);
  const returnsList = filterByDate(allReturns, filter, customStart, customEnd);
  const expenses = filterByDate(allExpenses, filter, customStart, customEnd);
  const spoilage = filterByDate(allSpoilage, filter, customStart, customEnd);

  // 1. Sales Calculations
  const grossSales = sales.reduce((acc, s) => acc + s.subtotal, 0);
  const discounts = sales.reduce((acc, s) => acc + s.discount, 0);
  const returns = returnsList.reduce((acc, r) => acc + r.totalRefund, 0);
  const netSales = Math.max(0, grossSales - discounts - returns);

  // 2. Cost of Goods Sold (COGS)
  const baseCogs = sales.reduce((acc, s) => acc + (s.cogsTotal || 0), 0);
  const returnedCogs = returnsList.reduce((acc, r) => acc + (r.costRestoredTotal || 0), 0);
  const cogs = Math.max(0, baseCogs - returnedCogs);

  // 3. Gross Profit
  const grossProfit = netSales - cogs;
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // 4. Operating Expenses (All expenses recognized in the period)
  const operatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // 5. Spoilage Loss (Direct recognized loss)
  const spoilageLoss = spoilage.reduce((acc, sp) => acc + sp.totalCostLoss, 0);

  // 6. Net Profit
  const netProfit = grossProfit - operatingExpenses - spoilageLoss;
  const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  // 7. Cash flows in period
  const txInPeriod = filterByDate(cashTransactions, filter, customStart, customEnd);
  const cashInflows = txInPeriod.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
  const cashOutflows = txInPeriod.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);

  // 8. Static Balances (current state)
  const inventoryCostValue = products.reduce((acc, p) => acc + p.stockQuantity * p.costPricePerStockUnit, 0);
  const totalSupplierDebt = suppliers.reduce((acc, s) => acc + s.balanceDue, 0);
  const totalCustomerDebt = customers.reduce((acc, c) => acc + c.balanceDue, 0);
  const lowStockCount = products.filter((p) => p.isActive && p.stockQuantity <= p.minStockAlert).length;

  const periodLabels: Record<DateFilterType, string> = {
    today: 'اليوم',
    yesterday: 'أمس',
    week: 'آخر 7 أيام',
    month: 'هذا الشهر',
    last_month: 'الشهر السابق',
    all: 'كامل المدة',
    custom: `من ${customStart || ''} إلى ${customEnd || ''}`,
  };

  return {
    periodLabel: periodLabels[filter],
    grossSales: Math.round(grossSales * 100) / 100,
    discounts: Math.round(discounts * 100) / 100,
    returns: Math.round(returns * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
    operatingExpenses: Math.round(operatingExpenses * 100) / 100,
    spoilageLoss: Math.round(spoilageLoss * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netMarginPercent: Math.round(netMarginPercent * 10) / 10,
    cashInflows: Math.round(cashInflows * 100) / 100,
    cashOutflows: Math.round(cashOutflows * 100) / 100,
    safeBalance: Math.round(safeBalance * 100) / 100,
    inventoryCostValue: Math.round(inventoryCostValue * 100) / 100,
    totalSupplierDebt: Math.round(totalSupplierDebt * 100) / 100,
    totalCustomerDebt: Math.round(totalCustomerDebt * 100) / 100,
    invoiceCount: sales.length,
    lowStockCount,
    salesGrowthPercent: 12.5,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ج.م';
}

export function formatQuantity(quantity: number, unit: string, type: 'weight' | 'piece' | 'package'): string {
  if (type === 'weight') {
    // If base quantity is in grams, or already in kg:
    const inKg = quantity >= 1000 ? quantity / 1000 : quantity;
    if (quantity >= 1000) {
      return `${(quantity / 1000).toFixed(3)} كجم`;
    }
    return `${quantity} جرام`;
  }
  return `${quantity} ${unit}`;
}

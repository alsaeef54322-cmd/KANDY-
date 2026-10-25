import { db } from './storage';
import {
  SaleInvoice,
  Expense,
  SpoilageRecord,
  ProductAnalyticsItem,
  SystemAlert,
} from '../types';

export type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all' | 'custom';

export interface FinancialSummary {
  periodLabel: string;
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number; // الإيرادات الصافية (Net Revenue)
  cogs: number; // تكلفة البضاعة المباعة
  grossProfit: number; // مجمل الربح (Net Sales - COGS)
  grossMarginPercent: number;
  operatingExpenses: number; // المصروفات التشغيلية
  spoilageLoss: number; // خسائر التالف والهالك
  netProfit: number; // صافي الربح الحقيقي (Gross Profit - Operating Expenses - Spoilage)
  netMarginPercent: number;
  cashInflows: number; // إجمالي وارد الخزنة
  cashOutflows: number; // إجمالي صادر الخزنة
  cashCollections: number; // النقدية المحصلة فعلياً من المبيعات والعملاء
  safeBalance: number; // رصيد الخزنة الفعلي
  inventoryCostValue: number; // قيمة المخزون الحالي بالتكلفة
  totalSupplierDebt: number; // مستحقات الموردين
  totalCustomerDebt: number; // ديون العملاء
  invoiceCount: number;
  lowStockCount: number;
  missingCostCount: number; // المنتجات بدون تكلفة موثوقة
  salesGrowthPercent: number; // نمو المبيعات مقارنة بالفترة السابقة
  previousPeriodSales: number;
  todaySales: number;
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

export function getPreviousPeriodDateRange(
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string
): { start: string; end: string } | null {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (filter === 'today') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const yStr = y.toISOString().split('T')[0];
    return { start: yStr, end: yStr };
  }
  if (filter === 'yesterday') {
    const dayBefore = new Date(now);
    dayBefore.setDate(now.getDate() - 2);
    const dStr = dayBefore.toISOString().split('T')[0];
    return { start: dStr, end: dStr };
  }
  if (filter === 'week') {
    const end = new Date(now);
    end.setDate(now.getDate() - 7);
    const start = new Date(now);
    start.setDate(now.getDate() - 14);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }
  if (filter === 'month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = lastMonth.toISOString().substring(0, 7);
    return { start: `${lastMonthStr}-01`, end: `${lastMonthStr}-31` };
  }
  return null;
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

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySalesList = allSales.filter((s) => s.date === todayStr);
  const todaySales = todaySalesList.reduce((acc, s) => acc + s.total, 0);

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

  // 6. Net Profit (Strict rule: Net Sales - COGS - Expenses - Spoilage)
  const netProfit = grossProfit - operatingExpenses - spoilageLoss;
  const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  // 7. Cash flows in period
  const txInPeriod = filterByDate(cashTransactions, filter, customStart, customEnd);
  const cashInflows = txInPeriod.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
  const cashOutflows = txInPeriod.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);

  // Cash collections specifically from sales & customers
  const cashCollections = txInPeriod
    .filter((t) => t.type === 'in' && (t.category === 'sale_cash' || t.category === 'customer_debt_collection'))
    .reduce((acc, t) => acc + t.amount, 0);

  // 8. Static Balances (current state)
  const inventoryCostValue = products.filter((p) => p.isActive !== false).reduce((acc, p) => acc + p.stockQuantity * p.costPricePerStockUnit, 0);
  const totalSupplierDebt = suppliers.reduce((acc, s) => acc + s.balanceDue, 0);
  const totalCustomerDebt = customers.reduce((acc, c) => acc + c.balanceDue, 0);
  const lowStockCount = products.filter((p) => p.isActive && p.stockQuantity <= p.minStockAlert).length;
  const missingCostCount = products.filter((p) => p.isActive && p.costPricePerStockUnit <= 0).length;

  // 9. Comparison with previous period
  const prevRange = getPreviousPeriodDateRange(filter, customStart, customEnd);
  let previousPeriodSales = 0;
  let salesGrowthPercent = 0;

  if (prevRange) {
    const prevSales = allSales.filter((s) => s.date >= prevRange.start && s.date <= prevRange.end);
    previousPeriodSales = prevSales.reduce((acc, s) => acc + s.total, 0);
    if (previousPeriodSales > 0) {
      salesGrowthPercent = ((netSales - previousPeriodSales) / previousPeriodSales) * 100;
    } else if (netSales > 0) {
      salesGrowthPercent = 100;
    }
  }

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
    cashCollections: Math.round(cashCollections * 100) / 100,
    safeBalance: Math.round(safeBalance * 100) / 100,
    inventoryCostValue: Math.round(inventoryCostValue * 100) / 100,
    totalSupplierDebt: Math.round(totalSupplierDebt * 100) / 100,
    totalCustomerDebt: Math.round(totalCustomerDebt * 100) / 100,
    invoiceCount: sales.length,
    lowStockCount,
    missingCostCount,
    salesGrowthPercent: Math.round(salesGrowthPercent * 10) / 10,
    previousPeriodSales: Math.round(previousPeriodSales * 100) / 100,
    todaySales: Math.round(todaySales * 100) / 100,
  };
}

/**
 * Computes deep product performance metrics across the chosen period.
 * Only displays profit margins if the product unit cost is verified (> 0).
 */
export function computeProductAnalytics(
  filter: DateFilterType = 'month',
  customStart?: string,
  customEnd?: string
): ProductAnalyticsItem[] {
  const allSales = db.getSales();
  const sales = filterByDate(allSales, filter, customStart, customEnd);
  const products = db.getProducts();

  // Aggregate sales by productId
  const aggregated: Record<
    string,
    {
      quantitySold: number;
      stockQuantitySold: number;
      revenue: number;
      cogs: number;
      salesCount: number;
    }
  > = {};

  for (const sale of sales) {
    for (const item of sale.items) {
      if (!aggregated[item.productId]) {
        aggregated[item.productId] = {
          quantitySold: 0,
          stockQuantitySold: 0,
          revenue: 0,
          cogs: 0,
          salesCount: 0,
        };
      }
      aggregated[item.productId].quantitySold += item.quantity;
      aggregated[item.productId].stockQuantitySold += item.stockQuantityDeducted;
      aggregated[item.productId].revenue += item.total;
      aggregated[item.productId].cogs += item.costPrice || 0;
      aggregated[item.productId].salesCount += 1;
    }
  }

  // Find max sales for percentile velocity ranking
  const maxSold = Math.max(0, ...Object.values(aggregated).map((a) => a.quantitySold));

  const items: ProductAnalyticsItem[] = products.map((prod) => {
    const stat = aggregated[prod.id] || {
      quantitySold: 0,
      stockQuantitySold: 0,
      revenue: 0,
      cogs: 0,
      salesCount: 0,
    };

    const hasReliableCost = prod.costPricePerStockUnit > 0;
    const grossProfit = hasReliableCost ? stat.revenue - stat.cogs : null;
    const profitMarginPercent =
      hasReliableCost && stat.revenue > 0 && grossProfit !== null
        ? Math.round((grossProfit / stat.revenue) * 1000) / 10
        : null;

    const isLowStock = prod.isActive && prod.stockQuantity <= prod.minStockAlert;

    // Velocity rank determination
    let velocityRank: ProductAnalyticsItem['velocityRank'] = 'dormant';
    if (stat.quantitySold > 0) {
      if (maxSold > 0 && stat.quantitySold >= maxSold * 0.4) {
        velocityRank = 'bestseller';
      } else {
        velocityRank = 'steady';
      }
    } else if (prod.stockQuantity > 0) {
      velocityRank = 'slow';
    } else {
      velocityRank = 'dormant';
    }

    const currentStockDisplay =
      prod.type === 'weight'
        ? `${(prod.stockQuantity / 1000).toFixed(2)} كجم`
        : `${prod.stockQuantity} ${prod.stockUnit}`;

    return {
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      categoryName: prod.categoryName,
      type: prod.type,
      saleUnit: prod.saleUnit,
      stockUnit: prod.stockUnit,
      totalQuantitySold: Math.round(stat.quantitySold * 100) / 100,
      totalRevenue: Math.round(stat.revenue * 100) / 100,
      totalCogs: Math.round(stat.cogs * 100) / 100,
      hasReliableCost,
      grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
      profitMarginPercent,
      currentStock: prod.stockQuantity,
      currentStockDisplay,
      isLowStock,
      velocityRank,
      salesCount: stat.salesCount,
    };
  });

  return items;
}

/**
 * Returns genuine system alerts based on live data and thresholds.
 * Excludes alerts dismissed by the user.
 */
export function getRealSystemAlerts(): SystemAlert[] {
  const products = db.getProducts();
  const closings = db.getDailyClosings();
  const customers = db.getCustomers();
  const sales = db.getSales();
  const dismissedIds = new Set(db.getDismissedAlertIds());
  const alerts: SystemAlert[] = [];

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 1. Critical Low Stock Alerts
  const lowStockProds = products.filter((p) => p.isActive && p.stockQuantity <= p.minStockAlert);
  if (lowStockProds.length > 0) {
    const alertId = `alert-low-stock-${lowStockProds.length}`;
    if (!dismissedIds.has(alertId)) {
      const outOfStock = lowStockProds.filter((p) => p.stockQuantity <= 0);
      alerts.push({
        id: alertId,
        type: 'stock_low',
        severity: outOfStock.length > 0 ? 'danger' : 'warning',
        title: `${lowStockProds.length} أصناف وصلت للحد الأدنى للمخزون`,
        message:
          outOfStock.length > 0
            ? `يوجد ${outOfStock.length} أصناف نفدت بالكامل و${lowStockProds.length - outOfStock.length} أصناف أوشكت على النفاد.`
            : `تنبيه مبكر: أصناف قاربت على النفاد، يُرجى فحص أوامر الشراء.`,
        linkTab: 'inventory',
        actionText: 'مراجعة المخزون',
        createdAt: todayStr,
      });
    }
  }

  // 2. Daily Closing Difference Alert (Last closing)
  if (closings.length > 0) {
    const lastClosing = closings[0];
    if (Math.abs(lastClosing.difference) >= 0.01) {
      const alertId = `alert-closing-diff-${lastClosing.id}`;
      if (!dismissedIds.has(alertId)) {
        const isDeficit = lastClosing.difference < 0;
        alerts.push({
          id: alertId,
          type: 'cash_difference',
          severity: isDeficit ? 'danger' : 'warning',
          title: `فارق ${isDeficit ? 'عجز' : 'زيادة'} في إقفال اليومية (${lastClosing.date})`,
          message: `أظهر إقفال الخزنة الأخير فارقاً قدره ${Math.abs(lastClosing.difference)} ج.م بين النقدية الفعلية والرصيد المحاسبي المتوقع.`,
          linkTab: 'closing',
          actionText: 'فحص مراجعة الخزنة وإقفال اليومية',
          createdAt: lastClosing.date,
        });
      }
    }
  }

  // 3. Unclosed Previous Day Alert
  const yesterdayClosing = closings.find((c) => c.date === yesterdayStr);
  const hadYesterdaySales = sales.some((s) => s.date === yesterdayStr);
  if (!yesterdayClosing && hadYesterdaySales) {
    const alertId = `alert-unclosed-${yesterdayStr}`;
    if (!dismissedIds.has(alertId)) {
      alerts.push({
        id: alertId,
        type: 'unclosed_day',
        severity: 'warning',
        title: 'يومية الأمس لم يتم إقفالها حتى الآن',
        message: `تم تسجيل مبيعات وحركات خزنة بتاريخ ${yesterdayStr} دون إتمام محضر جرد وإقفال اليومية.`,
        linkTab: 'closing',
        actionText: 'إجراء إقفال اليومية ومطابقة الخزنة',
        createdAt: todayStr,
      });
    }
  }

  // 4. Products Missing Reliable Cost Price
  const missingCostProds = products.filter((p) => p.isActive && p.costPricePerStockUnit <= 0);
  if (missingCostProds.length > 0) {
    const alertId = `alert-missing-cost-${missingCostProds.length}`;
    if (!dismissedIds.has(alertId)) {
      alerts.push({
        id: alertId,
        type: 'missing_cost',
        severity: 'info',
        title: `${missingCostProds.length} أصناف بدون سعر تكلفة شراء معتمد`,
        message: 'لا يمكن حساب مجمل الربح وهامش الربحية بدقة لهذه المنتجات حتى يتم إدخال سعر التكلفة من فواتير الشراء.',
        linkTab: 'products',
        actionText: 'تحديث أسعار التكلفة',
        createdAt: todayStr,
      });
    }
  }

  // 5. High Customer Unpaid Balances
  const highDebtCustomers = customers.filter((c) => c.balanceDue >= 4000);
  if (highDebtCustomers.length > 0) {
    const alertId = `alert-high-debt-${highDebtCustomers.length}`;
    if (!dismissedIds.has(alertId)) {
      alerts.push({
        id: alertId,
        type: 'unpaid_invoice',
        severity: 'warning',
        title: `${highDebtCustomers.length} عملاء تخطت مديونياتهم السقف المستهدف`,
        message: `إجمالي مديونيات مرتفعة تستحق المتابعة والتحصيل الفوري للحفاظ على السيولة النقدية.`,
        linkTab: 'customers',
        actionText: 'كشوف حساب العملاء',
        createdAt: todayStr,
      });
    }
  }

  return alerts;
}

export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ج.م'
  );
}

export function formatQuantity(
  quantity: number,
  unit: string,
  type: 'weight' | 'piece' | 'package'
): string {
  if (type === 'weight') {
    if (quantity >= 1000) {
      return `${(quantity / 1000).toFixed(3)} كجم`;
    }
    return `${quantity} جرام`;
  }
  return `${quantity} ${unit}`;
}

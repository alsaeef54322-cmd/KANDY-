import {
  Category,
  Product,
  Supplier,
  Customer,
  SaleInvoice,
  SalesReturn,
  PurchaseInvoice,
  InventoryMovement,
  SpoilageRecord,
  StocktakeRecord,
  Expense,
  Employee,
  PayrollRecord,
  EmployeeAdvance,
  CashTransaction,
  StoreSettings,
  AuditLog,
  UserSession,
  ManagerAuth,
  DailyClosing,
} from '../types';

import {
  initialCategories,
  initialProducts,
  initialSuppliers,
  initialCustomers,
  initialSales,
  initialPurchases,
  initialExpenses,
  initialEmployees,
  initialPayroll,
  initialAdvances,
  initialInventoryMovements,
  initialCashTransactions,
  initialSettings,
  initialAuditLogs,
} from '../data/seedData';

const initialDailyClosings: DailyClosing[] = [
  {
    id: 'cls-seed-1',
    closingNumber: 'CLS-20251023-001',
    date: '2025-10-23',
    closedAt: '2025-10-23T23:30:00.000Z',
    closedBy: 'الأستاذ إبراهيم راغب',
    openingBalance: 25000,
    cashSales: 7850,
    cashInflows: 1200,
    cashExpenses: 450,
    cashOutflows: 0,
    cashReturns: 0,
    expectedCash: 33600,
    actualCash: 33600,
    difference: 0,
    status: 'balanced',
    notes: 'إقفال يومي نموذجي - النقدية الفعلية مطابقة تماماً للرصيد المحاسبي للخزنة',
    denominations: {
      d200: 120,
      d100: 80,
      d50: 24,
      d20: 15,
      d10: 10,
      d5: 0,
      coins: 0,
    },
  },
];

const DB_PREFIX = 'kandy_roastery_db_v1_';

function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(DB_PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {

  try {
    const enc = new TextEncoder();
    const data = enc.encode(salt + password + 'kandy_manager_secret_pepper_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash if subtle crypto fails in unusual envs
    let hash = 0;
    const str = salt + password;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

function generateRandomSalt(): string {
  try {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

class StorageService {

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
      this.resetToDefaults();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in storage listener callback:', e);
      }
    });
  }

  public resetToDefaults(preserveManagerAuth = true) {
    const currentAuth = preserveManagerAuth ? this.getManagerAuth() : null;
    setItem('categories', initialCategories);
    setItem('products', initialProducts);
    setItem('suppliers', initialSuppliers);
    setItem('customers', initialCustomers);
    setItem('sales', initialSales);
    setItem('sales_returns', []);
    setItem('purchases', initialPurchases);
    setItem('expenses', initialExpenses);
    setItem('employees', initialEmployees);
    setItem('payroll', initialPayroll);
    setItem('advances', initialAdvances);
    setItem('inventory_movements', initialInventoryMovements);
    setItem('cash_transactions', initialCashTransactions);
    setItem('spoilage', []);
    setItem('stocktakes', []);
    setItem('daily_closings', initialDailyClosings);
    setItem('settings', initialSettings);
    setItem('audit_logs', initialAuditLogs);
    if (currentAuth) {
      setItem('manager_auth', currentAuth);
    }
    setItem('initialized', true);
    this.notify();
  }

  // --- Manager Account Authentication (Single Super-Admin: Mr. Ibrahim Ragheb) ---
  public getManagerAuth(): ManagerAuth | null {
    return getItem<ManagerAuth | null>('manager_auth', null);
  }

  public isManagerConfigured(): boolean {
    const auth = this.getManagerAuth();
    return !!(auth && auth.isConfigured && auth.passwordHash);
  }

  public async setupManagerAccount(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (this.isManagerConfigured()) {
      return { success: false, error: 'تم إعداد حساب المدير العام مسبقاً، والمعالج مقفل نهائياً لأسباب أمنية.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'يرجى إدخال بريد إلكتروني صحيح للأستاذ إبراهيم راغب.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'كلمة المرور يجب أن تتكون من 4 خانات على الأقل.' };
    }

    const salt = generateRandomSalt();
    const passwordHash = await hashPasswordWithSalt(password, salt);

    const managerAuth: ManagerAuth = {
      isConfigured: true,
      email: cleanEmail,
      name: 'الأستاذ إبراهيم راغب',
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setItem('manager_auth', managerAuth);

    const session: UserSession = {
      id: 'usr-ibrahim',
      username: cleanEmail,
      name: 'الأستاذ إبراهيم راغب',
      role: 'super_admin',
      roleLabel: 'المدير العام (صلاحيات كاملة)',
      isLoggedIn: true,
      lastLogin: new Date().toISOString(),
    };
    this.setSession(session);
    this.addAuditLog('CREATE', 'ManagerAuth', 'تمت تهيئة حساب المدير العام الأستاذ إبراهيم راغب بنجاح وقفل معالج الإعداد');
    this.notify();
    return { success: true };
  }

  public async updateManagerPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const auth = this.getManagerAuth();
    if (!auth || !auth.isConfigured) {
      return { success: false, error: 'لم يتم العثور على حساب المدير العام.' };
    }
    if (!currentPassword) {
      return { success: false, error: 'يرجى إدخال كلمة المرور الحالية للتأكيد.' };
    }
    const computedCurrentHash = await hashPasswordWithSalt(currentPassword, auth.salt);
    if (computedCurrentHash !== auth.passwordHash) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.' };
    }

    const newSalt = generateRandomSalt();
    const newHash = await hashPasswordWithSalt(newPassword, newSalt);

    auth.passwordHash = newHash;
    auth.salt = newSalt;
    setItem('manager_auth', auth);
    this.addAuditLog('UPDATE', 'ManagerAuth', 'تم تحديث كلمة مرور المدير العام الأستاذ إبراهيم راغب بنجاح');
    this.notify();
    return { success: true };
  }

  public async loginManager(emailOrUsername: string, password: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    const auth = this.getManagerAuth();
    if (!auth || !auth.isConfigured) {
      return { success: false, error: 'لم يتم إعداد حساب المدير العام بعد. يرجى تهيئة الحساب أولاً.' };
    }

    const inputClean = emailOrUsername.trim().toLowerCase();
    const storedEmail = auth.email.toLowerCase();

    const isEmailOrAliasMatch =
      inputClean === storedEmail ||
      inputClean === 'ibrahim' ||
      inputClean === 'admin' ||
      emailOrUsername.trim() === auth.name;

    if (!isEmailOrAliasMatch) {
      return { success: false, error: 'البريد الإلكتروني أو اسم المستخدم غير مسجل كمدير عام للنظام.' };
    }

    const computedHash = await hashPasswordWithSalt(password, auth.salt);
    if (computedHash !== auth.passwordHash) {
      return { success: false, error: 'كلمة المرور غير صحيحة. يرجى إعادة المحاولة.' };
    }

    auth.lastLogin = new Date().toISOString();
    setItem('manager_auth', auth);

    const session: UserSession = {
      id: 'usr-ibrahim',
      username: auth.email,
      name: auth.name || 'الأستاذ إبراهيم راغب',
      role: 'super_admin',
      roleLabel: 'المدير العام (صلاحيات كاملة)',
      isLoggedIn: true,
      lastLogin: new Date().toISOString(),
    };
    this.setSession(session);
    this.addAuditLog('LOGIN', 'ManagerAuth', 'تسجيل دخول ناجح للمدير العام الأستاذ إبراهيم راغب');
    this.notify();
    return { success: true, session };
  }

  // --- Session Management ---
  public getSession(): UserSession {
    const auth = this.getManagerAuth();
    const defaultSession: UserSession = {
      id: 'usr-ibrahim',
      username: auth?.email || 'ibrahim',
      name: auth?.name || 'الأستاذ إبراهيم راغب',
      role: 'super_admin',
      roleLabel: 'المدير العام (صلاحيات كاملة)',
      isLoggedIn: false, // Default is logged out; login is strictly required
      lastLogin: new Date().toISOString(),
    };
    return getItem('session', defaultSession);
  }

  public setSession(session: UserSession) {
    setItem('session', session);
    this.notify();
  }

  public logout(): void {
    const session = this.getSession();
    const loggedOut: UserSession = {
      ...session,
      isLoggedIn: false,
    };
    setItem('session', loggedOut);
    this.addAuditLog('LOGOUT', 'UserSession', 'تسجيل خروج آمن للمدير العام الأستاذ إبراهيم راغب');
    this.notify();
  }


  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return getItem('audit_logs', initialAuditLogs);
  }

  public addAuditLog(
    actionType: AuditLog['actionType'],
    entity: string,
    description: string,
    entityId?: string,
    details?: Record<string, unknown>
  ) {
    const logs = this.getAuditLogs();
    const session = this.getSession();
    const newLog: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      userName: session.name || 'الأستاذ إبراهيم راغب',
      actionType,
      entity,
      entityId,
      description,
      details,
    };
    logs.unshift(newLog);
    setItem('audit_logs', logs.slice(0, 500)); // retain last 500 logs
    this.notify();
  }

  // --- Settings ---
  public getSettings(): StoreSettings {
    return getItem('settings', initialSettings);
  }

  public updateSettings(settings: StoreSettings) {
    setItem('settings', settings);
    this.addAuditLog('UPDATE', 'Settings', 'تحديث إعدادات وبيانات المحمصة والطباعة');
    this.notify();
  }

  // --- Categories ---
  public getCategories(): Category[] {
    return getItem('categories', initialCategories);
  }

  public saveCategory(category: Category) {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
      this.addAuditLog('UPDATE', 'Category', `تعديل قسم: ${category.name}`, category.id);
    } else {
      categories.push(category);
      this.addAuditLog('CREATE', 'Category', `إضافة قسم جديد: ${category.name}`, category.id);
    }
    setItem('categories', categories);
    this.notify();
  }

  public deleteCategory(id: string) {
    const categories = this.getCategories().filter((c) => c.id !== id);
    setItem('categories', categories);
    this.addAuditLog('DELETE', 'Category', `حذف قسم #${id}`, id);
    this.notify();
  }

  // --- Products ---
  public getProducts(): Product[] {
    return getItem('products', initialProducts);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public saveProduct(product: Product) {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      const oldProd = products[index];
      products[index] = { ...product, updatedAt: new Date().toISOString() };
      this.addAuditLog(
        'UPDATE',
        'Product',
        `تعديل بيانات المنتج ${product.name} (السعر: ${product.salePricePerSaleUnit} ج.م، التكلفة: ${
          product.type === 'weight'
            ? product.costPricePerStockUnit * 1000
            : product.costPricePerStockUnit
        } ج.م)`,
        product.id,
        { oldPrice: oldProd.salePricePerSaleUnit, newPrice: product.salePricePerSaleUnit }
      );
    } else {
      products.push({
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.addAuditLog('CREATE', 'Product', `إضافة منتج جديد: ${product.name}`, product.id);
    }
    setItem('products', products);
    this.notify();
  }

  public deleteProduct(id: string) {
    const products = this.getProducts();
    const target = products.find((p) => p.id === id);
    if (target) {
      // Soft disable if has history or deactivate
      target.isActive = false;
      setItem('products', products);
      this.addAuditLog('UPDATE', 'Product', `تعطيل المنتج: ${target.name}`, id);
      this.notify();
    }
  }

  // --- Inventory Movements ---
  public getInventoryMovements(): InventoryMovement[] {
    return getItem('inventory_movements', initialInventoryMovements);
  }

  private addInventoryMovement(mov: Omit<InventoryMovement, 'id' | 'createdAt'>) {
    const movements = this.getInventoryMovements();
    const newMovement: InventoryMovement = {
      ...mov,
      id: 'mov-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
    };
    movements.unshift(newMovement);
    setItem('inventory_movements', movements);
  }

  // --- Safe & Cash Transactions ---
  public getCashTransactions(): CashTransaction[] {
    return getItem('cash_transactions', initialCashTransactions);
  }

  public getSafeBalance(): number {
    const transactions = this.getCashTransactions();
    if (transactions.length === 0) {
      return this.getSettings().cashSafeOpeningBalance;
    }
    // Latest transaction has balanceAfter
    return transactions[0].balanceAfter;
  }

  public recordCashTransaction(params: {
    type: 'in' | 'out';
    category: CashTransaction['category'];
    categoryLabel: string;
    amount: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): CashTransaction {
    const transactions = this.getCashTransactions();
    const currentBalance = this.getSafeBalance();
    const newBalance =
      params.type === 'in' ? currentBalance + params.amount : currentBalance - params.amount;

    const newTx: CashTransaction = {
      id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      transactionNumber: 'TX-' + (transactions.length + 1001),
      date: new Date().toISOString().split('T')[0],
      type: params.type,
      category: params.category,
      categoryLabel: params.categoryLabel,
      amount: params.amount,
      balanceAfter: newBalance,
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      performedBy: this.getSession().name || 'الأستاذ إبراهيم راغب',
      createdAt: new Date().toISOString(),
    };

    transactions.unshift(newTx);
    setItem('cash_transactions', transactions);
    this.addAuditLog('ADJUST', 'Safe', `${params.categoryLabel}: ${params.amount} ج.م (${params.description})`, newTx.id);
    this.notify();
    return newTx;
  }

  // --- Sales & POS ---
  public getSales(): SaleInvoice[] {
    return getItem('sales', initialSales);
  }

  public recordSale(saleData: Omit<SaleInvoice, 'id' | 'createdAt' | 'cogsTotal' | 'grossProfit'>): SaleInvoice {
    const products = this.getProducts();
    const customers = this.getCustomers();
    let totalCogs = 0;

    // 1. Validate and compute cost, deduct stock
    for (const item of saleData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const itemCost = item.stockQuantityDeducted * prod.costPricePerStockUnit;
      totalCogs += itemCost;
      item.costPrice = itemCost;

      const previousStock = prod.stockQuantity;
      prod.stockQuantity = Math.max(0, prod.stockQuantity - item.stockQuantityDeducted);

      // Create inventory movement
      const displayDelta = prod.type === 'weight' ? -(item.stockQuantityDeducted / 1000) : -item.quantity;
      this.addInventoryMovement({
        productId: prod.id,
        productName: prod.name,
        categoryName: prod.categoryName,
        type: 'sale',
        quantityDelta: displayDelta,
        stockQuantityDelta: -item.stockQuantityDeducted,
        unit: prod.saleUnit,
        previousStock,
        newStock: prod.stockQuantity,
        costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
        referenceId: saleData.invoiceNumber,
        referenceSource: `فاتورة بيع #${saleData.invoiceNumber}`,
        userName: this.getSession().name,
        date: saleData.date,
      });
    }

    // Save updated products
    setItem('products', products);

    // 2. Compute gross profit
    const grossProfit = saleData.total - totalCogs;

    const newSale: SaleInvoice = {
      ...saleData,
      id: 'sale-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      cogsTotal: Math.round(totalCogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      createdAt: new Date().toISOString(),
    };

    const sales = this.getSales();
    sales.unshift(newSale);
    setItem('sales', sales);

    // 3. Handle Cash inflow to Safe
    if (newSale.paidAmount > 0 && (newSale.paymentMethod === 'cash' || newSale.paidAmount > 0)) {
      this.recordCashTransaction({
        type: 'in',
        category: 'sale_cash',
        categoryLabel: 'مبيعات نقدية كاشير',
        amount: newSale.paidAmount,
        description: `تحصيل فاتورة بيع رقم #${newSale.invoiceNumber}`,
        referenceType: 'SaleInvoice',
        referenceId: newSale.invoiceNumber,
      });
    }

    // 4. Handle Customer Debt if any
    if (newSale.remainingAmount > 0 && newSale.customerId) {
      const custIndex = customers.findIndex((c) => c.id === newSale.customerId);
      if (custIndex >= 0) {
        customers[custIndex].balanceDue += newSale.remainingAmount;
        customers[custIndex].totalPurchases += newSale.total;
        customers[custIndex].totalPaid += newSale.paidAmount;
        setItem('customers', customers);
      }
    }

    this.addAuditLog(
      'CREATE',
      'Sale',
      `إصدار فاتورة بيع #${newSale.invoiceNumber} بإجمالي ${newSale.total} ج.م ومجمل ربح ${newSale.grossProfit} ج.م`,
      newSale.id
    );

    this.notify();
    return newSale;
  }

  // --- Sales Returns ---
  public getSalesReturns(): SalesReturn[] {
    return getItem('sales_returns', []);
  }

  public recordSalesReturn(returnData: Omit<SalesReturn, 'id' | 'createdAt'>): SalesReturn {
    const products = this.getProducts();
    const sales = this.getSales();
    const customers = this.getCustomers();

    for (const item of returnData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const previousStock = prod.stockQuantity;
      prod.stockQuantity += item.stockQuantityReturned;

      const displayDelta = prod.type === 'weight' ? item.stockQuantityReturned / 1000 : item.quantityReturned;
      this.addInventoryMovement({
        productId: prod.id,
        productName: prod.name,
        categoryName: prod.categoryName,
        type: 'sale_return',
        quantityDelta: displayDelta,
        stockQuantityDelta: item.stockQuantityReturned,
        unit: prod.saleUnit,
        previousStock,
        newStock: prod.stockQuantity,
        costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
        referenceId: returnData.returnNumber,
        referenceSource: `مرتجع مبيعات #${returnData.returnNumber}`,
        userName: this.getSession().name,
        date: returnData.date,
      });
    }
    setItem('products', products);

    // Update target sale status if full/partial return
    const sale = sales.find((s) => s.id === returnData.saleInvoiceId);
    if (sale) {
      sale.status = 'returned';
      setItem('sales', sales);
    }

    // Cash safe refund
    if (returnData.totalRefund > 0) {
      this.recordCashTransaction({
        type: 'out',
        category: 'adjustment',
        categoryLabel: 'مرتجع مبيعات نقداً',
        amount: returnData.totalRefund,
        description: `رد قيمة مرتجع مبيعات #${returnData.returnNumber} لفاتورة #${returnData.saleInvoiceNumber}`,
        referenceType: 'SalesReturn',
        referenceId: returnData.returnNumber,
      });
    }

    const returns = this.getSalesReturns();
    const newReturn: SalesReturn = {
      ...returnData,
      id: 'ret-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    returns.unshift(newReturn);
    setItem('sales_returns', returns);

    this.addAuditLog(
      'ADJUST',
      'SalesReturn',
      `تسجيل مرتجع مبيعات #${returnData.returnNumber} بقيمة ${returnData.totalRefund} ج.م`,
      newReturn.id
    );

    this.notify();
    return newReturn;
  }

  // --- Purchases & Suppliers ---
  public getPurchases(): PurchaseInvoice[] {
    return getItem('purchases', initialPurchases);
  }

  public getSuppliers(): Supplier[] {
    return getItem('suppliers', initialSuppliers);
  }

  public saveSupplier(supplier: Supplier) {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) {
      suppliers[index] = supplier;
      this.addAuditLog('UPDATE', 'Supplier', `تعديل بيانات المورد: ${supplier.name}`, supplier.id);
    } else {
      suppliers.push(supplier);
      this.addAuditLog('CREATE', 'Supplier', `إضافة مورد جديد: ${supplier.name}`, supplier.id);
    }
    setItem('suppliers', suppliers);
    this.notify();
  }

  public recordPurchase(purchaseData: Omit<PurchaseInvoice, 'id' | 'createdAt'>): PurchaseInvoice {
    const products = this.getProducts();
    const suppliers = this.getSuppliers();

    // 1. Update Products Stock and recalculate Moving Weighted Average Cost
    for (const item of purchaseData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;

      const previousStock = prod.stockQuantity;
      const oldCostPerStockUnit = prod.costPricePerStockUnit;
      const addedStock = item.stockQuantityAdded;
      const addedCostTotal = item.total;
      const addedCostPerStockUnit = addedCostTotal / (addedStock > 0 ? addedStock : 1);

      // Moving Weighted Average Cost:
      // (Old Stock * Old Cost + New Stock * New Cost) / (Old Stock + New Stock)
      const totalNewStock = previousStock + addedStock;
      let newWeightedCostPerStockUnit = oldCostPerStockUnit;
      if (totalNewStock > 0) {
        newWeightedCostPerStockUnit =
          (previousStock * oldCostPerStockUnit + addedStock * addedCostPerStockUnit) / totalNewStock;
      }

      prod.stockQuantity = totalNewStock;
      prod.costPricePerStockUnit = Math.round(newWeightedCostPerStockUnit * 10000) / 10000;
      prod.updatedAt = new Date().toISOString();

      const displayDelta = prod.type === 'weight' ? item.stockQuantityAdded / 1000 : item.purchaseQuantity;
      this.addInventoryMovement({
        productId: prod.id,
        productName: prod.name,
        categoryName: prod.categoryName,
        type: 'purchase',
        quantityDelta: displayDelta,
        stockQuantityDelta: item.stockQuantityAdded,
        unit: prod.saleUnit,
        previousStock,
        newStock: totalNewStock,
        costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
        referenceId: purchaseData.invoiceNumber,
        referenceSource: `فاتورة مشتريات #${purchaseData.invoiceNumber}`,
        userName: this.getSession().name,
        date: purchaseData.date,
      });
    }

    setItem('products', products);

    // 2. Record Purchase Invoice
    const purchases = this.getPurchases();
    const newPurchase: PurchaseInvoice = {
      ...purchaseData,
      id: 'pur-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
    };
    purchases.unshift(newPurchase);
    setItem('purchases', purchases);

    // 3. Update Supplier Balances
    const supIndex = suppliers.findIndex((s) => s.id === purchaseData.supplierId);
    if (supIndex >= 0) {
      suppliers[supIndex].totalPurchases += purchaseData.total;
      suppliers[supIndex].totalPaid += purchaseData.paidAmount;
      suppliers[supIndex].balanceDue += purchaseData.remainingAmount;
      setItem('suppliers', suppliers);
    }

    // 4. Record Cash Safe Outflow if paidAmount > 0 and paid in cash
    if (purchaseData.paidAmount > 0 && purchaseData.paymentMethod === 'cash') {
      this.recordCashTransaction({
        type: 'out',
        category: 'supplier_payment',
        categoryLabel: 'دفعة مورد نقداً',
        amount: purchaseData.paidAmount,
        description: `سداد دفعة نقدية لفاتورة مشتريات #${purchaseData.invoiceNumber} للمورد ${purchaseData.supplierName}`,
        referenceType: 'PurchaseInvoice',
        referenceId: purchaseData.invoiceNumber,
      });
    }

    this.addAuditLog(
      'CREATE',
      'Purchase',
      `تسجيل فاتورة مشتريات #${newPurchase.invoiceNumber} من المورد ${newPurchase.supplierName} بإجمالي ${newPurchase.total} ج.م`,
      newPurchase.id
    );

    this.notify();
    return newPurchase;
  }

  public recordSupplierPayment(supplierId: string, amount: number, paymentMethod: 'cash' | 'transfer' | 'card', notes: string) {
    const suppliers = this.getSuppliers();
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) return;

    sup.totalPaid += amount;
    sup.balanceDue = Math.max(0, sup.balanceDue - amount);
    setItem('suppliers', suppliers);

    if (paymentMethod === 'cash') {
      this.recordCashTransaction({
        type: 'out',
        category: 'supplier_payment',
        categoryLabel: 'سداد حساب مورد',
        amount,
        description: `سداد دفعة حساب للمورد ${sup.name}: ${notes || 'دفعة حساب'}`,
        referenceType: 'Supplier',
        referenceId: sup.id,
      });
    }

    this.addAuditLog('ADJUST', 'Supplier', `سداد دفعة ${amount} ج.م للمورد ${sup.name}`, sup.id);
    this.notify();
  }

  // --- Customers & Debt Collections ---
  public getCustomers(): Customer[] {
    return getItem('customers', initialCustomers);
  }

  public saveCustomer(customer: Customer) {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
      this.addAuditLog('UPDATE', 'Customer', `تعديل بيانات العميل: ${customer.name}`, customer.id);
    } else {
      customers.push(customer);
      this.addAuditLog('CREATE', 'Customer', `إضافة عميل جديد: ${customer.name}`, customer.id);
    }
    setItem('customers', customers);
    this.notify();
  }

  public recordCustomerPayment(customerId: string, amount: number, paymentMethod: 'cash' | 'transfer' | 'card', notes: string) {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    cust.totalPaid += amount;
    cust.balanceDue = Math.max(0, cust.balanceDue - amount);
    setItem('customers', customers);

    if (paymentMethod === 'cash') {
      this.recordCashTransaction({
        type: 'in',
        category: 'customer_debt_collection',
        categoryLabel: 'تحصيل ديون عملاء',
        amount,
        description: `تحصيل دفعة حساب من العميل ${cust.name}: ${notes || 'سداد ديون'}`,
        referenceType: 'Customer',
        referenceId: cust.id,
      });
    }

    this.addAuditLog('ADJUST', 'Customer', `تحصيل دفعة ${amount} ج.م من العميل ${cust.name}`, cust.id);
    this.notify();
  }

  // --- Expenses ---
  public getExpenses(): Expense[] {
    return getItem('expenses', initialExpenses);
  }

  public recordExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const expenses = this.getExpenses();
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    setItem('expenses', expenses);

    // If paid and method is cash, deduct from cash safe
    if (newExpense.status === 'paid' && newExpense.paymentMethod === 'cash') {
      this.recordCashTransaction({
        type: 'out',
        category: 'expense',
        categoryLabel: 'مصروفات تشغيلية',
        amount: newExpense.amount,
        description: `${newExpense.categoryLabel} - ${newExpense.description}`,
        referenceType: 'Expense',
        referenceId: newExpense.id,
      });
    }

    this.addAuditLog(
      'CREATE',
      'Expense',
      `تسجيل مصروف: ${newExpense.categoryLabel} بقيمة ${newExpense.amount} ج.م (${newExpense.status === 'paid' ? 'مدفوع' : 'مستحق'})`,
      newExpense.id
    );

    this.notify();
    return newExpense;
  }

  public payExpense(id: string, paymentMethod: 'cash' | 'transfer' | 'card') {
    const expenses = this.getExpenses();
    const exp = expenses.find((e) => e.id === id);
    if (!exp || exp.status === 'paid') return;

    exp.status = 'paid';
    exp.paymentDate = new Date().toISOString().split('T')[0];
    exp.paymentMethod = paymentMethod;
    setItem('expenses', expenses);

    if (paymentMethod === 'cash') {
      this.recordCashTransaction({
        type: 'out',
        category: 'expense',
        categoryLabel: 'سداد مصروف مستحق',
        amount: exp.amount,
        description: `سداد المصروف المستحق: ${exp.categoryLabel} (${exp.description})`,
        referenceType: 'Expense',
        referenceId: exp.id,
      });
    }

    this.addAuditLog('UPDATE', 'Expense', `سداد المصروف المستحق #${exp.code} بقيمة ${exp.amount} ج.م`, exp.id);
    this.notify();
  }

  // --- Employees, Payroll & Advances ---
  public getEmployees(): Employee[] {
    return getItem('employees', initialEmployees);
  }

  public saveEmployee(employee: Employee) {
    const employees = this.getEmployees();
    const index = employees.findIndex((e) => e.id === employee.id);
    if (index >= 0) {
      employees[index] = employee;
      this.addAuditLog('UPDATE', 'Employee', `تعديل بيانات الموظف: ${employee.name}`, employee.id);
    } else {
      employees.push(employee);
      this.addAuditLog('CREATE', 'Employee', `إضافة موظف جديد: ${employee.name}`, employee.id);
    }
    setItem('employees', employees);
    this.notify();
  }

  public getAdvances(): EmployeeAdvance[] {
    return getItem('advances', initialAdvances);
  }

  public recordAdvance(advanceData: Omit<EmployeeAdvance, 'id' | 'createdAt'>): EmployeeAdvance {
    const advances = this.getAdvances();
    const employees = this.getEmployees();

    const emp = employees.find((e) => e.id === advanceData.employeeId);
    if (emp) {
      emp.currentAdvancesBalance += advanceData.amount;
      setItem('employees', employees);
    }

    const newAdvance: EmployeeAdvance = {
      ...advanceData,
      id: 'adv-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    advances.unshift(newAdvance);
    setItem('advances', advances);

    if (newAdvance.paidFromSafe) {
      this.recordCashTransaction({
        type: 'out',
        category: 'advance',
        categoryLabel: 'سلفة موظف نقداً',
        amount: newAdvance.amount,
        description: `صرف سلفة نقدية للموظف ${newAdvance.employeeName}`,
        referenceType: 'EmployeeAdvance',
        referenceId: newAdvance.id,
      });
    }

    this.addAuditLog('CREATE', 'EmployeeAdvance', `صرف سلفة للموظف ${newAdvance.employeeName} بقيمة ${newAdvance.amount} ج.م`, newAdvance.id);
    this.notify();
    return newAdvance;
  }

  public getPayroll(): PayrollRecord[] {
    return getItem('payroll', initialPayroll);
  }

  public recordPayroll(recordData: Omit<PayrollRecord, 'id' | 'createdAt'>): PayrollRecord {
    const payroll = this.getPayroll();
    const employees = this.getEmployees();

    // Deduct advance balance from employee if advanceDeduction > 0
    if (recordData.advanceDeduction > 0) {
      const emp = employees.find((e) => e.id === recordData.employeeId);
      if (emp) {
        emp.currentAdvancesBalance = Math.max(0, emp.currentAdvancesBalance - recordData.advanceDeduction);
        setItem('employees', employees);
      }
    }

    const newRecord: PayrollRecord = {
      ...recordData,
      id: 'pay-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    payroll.unshift(newRecord);
    setItem('payroll', payroll);

    if (newRecord.status === 'paid' && newRecord.paymentMethod === 'cash') {
      this.recordCashTransaction({
        type: 'out',
        category: 'payroll',
        categoryLabel: 'راتب موظف نقداً',
        amount: newRecord.netSalary,
        description: `صرف صافي راتب شهر ${newRecord.month} للموظف ${newRecord.employeeName}`,
        referenceType: 'PayrollRecord',
        referenceId: newRecord.id,
      });
    }

    this.addAuditLog(
      'CREATE',
      'Payroll',
      `تسجيل مسير راتب شهر ${newRecord.month} للموظف ${newRecord.employeeName} بصافي ${newRecord.netSalary} ج.م`,
      newRecord.id
    );

    this.notify();
    return newRecord;
  }

  // --- Spoilage / Damaged Stock ---
  public getSpoilage(): SpoilageRecord[] {
    return getItem('spoilage', []);
  }

  public recordSpoilage(spoilageData: Omit<SpoilageRecord, 'id' | 'createdAt' | 'totalCostLoss'>): SpoilageRecord {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === spoilageData.productId);
    if (!prod) throw new Error('Product not found');

    const totalCostLoss = Math.round(spoilageData.stockQuantity * prod.costPricePerStockUnit * 100) / 100;
    const previousStock = prod.stockQuantity;
    prod.stockQuantity = Math.max(0, prod.stockQuantity - spoilageData.stockQuantity);
    prod.updatedAt = new Date().toISOString();
    setItem('products', products);

    // Add inventory movement
    const displayDelta = prod.type === 'weight' ? -(spoilageData.stockQuantity / 1000) : -spoilageData.quantity;
    this.addInventoryMovement({
      productId: prod.id,
      productName: prod.name,
      categoryName: prod.categoryName,
      type: 'spoilage',
      quantityDelta: displayDelta,
      stockQuantityDelta: -spoilageData.stockQuantity,
      unit: prod.saleUnit,
      previousStock,
      newStock: prod.stockQuantity,
      costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
      referenceId: spoilageData.spoilageNumber,
      referenceSource: `تالف وهالك #${spoilageData.spoilageNumber}`,
      userName: this.getSession().name,
      date: spoilageData.date,
      notes: spoilageData.notes,
    });

    const spoilageList = this.getSpoilage();
    const newRecord: SpoilageRecord = {
      ...spoilageData,
      id: 'spo-' + Date.now(),
      totalCostLoss,
      createdAt: new Date().toISOString(),
    };
    spoilageList.unshift(newRecord);
    setItem('spoilage', spoilageList);

    this.addAuditLog(
      'ADJUST',
      'Spoilage',
      `تسجيل تالف لمنتج ${prod.name} بكمية ${spoilageData.quantity} ${spoilageData.unit} بخسارة تكلفة ${totalCostLoss} ج.م`,
      newRecord.id
    );

    this.notify();
    return newRecord;
  }

  // --- Stocktake & Reconciliation ---
  public getStocktakes(): StocktakeRecord[] {
    return getItem('stocktakes', []);
  }

  public recordStocktake(stocktakeData: Omit<StocktakeRecord, 'id' | 'createdAt'>): StocktakeRecord {
    const products = this.getProducts();

    if (stocktakeData.status === 'approved') {
      // Apply adjustments to stock
      for (const item of stocktakeData.items) {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) continue;

        const previousStock = prod.stockQuantity;
        const targetStockInBase = prod.type === 'weight' ? item.actualQuantity * 1000 : item.actualQuantity;
        const deltaStock = targetStockInBase - previousStock;

        if (deltaStock !== 0) {
          prod.stockQuantity = targetStockInBase;
          this.addInventoryMovement({
            productId: prod.id,
            productName: prod.name,
            categoryName: prod.categoryName,
            type: 'adjustment',
            quantityDelta: item.difference,
            stockQuantityDelta: deltaStock,
            unit: prod.saleUnit,
            previousStock,
            newStock: targetStockInBase,
            costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
            referenceId: stocktakeData.code,
            referenceSource: `تسوية جرد #${stocktakeData.code}`,
            userName: this.getSession().name,
            date: stocktakeData.date,
          });
        }
      }
      setItem('products', products);
    }

    const stocktakes = this.getStocktakes();
    const newRecord: StocktakeRecord = {
      ...stocktakeData,
      id: 'stk-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    stocktakes.unshift(newRecord);
    setItem('stocktakes', stocktakes);

    this.addAuditLog(
      'ADJUST',
      'Stocktake',
      `تسجيل محضر جرد #${newRecord.code} بفارق مالي إجمالي ${newRecord.totalVarianceCost} ج.م (الحالة: ${newRecord.status === 'approved' ? 'معتمد' : 'مسودة'})`,
      newRecord.id
    );

    this.notify();
    return newRecord;
  }

  // --- Daily Closings & Cash Drawer Audit ---
  public getDailyClosings(): DailyClosing[] {
    return getItem('daily_closings', initialDailyClosings);
  }

  public getDailyClosingByDate(date: string): DailyClosing | undefined {
    return this.getDailyClosings().find((c) => c.date === date);
  }

  public calculateDayExpectedCash(targetDate?: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const date = targetDate || todayStr;
    const allTx = this.getCashTransactions();
    const settings = this.getSettings();

    // Transactions of the target day
    const dayTx = allTx.filter((t) => t.date === date);

    // Opening balance: balance of the last transaction prior to this day
    const priorTx = allTx.filter((t) => t.date < date);
    const openingBalance = priorTx.length > 0 ? priorTx[0].balanceAfter : settings.cashSafeOpeningBalance;

    let cashSales = 0;
    let cashInflows = 0;
    let cashExpenses = 0;
    let cashOutflows = 0;
    let cashReturns = 0;

    for (const tx of dayTx) {
      if (tx.type === 'in') {
        if (tx.category === 'sale_cash') {
          cashSales += tx.amount;
        } else {
          cashInflows += tx.amount;
        }
      } else {
        if (tx.category === 'expense') {
          cashExpenses += tx.amount;
        } else if (tx.category === 'adjustment' && (tx.description.includes('مرتجع') || tx.categoryLabel.includes('مرتجع'))) {
          cashReturns += tx.amount;
        } else {
          cashOutflows += tx.amount;
        }
      }
    }

    const totalDayIn = cashSales + cashInflows;
    const totalDayOut = cashExpenses + cashOutflows + cashReturns;
    const expectedCash = openingBalance + totalDayIn - totalDayOut;

    return {
      date,
      openingBalance: Math.round(openingBalance * 100) / 100,
      cashSales: Math.round(cashSales * 100) / 100,
      cashInflows: Math.round(cashInflows * 100) / 100,
      cashExpenses: Math.round(cashExpenses * 100) / 100,
      cashOutflows: Math.round(cashOutflows * 100) / 100,
      cashReturns: Math.round(cashReturns * 100) / 100,
      expectedCash: Math.round(expectedCash * 100) / 100,
      transactionsCount: dayTx.length,
      currentSafeBalance: this.getSafeBalance(),
    };
  }

  public saveDailyClosing(
    closingData: Omit<DailyClosing, 'id' | 'closingNumber' | 'closedAt'> & { autoCreateAdjustment?: boolean }
  ): DailyClosing {
    const closings = this.getDailyClosings();
    const existingIndex = closings.findIndex((c) => c.date === closingData.date);

    const dateClean = closingData.date.replace(/-/g, '');
    const closingNumber = `CLS-${dateClean}-${String(closings.length + 1).padStart(3, '0')}`;
    const diff = Math.round((closingData.actualCash - closingData.expectedCash) * 100) / 100;
    const status: DailyClosing['status'] = Math.abs(diff) < 0.01 ? 'balanced' : diff > 0 ? 'surplus' : 'deficit';

    const newClosing: DailyClosing = {
      ...closingData,
      id: 'cls-' + Date.now(),
      closingNumber,
      closedAt: new Date().toISOString(),
      difference: diff,
      status,
    };

    if (existingIndex >= 0) {
      closings[existingIndex] = newClosing;
    } else {
      closings.unshift(newClosing);
    }
    setItem('daily_closings', closings);

    // Optional safe adjustment only if explicitly requested by manager
    if (closingData.autoCreateAdjustment && Math.abs(diff) >= 0.01) {
      this.recordCashTransaction({
        type: diff > 0 ? 'in' : 'out',
        category: 'adjustment',
        categoryLabel: diff > 0 ? 'تسوية زيادة إقفال يومي' : 'تسوية عجز إقفال يومي',
        amount: Math.abs(diff),
        description: `تسوية فارق إقفال اليومية رقم ${closingNumber} (${diff > 0 ? 'زيادة' : 'عجز'}: ${Math.abs(diff)} ج.م)`,
        referenceType: 'DailyClosing',
        referenceId: closingNumber,
      });
    }

    this.addAuditLog(
      'CREATE',
      'DailyClosing',
      `اعتماد إقفال اليومية رقم ${closingNumber} لتاريخ ${closingData.date}: الفعلي ${closingData.actualCash} ج.م (المتوقع ${closingData.expectedCash} ج.م - الفارق: ${diff} ج.م - الحالة: ${status === 'balanced' ? 'مطابق' : status === 'surplus' ? 'زيادة' : 'عجز'})`,
      newClosing.id,
      { expected: closingData.expectedCash, actual: closingData.actualCash, difference: diff }
    );

    this.notify();
    return newClosing;
  }

  public reopenDailyClosing(closingId: string, reason: string): boolean {
    const closings = this.getDailyClosings();
    const target = closings.find((c) => c.id === closingId);
    if (!target) return false;

    const session = this.getSession();
    target.statusReopened = true;
    target.reopenedAt = new Date().toISOString();
    target.reopenedBy = session.name || 'الأستاذ إبراهيم راغب';
    target.reopenReason = reason;

    setItem('daily_closings', closings);
    this.addAuditLog(
      'UPDATE',
      'DailyClosing',
      `إعادة فتح إقفال اليومية رقم ${target.closingNumber} بواسطة ${target.reopenedBy} لسبب: ${reason}`,
      target.id
    );
    this.notify();
    return true;
  }

  // --- Dismissed Alerts Persistence ---
  public getDismissedAlertIds(): string[] {
    return getItem('dismissed_alert_ids', []);
  }

  public dismissAlert(alertId: string) {
    const list = this.getDismissedAlertIds();
    if (!list.includes(alertId)) {
      list.push(alertId);
      setItem('dismissed_alert_ids', list);
      this.notify();
    }
  }

  public resetDismissedAlerts() {
    setItem('dismissed_alert_ids', []);
    this.notify();
  }

  // --- Backup & Restore Engine ---
  public exportFullBackup(): string {
    const backupData = {
      app: 'KANDY_ROASTERY_MANAGEMENT_SYSTEM',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      manager: 'الأستاذ إبراهيم راغب',
      data: {
        categories: this.getCategories(),
        products: this.getProducts(),
        suppliers: this.getSuppliers(),
        customers: this.getCustomers(),
        sales: this.getSales(),
        sales_returns: this.getSalesReturns(),
        purchases: this.getPurchases(),
        expenses: this.getExpenses(),
        employees: this.getEmployees(),
        payroll: this.getPayroll(),
        advances: this.getAdvances(),
        inventory_movements: this.getInventoryMovements(),
        cash_transactions: this.getCashTransactions(),
        spoilage: this.getSpoilage(),
        stocktakes: this.getStocktakes(),
        daily_closings: this.getDailyClosings(),
        settings: this.getSettings(),
        audit_logs: this.getAuditLogs(),
      },
    };
    this.addAuditLog('BACKUP_EXPORT', 'Backup', 'تصدير نسخة احتياطية كاملة لقاعدة بيانات كاندي');
    return JSON.stringify(backupData, null, 2);
  }

  public restoreFullBackup(jsonContent: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.data || parsed.app !== 'KANDY_ROASTERY_MANAGEMENT_SYSTEM') {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو غير متوافق مع نظام كاندي' };
      }

      const d = parsed.data;
      if (d.categories) setItem('categories', d.categories);
      if (d.products) setItem('products', d.products);
      if (d.suppliers) setItem('suppliers', d.suppliers);
      if (d.customers) setItem('customers', d.customers);
      if (d.sales) setItem('sales', d.sales);
      if (d.sales_returns) setItem('sales_returns', d.sales_returns);
      if (d.purchases) setItem('purchases', d.purchases);
      if (d.expenses) setItem('expenses', d.expenses);
      if (d.employees) setItem('employees', d.employees);
      if (d.payroll) setItem('payroll', d.payroll);
      if (d.advances) setItem('advances', d.advances);
      if (d.inventory_movements) setItem('inventory_movements', d.inventory_movements);
      if (d.cash_transactions) setItem('cash_transactions', d.cash_transactions);
      if (d.spoilage) setItem('spoilage', d.spoilage);
      if (d.stocktakes) setItem('stocktakes', d.stocktakes);
      if (d.daily_closings) setItem('daily_closings', d.daily_closings);
      if (d.settings) setItem('settings', d.settings);
      if (d.audit_logs) setItem('audit_logs', d.audit_logs);

      this.addAuditLog('BACKUP_RESTORE', 'Backup', `استعادة نسخة احتياطية مؤرخة ${parsed.timestamp}`);
      this.notify();
      return { success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح وتحديث كافة البيانات' };
    } catch (e) {
      return { success: false, message: 'فشل في قراءة ملف النسخة الاحتياطية: ' + (e as Error).message };
    }
  }
}

export const db = new StorageService();

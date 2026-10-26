import fs from 'fs';
import path from 'path';
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
} from '../types';

export interface ServerDatabaseSchema {
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: SaleInvoice[];
  returns: SalesReturn[];
  purchases: PurchaseInvoice[];
  inventoryMovements: InventoryMovement[];
  spoilage: SpoilageRecord[];
  stocktake: StocktakeRecord[];
  expenses: Expense[];
  employees: Employee[];
  payroll: PayrollRecord[];
  advances: EmployeeAdvance[];
  cashTransactions: CashTransaction[];
  settings: StoreSettings;
  auditLogs: AuditLog[];
  lastUpdated: string;
}

const DATA_DIR = process.env.KANDY_DATA_DIR
  ? path.resolve(process.env.KANDY_DATA_DIR)
  : path.resolve(process.cwd(), 'data');

const DB_FILE = path.join(DATA_DIR, 'kandy_server_db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'kandy_server_db.json.bak');

export class ServerDatabase {
  private data: ServerDatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private getDefaultState(): ServerDatabaseSchema {
    return {
      categories: initialCategories,
      products: initialProducts,
      suppliers: initialSuppliers,
      customers: initialCustomers,
      sales: initialSales,
      returns: [],
      purchases: initialPurchases,
      inventoryMovements: initialInventoryMovements,
      spoilage: [],
      stocktake: [],
      expenses: initialExpenses,
      employees: initialEmployees,
      payroll: initialPayroll,
      advances: initialAdvances,
      cashTransactions: initialCashTransactions,
      settings: initialSettings,
      auditLogs: initialAuditLogs,
      lastUpdated: new Date().toISOString(),
    };
  }

  private loadDatabase(): ServerDatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          const defaultState = this.getDefaultState();
          return {
            ...defaultState,
            ...parsed,
          };
        } catch (readErr) {
          console.error('[Server DB] Primary DB file read/parse error. Attempting backup recovery:', readErr);
          // Try loading from backup file
          if (fs.existsSync(BACKUP_FILE)) {
            try {
              const backupRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
              const backupParsed = JSON.parse(backupRaw);
              console.log('[Server DB] Successfully recovered database from backup file.');
              return {
                ...this.getDefaultState(),
                ...backupParsed,
              };
            } catch (backupErr) {
              console.error('[Server DB] Backup file also corrupted:', backupErr);
            }
          }
          // Do NOT overwrite corrupted file with seed data! Preserve it for investigation
          try {
            const corruptCopy = path.join(DATA_DIR, `kandy_db_corrupt_${Date.now()}.json`);
            fs.copyFileSync(DB_FILE, corruptCopy);
            console.warn(`[Server DB] Saved corrupted database snapshot to: ${corruptCopy}`);
          } catch {}
        }
      }
    } catch (err) {
      console.error('[Server DB] Filesystem error initializing data dir:', err);
    }

    // Only if DB_FILE did not exist initially (first run), initialize with default state
    const defaultState = this.getDefaultState();
    if (!fs.existsSync(DB_FILE)) {
      this.persist(defaultState);
    }
    return defaultState;
  }

  private persist(state: ServerDatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(state, null, 2);
      const tempFile = path.join(DATA_DIR, `kandy_db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.tmp`);

      // Update rolling backup if primary DB file exists
      if (fs.existsSync(DB_FILE)) {
        try {
          fs.copyFileSync(DB_FILE, BACKUP_FILE);
        } catch {}
      }

      try {
        fs.writeFileSync(tempFile, serialized, 'utf-8');
        fs.renameSync(tempFile, DB_FILE);
      } catch {
        // Fallback in case atomic rename fails across filesystem boundaries
        fs.writeFileSync(DB_FILE, serialized, 'utf-8');
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch {}
      }
    } catch (err) {
      console.error('[Server DB] Failed to persist database:', err);
    }
  }

  public getData(): ServerDatabaseSchema {
    return { ...this.data };
  }

  public updateData(partial: Partial<ServerDatabaseSchema>): ServerDatabaseSchema {
    if (Array.isArray(partial.products)) {
      const existingMap = new Map<string, Product>();
      (this.data.products || []).forEach((p) => existingMap.set(p.id, p));

      for (const incoming of partial.products) {
        if (!incoming || !incoming.id) continue;
        const existing = existingMap.get(incoming.id);
        if (!existing) {
          existingMap.set(incoming.id, incoming);
        } else {
          const incomingTime = (incoming.updatedAt && !isNaN(new Date(incoming.updatedAt).getTime()))
            ? new Date(incoming.updatedAt).getTime()
            : ((incoming.createdAt && !isNaN(new Date(incoming.createdAt).getTime())) ? new Date(incoming.createdAt).getTime() : 0);
          const existingTime = (existing.updatedAt && !isNaN(new Date(existing.updatedAt).getTime()))
            ? new Date(existing.updatedAt).getTime()
            : ((existing.createdAt && !isNaN(new Date(existing.createdAt).getTime())) ? new Date(existing.createdAt).getTime() : 0);

          if (incomingTime > existingTime) {
            // Incoming is strictly newer: accept incoming edits
            existingMap.set(incoming.id, incoming);
          } else if (existingTime > incomingTime) {
            // Existing is strictly newer: preserve existing edits (reject stale incoming)
            console.log(`[Server DB] Stale product update rejected for "${incoming.name}" (ID: ${incoming.id})`);
          } else {
            // Equal timestamps: preserve inactive state if either is inactive (never resurrect deleted products)
            const isInactive = existing.isActive === false || incoming.isActive === false;
            const reconciled: Product = {
              ...incoming,
              ...existing,
              isActive: !isInactive,
              updatedAt: existing.updatedAt || incoming.updatedAt || new Date().toISOString(),
            };
            existingMap.set(incoming.id, reconciled);
          }
        }
      }
      partial.products = Array.from(existingMap.values());
    }

    this.data = {
      ...this.data,
      ...partial,
      lastUpdated: new Date().toISOString(),
    };
    this.persist(this.data);
    return this.data;
  }

  public saveProduct(product: Product, performedBy = 'الأستاذ إبراهيم راغب'): {
    success: boolean;
    product?: Product;
    error?: string;
    lastUpdated?: string;
  } {
    if (!product || !product.id || !product.name?.trim() || !product.code?.trim()) {
      return { success: false, error: 'بيانات المنتج غير صالحة، الاسم والكود مطلوبان' };
    }

    const cleanProduct: Product = {
      ...product,
      name: product.name.trim(),
      code: product.code.trim(),
      salePricePerSaleUnit: Number(product.salePricePerSaleUnit) || 0,
      costPricePerStockUnit: Number(product.costPricePerStockUnit) || 0,
      stockQuantity: Number(product.stockQuantity) || 0,
      minStockAlert: Number(product.minStockAlert) || 0,
      isActive: product.isActive !== false,
      updatedAt: new Date().toISOString(),
      createdAt: product.createdAt || new Date().toISOString(),
    };

    const products = [...(this.data.products || [])];
    const index = products.findIndex((p) => p.id === cleanProduct.id);

    if (index >= 0) {
      const oldProd = products[index];
      products[index] = cleanProduct;
      this.data.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: performedBy,
        actionType: 'UPDATE',
        entity: 'Product',
        entityId: cleanProduct.id,
        description: `تعديل بيانات المنتج ${cleanProduct.name} (السعر: ${cleanProduct.salePricePerSaleUnit} ج.م)`,
        details: { oldPrice: oldProd.salePricePerSaleUnit, newPrice: cleanProduct.salePricePerSaleUnit },
      });
    } else {
      products.push(cleanProduct);
      this.data.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: performedBy,
        actionType: 'CREATE',
        entity: 'Product',
        entityId: cleanProduct.id,
        description: `إضافة صنف جديد: ${cleanProduct.name} (كود: ${cleanProduct.code})`,
      });
    }

    this.data.products = products;
    this.data.lastUpdated = new Date().toISOString();
    this.persist(this.data);

    return {
      success: true,
      product: cleanProduct,
      lastUpdated: this.data.lastUpdated,
    };
  }

  public deleteProduct(id: string, performedBy = 'الأستاذ إبراهيم راغب'): {
    success: boolean;
    product?: Product;
    error?: string;
    lastUpdated?: string;
  } {
    const products = [...(this.data.products || [])];
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, error: 'المنتج المطلوب حذفه غير موجود على الخادم' };
    }

    const target = { ...products[index] };
    target.isActive = false;
    target.updatedAt = new Date().toISOString();
    products[index] = target;

    this.data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: performedBy,
      actionType: 'DELETE',
      entity: 'Product',
      entityId: id,
      description: `تعطيل/حذف المنتج: ${target.name} من قائمة الأصناف النشطة`,
    });

    this.data.products = products;
    this.data.lastUpdated = new Date().toISOString();
    this.persist(this.data);

    return {
      success: true,
      product: target,
      lastUpdated: this.data.lastUpdated,
    };
  }

  public getSafeBalance(): number {
    const transactions = this.data.cashTransactions || [];
    if (transactions.length === 0) {
      return this.data.settings?.cashSafeOpeningBalance ?? 25000;
    }
    return transactions[0].balanceAfter;
  }

  public addSale(sale: SaleInvoice): {
    success: boolean;
    sale?: SaleInvoice;
    products?: Product[];
    safeBalance?: number;
    alreadyProcessed?: boolean;
    error?: string;
  } {
    // 1. Check idempotency / duplicates
    const exists = this.data.sales.find((s) => s.id === sale.id || s.invoiceNumber === sale.invoiceNumber);
    if (exists) {
      return {
        success: true,
        sale: exists,
        products: this.data.products,
        safeBalance: this.getSafeBalance(),
        alreadyProcessed: true,
      };
    }

    // 2. Validate and deduct product inventory
    const updatedProducts = [...this.data.products];
    const newMovements: InventoryMovement[] = [];

    for (const item of sale.items) {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      if (prodIndex >= 0) {
        const prod = { ...updatedProducts[prodIndex] };
        const quantityToDeduct = item.stockQuantityDeducted ?? (item.productType === 'weight' ? item.quantity * 1000 : item.quantity);
        const previousStock = prod.stockQuantity;
        prod.stockQuantity = Math.max(0, prod.stockQuantity - quantityToDeduct);
        prod.updatedAt = new Date().toISOString();
        updatedProducts[prodIndex] = prod;

        const displayDelta = prod.type === 'weight' ? -(quantityToDeduct / 1000) : -item.quantity;
        newMovements.push({
          id: `mov-${Date.now()}-${item.productId}`,
          date: sale.date,
          productId: item.productId,
          productName: item.productName,
          categoryName: prod.categoryName || '',
          type: 'sale',
          quantityDelta: displayDelta,
          stockQuantityDelta: -quantityToDeduct,
          unit: item.unitName || prod.saleUnit,
          previousStock,
          newStock: prod.stockQuantity,
          costPerUnit: prod.costPricePerStockUnit * (prod.type === 'weight' ? 1000 : 1),
          referenceId: sale.id,
          referenceSource: `فاتورة بيع #${sale.invoiceNumber}`,
          userName: sale.cashierName || 'كاشير كاندي',
          notes: `بيع بفاتورة رقم #${sale.invoiceNumber}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Update customer balance if debt
    const updatedCustomers = [...this.data.customers];
    if (sale.customerId && sale.remainingAmount > 0) {
      const custIndex = updatedCustomers.findIndex((c) => c.id === sale.customerId);
      if (custIndex >= 0) {
        const cust = { ...updatedCustomers[custIndex] };
        cust.balanceDue = Math.round(((cust.balanceDue || 0) + sale.remainingAmount) * 100) / 100;
        cust.totalPurchases = Math.round(((cust.totalPurchases || 0) + sale.total) * 100) / 100;
        cust.totalPaid = Math.round(((cust.totalPaid || 0) + sale.paidAmount) * 100) / 100;
        updatedCustomers[custIndex] = cust;
      }
    }

    // 4. Update cash transactions in safe if paid in cash
    const updatedCash = [...this.data.cashTransactions];
    if (sale.paidAmount > 0 && sale.paymentMethod === 'cash') {
      const currentSafeBalance = this.getSafeBalance();
      const newBalance = Math.round((currentSafeBalance + sale.paidAmount) * 100) / 100;
      updatedCash.unshift({
        id: `csh-${Date.now()}`,
        transactionNumber: `TX-${Date.now()}`,
        date: sale.date,
        type: 'in',
        category: 'sale_cash',
        categoryLabel: 'مبيعات نقدية',
        amount: sale.paidAmount,
        balanceAfter: newBalance,
        referenceType: 'sale',
        referenceId: sale.id,
        description: `متحصلات بيع فاتورة نقدي #${sale.invoiceNumber}`,
        performedBy: sale.cashierName || 'كاشير كاندي',
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Audit log
    const updatedAudit: AuditLog[] = [
      {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: sale.cashierName || 'كاشير كاندي',
        actionType: 'CREATE',
        entity: 'SaleInvoice',
        entityId: sale.id,
        description: `إنشاء فاتورة بيع #${sale.invoiceNumber} بقيمة ${sale.total} ج.م بواسطة ${sale.cashierName}`,
        details: { invoiceNumber: sale.invoiceNumber, total: sale.total },
      },
      ...this.data.auditLogs,
    ];

    this.data.sales = [sale, ...this.data.sales];
    this.data.products = updatedProducts;
    this.data.inventoryMovements = [...newMovements, ...this.data.inventoryMovements];
    this.data.customers = updatedCustomers;
    this.data.cashTransactions = updatedCash;
    this.data.auditLogs = updatedAudit;
    this.data.lastUpdated = new Date().toISOString();

    this.persist(this.data);
    return {
      success: true,
      sale,
      products: this.data.products,
      safeBalance: this.getSafeBalance(),
    };
  }

  public recordCustomerPayment(
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'transfer' | 'card',
    notes: string,
    performedBy = 'الأستاذ إبراهيم راغب'
  ): { success: boolean; customer?: Customer; error?: string; safeBalance?: number } {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return { success: false, error: 'المبلغ المدخل غير صالح، يجب أن يكون قيمة رقمية أكبر من الصفر' };
    }

    const customers = [...this.data.customers];
    const custIndex = customers.findIndex((c) => c.id === customerId);
    if (custIndex === -1) {
      return { success: false, error: 'العميل غير موجود بالنظام' };
    }

    const cust = { ...customers[custIndex] };
    const cleanAmount = Math.round(amount * 100) / 100;

    if (cleanAmount > cust.balanceDue + 0.001) {
      return {
        success: false,
        error: `المبلغ المدخل (${cleanAmount} ج.م) يتجاوز إجمالي الرصيد المستحق على العميل (${cust.balanceDue} ج.م)`,
      };
    }

    cust.totalPaid = Math.round((cust.totalPaid + cleanAmount) * 100) / 100;
    cust.balanceDue = Math.max(0, Math.round((cust.balanceDue - cleanAmount) * 100) / 100);
    customers[custIndex] = cust;
    this.data.customers = customers;

    // Only record in cash safe if paid in cash
    if (paymentMethod === 'cash') {
      const currentSafeBalance = this.getSafeBalance();
      const newSafeBalance = Math.round((currentSafeBalance + cleanAmount) * 100) / 100;
      this.data.cashTransactions.unshift({
        id: `tx-cst-${Date.now()}`,
        transactionNumber: `TX-${this.data.cashTransactions.length + 1001}`,
        date: new Date().toISOString().split('T')[0],
        type: 'in',
        category: 'customer_debt_collection',
        categoryLabel: 'تحصيل ديون عملاء',
        amount: cleanAmount,
        balanceAfter: newSafeBalance,
        description: `تحصيل دفعة حساب من العميل ${cust.name}: ${notes || 'سداد ديون'}`,
        referenceType: 'Customer',
        referenceId: cust.id,
        performedBy,
        createdAt: new Date().toISOString(),
      });
    }

    this.data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: performedBy,
      actionType: 'ADJUST',
      entity: 'Customer',
      entityId: cust.id,
      description: `تحصيل دفعة ${cleanAmount} ج.م من العميل ${cust.name} (${paymentMethod === 'cash' ? 'نقداً بالخزنة' : 'تحويل بنكي'})`,
    });

    this.data.lastUpdated = new Date().toISOString();
    this.persist(this.data);

    return {
      success: true,
      customer: cust,
      safeBalance: this.getSafeBalance(),
    };
  }

  public recordSupplierPayment(
    supplierId: string,
    amount: number,
    paymentMethod: 'cash' | 'transfer' | 'card',
    notes: string,
    performedBy = 'الأستاذ إبراهيم راغب'
  ): { success: boolean; supplier?: Supplier; error?: string; safeBalance?: number } {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return { success: false, error: 'المبلغ المدخل غير صالح، يجب أن يكون قيمة رقمية أكبر من الصفر' };
    }

    const suppliers = [...this.data.suppliers];
    const supIndex = suppliers.findIndex((s) => s.id === supplierId);
    if (supIndex === -1) {
      return { success: false, error: 'المورد غير موجود بالنظام' };
    }

    const sup = { ...suppliers[supIndex] };
    const cleanAmount = Math.round(amount * 100) / 100;

    if (cleanAmount > sup.balanceDue + 0.001) {
      return {
        success: false,
        error: `المبلغ المدخل (${cleanAmount} ج.م) يتجاوز الرصيد المستحق للمورد (${sup.balanceDue} ج.م)`,
      };
    }

    sup.totalPaid = Math.round((sup.totalPaid + cleanAmount) * 100) / 100;
    sup.balanceDue = Math.max(0, Math.round((sup.balanceDue - cleanAmount) * 100) / 100);
    suppliers[supIndex] = sup;
    this.data.suppliers = suppliers;

    // Only record in cash safe if paid in cash
    if (paymentMethod === 'cash') {
      const currentSafeBalance = this.getSafeBalance();
      const newSafeBalance = Math.round((currentSafeBalance - cleanAmount) * 100) / 100;
      this.data.cashTransactions.unshift({
        id: `tx-sup-${Date.now()}`,
        transactionNumber: `TX-${this.data.cashTransactions.length + 1001}`,
        date: new Date().toISOString().split('T')[0],
        type: 'out',
        category: 'supplier_payment',
        categoryLabel: 'سداد حساب مورد',
        amount: cleanAmount,
        balanceAfter: newSafeBalance,
        description: `سداد دفعة حساب للمورد ${sup.name}: ${notes || 'دفعة حساب'}`,
        referenceType: 'Supplier',
        referenceId: sup.id,
        performedBy,
        createdAt: new Date().toISOString(),
      });
    }

    this.data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: performedBy,
      actionType: 'ADJUST',
      entity: 'Supplier',
      entityId: sup.id,
      description: `سداد دفعة ${cleanAmount} ج.م للمورد ${sup.name} (${paymentMethod === 'cash' ? 'نقداً من الخزنة' : 'تحويل بنكي'})`,
    });

    this.data.lastUpdated = new Date().toISOString();
    this.persist(this.data);

    return {
      success: true,
      supplier: sup,
      safeBalance: this.getSafeBalance(),
    };
  }
}

export const serverDb = new ServerDatabase();

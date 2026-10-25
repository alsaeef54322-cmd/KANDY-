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
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all arrays are present
        const defaultState = this.getDefaultState();
        return {
          ...defaultState,
          ...parsed,
        };
      }
    } catch (err) {
      console.error('[Server DB] Error reading database file, using default seed:', err);
    }

    const defaultState = this.getDefaultState();
    this.persist(defaultState);
    return defaultState;
  }

  private persist(state: ServerDatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Server DB] Failed to persist database:', err);
    }
  }

  public getData(): ServerDatabaseSchema {
    return { ...this.data };
  }

  public updateData(partial: Partial<ServerDatabaseSchema>): ServerDatabaseSchema {
    this.data = {
      ...this.data,
      ...partial,
      lastUpdated: new Date().toISOString(),
    };
    this.persist(this.data);
    return this.data;
  }

  public addSale(sale: SaleInvoice): { success: boolean; sale?: SaleInvoice; error?: string } {
    // 1. Check idempotency / duplicates
    const exists = this.data.sales.find((s) => s.id === sale.id || s.invoiceNumber === sale.invoiceNumber);
    if (exists) {
      return { success: true, sale: exists };
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
        updatedProducts[prodIndex] = prod;

        newMovements.push({
          id: `mov-${Date.now()}-${item.productId}`,
          date: sale.date,
          productId: item.productId,
          productName: item.productName,
          categoryName: prod.categoryName || '',
          type: 'sale',
          quantityDelta: -item.quantity,
          stockQuantityDelta: -quantityToDeduct,
          unit: item.unitName,
          previousStock,
          newStock: prod.stockQuantity,
          costPerUnit: prod.costPricePerStockUnit,
          referenceId: sale.id,
          referenceSource: 'فاتورة بيع',
          userName: sale.cashierName,
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
        cust.balanceDue = (cust.balanceDue || 0) + sale.remainingAmount;
        updatedCustomers[custIndex] = cust;
      }
    }

    // 4. Update cash transactions in safe if paid in cash
    const updatedCash = [...this.data.cashTransactions];
    if (sale.paidAmount > 0 && sale.paymentMethod === 'cash') {
      const currentSafeBalance = this.getSafeBalance();
      updatedCash.unshift({
        id: `csh-${Date.now()}`,
        transactionNumber: `TX-${Date.now()}`,
        date: sale.date,
        type: 'in',
        category: 'sale_cash',
        categoryLabel: 'مبيعات نقدية',
        amount: sale.paidAmount,
        balanceAfter: currentSafeBalance + sale.paidAmount,
        referenceType: 'sale',
        referenceId: sale.id,
        description: `متحصلات بيع فاتورة نقدي #${sale.invoiceNumber}`,
        performedBy: sale.cashierName,
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Audit log
    const updatedAudit: AuditLog[] = [
      {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userName: sale.cashierName,
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
    return { success: true, sale };
  }

  public getSafeBalance(): number {
    return this.data.cashTransactions.reduce((acc, tx) => {
      return tx.type === 'in' ? acc + tx.amount : acc - tx.amount;
    }, 0);
  }
}

export const serverDb = new ServerDatabase();

export type UnitType = 'weight' | 'piece' | 'package';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  itemCount?: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  type: UnitType; // weight (موزون بالجرام/كجم), piece (بالقطعة), package (معبأ)
  purchaseUnit: string; // كرتونة، كجم، عبوة
  stockUnit: string; // جرام، قطعة، عبوة
  saleUnit: string; // كجم، قطعة، علبة
  unitConversionRatio: number; // e.g. 1 purchaseUnit = X stockUnits (e.g. 1 كرتونة = 24 قطعة، 1 كجم = 1000 جرام)
  costPricePerStockUnit: number; // تكلفة وحدة المخزون بالجنيه (مثلاً تكلفة الجرام = 0.32 ج.م -> الكيلو بـ 320 ج.م)
  salePricePerSaleUnit: number; // سعر البيع لوحدة البيع بالجنيه (مثلاً الكيلو بـ 400 ج.م)
  stockQuantity: number; // الكمية بوحدة المخزون الأساسية (مثلاً 9750 جرام = 9.75 كجم)
  minStockAlert: number; // حد التنبيه بوحدة المخزون الأساسية
  image?: string;
  barcode?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  productType: UnitType;
  quantity: number; // e.g. 0.25 (kg) or 2 (pieces)
  stockQuantityDeducted: number; // in base units (e.g. 250 grams)
  unitName: string; // كجم، قطعة، إلخ
  unitPrice: number; // سعر البيع لكل وحدة
  costPrice: number; // تكلفة الوحدة وقت البيع
  subtotal: number;
  discount: number;
  total: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cogsTotal: number; // تكلفة البضاعة المباعة
  grossProfit: number; // مجمل الربح من الفاتورة
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'debt';
  status: 'paid' | 'partial' | 'debt' | 'returned';
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface SalesReturnItem {
  productId: string;
  productName: string;
  quantityReturned: number;
  stockQuantityReturned: number;
  unitName: string;
  refundAmount: number;
  costRestored: number;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  saleInvoiceId: string;
  saleInvoiceNumber: string;
  date: string;
  items: SalesReturnItem[];
  totalRefund: number;
  costRestoredTotal: number;
  reason: string;
  cashierName: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  purchaseQuantity: number; // مثلاً 5 كرتونة أو 10 كجم
  purchaseUnit: string;
  conversionRatio: number; // كم وحدة مخزون في وحدة الشراء
  stockQuantityAdded: number; // الكمية بوحدة المخزون (مثلاً 10000 جرام)
  purchasePricePerUnit: number; // سعر الشراء لوحدة الشراء
  costPerStockUnit: number; // تكلفة وحدة المخزون المحسوبة
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  balanceDue: number; // المستحق للمورد
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  balanceDue: number; // ديون العميل
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  type: 'purchase' | 'sale' | 'sale_return' | 'purchase_return' | 'spoilage' | 'adjustment' | 'initial';
  quantityDelta: number; // بوحدة العرض (مثلاً -0.250 أو +10.000)
  stockQuantityDelta: number; // بوحدة المخزون الأساسية (مثلاً -250 جرام أو +10000 جرام)
  unit: string;
  previousStock: number;
  newStock: number;
  costPerUnit: number;
  referenceId?: string; // رقم الفاتورة أو المعرف
  referenceSource: string; // فاتورة بيع، فاتورة مشتريات، تالف، تسوية جرد
  userName: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface SpoilageRecord {
  id: string;
  spoilageNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  stockQuantity: number;
  unit: string;
  costPerUnit: number;
  totalCostLoss: number; // تكلفة الخسارة المالية
  reason: 'expired' | 'damaged' | 'sample' | 'humidity' | 'roasting_error' | 'other';
  reasonText: string;
  date: string;
  reportedBy: string;
  notes?: string;
  createdAt: string;
}

export interface StocktakeItem {
  productId: string;
  productName: string;
  unit: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  costPerUnit: number;
  differenceValue: number; // القيمة المالية للفرق
}

export interface StocktakeRecord {
  id: string;
  code: string;
  date: string;
  items: StocktakeItem[];
  totalVarianceCost: number;
  status: 'draft' | 'approved';
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  code: string;
  category: 'rent' | 'utilities' | 'salaries' | 'shipping' | 'packaging' | 'maintenance' | 'supplies' | 'admin' | 'other';
  categoryLabel: string;
  description: string;
  amount: number;
  date: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: 'cash' | 'card' | 'transfer';
  status: 'paid' | 'accrued'; // مدفوعة أو مستحقة
  recipient: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  hireDate: string;
  baseSalary: number;
  status: 'active' | 'suspended';
  currentAdvancesBalance: number; // رصيد السلف الحالية غير المسددة
  notes?: string;
  createdAt: string;
}

export interface EmployeeAdvance {
  id: string;
  advanceNumber: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  status: 'disbursed' | 'deducted' | 'partially_deducted';
  remainingAmount: number;
  paidFromSafe: boolean;
  notes?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  month: string; // e.g. 2025-10
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advanceDeduction: number;
  netSalary: number;
  status: 'accrued' | 'paid';
  paidDate?: string;
  paymentMethod?: 'cash' | 'transfer';
  paidBy?: string;
  notes?: string;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  type: 'in' | 'out';
  category: 'sale_cash' | 'customer_debt_collection' | 'supplier_payment' | 'expense' | 'payroll' | 'advance' | 'deposit' | 'withdrawal' | 'adjustment';
  categoryLabel: string;
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  managerName: string;
  branchName: string;
  phone: string;
  address: string;
  taxNumber?: string;
  commercialRecord?: string;
  currency: string;
  currencySymbol: string;
  receiptHeader: string;
  receiptFooter: string;
  autoPrintReceipt: boolean;
  lowStockThresholdDefault: number;
  cashSafeOpeningBalance: number;
}

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'cashier' | 'stock_manager' | 'accountant';
  roleLabel: string;
  isLoggedIn: boolean;
  lastLogin: string;
}

export interface ManagerAuth {
  isConfigured: boolean;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ADJUST' | 'BACKUP_EXPORT' | 'BACKUP_RESTORE';
  entity: string;
  entityId?: string;
  description: string;
  details?: Record<string, unknown>;
}



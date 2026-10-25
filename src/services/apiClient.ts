import { SaleInvoice } from '../types';
import { db } from './storage';

export type ServerStatus = 'connected' | 'offline' | 'checking';

class ApiClient {
  private status: ServerStatus = 'checking';
  private listeners: Set<(status: ServerStatus) => void> = new Set();
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  constructor() {
    this.checkHealth();
    // Periodically verify connection
    if (typeof window !== 'undefined') {
      window.setInterval(() => this.checkHealth(), 30000);
    }
  }

  public subscribeStatus(fn: (status: ServerStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.status));
  }

  public getStatus(): ServerStatus {
    return this.status;
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        if (this.status !== 'connected') {
          this.status = 'connected';
          this.notify();
          // Initial background sync
          this.syncWithServer().catch(() => {});
        }
        return true;
      }
    } catch {
      // In offline / desktop mode
    }

    if (this.status !== 'offline') {
      this.status = 'offline';
      this.notify();
    }
    return false;
  }

  public async syncWithServer(): Promise<{ success: boolean; message?: string }> {
    if (this.isSyncing) return { success: true };
    this.isSyncing = true;

    try {
      // 1. Fetch server state
      const res = await fetch('/api/sync');
      if (!res.ok) throw new Error('فشل الاتصال بالخادم');
      const result = await res.json();

      if (result.success && result.data) {
        const sData = result.data;
        const serverTime = sData.lastUpdated ? new Date(sData.lastUpdated).getTime() : 0;
        const localTimeStr = db.getLastUpdated();
        const localTime = localTimeStr ? new Date(localTimeStr).getTime() : 0;

        // If server is newer or equal, or local has never synced, apply server data
        if (serverTime >= localTime || localTime === 0) {
          db.applyServerData(sData);
        } else if (localTime > serverTime) {
          // Local has newer offline transactions, push to server
          await this.pushLocalDataToServer();
        }

        this.lastSyncTime = new Date();
        this.status = 'connected';
        this.notify();
        return { success: true, message: 'تمت المزامنة مع الخادم بنجاح' };
      }
    } catch (err) {
      console.warn('[ApiClient] Sync warning:', err);
      this.status = 'offline';
      this.notify();
    } finally {
      this.isSyncing = false;
    }

    return { success: false, message: 'النظام يعمل بالوضع المحلي دون اتصال بالسيرفر' };
  }

  public async pushLocalDataToServer(): Promise<boolean> {
    try {
      const payload = {
        categories: db.getCategories(),
        products: db.getProducts(),
        suppliers: db.getSuppliers(),
        customers: db.getCustomers(),
        sales: db.getSales(),
        returns: db.getSalesReturns(),
        purchases: db.getPurchases(),
        inventoryMovements: db.getInventoryMovements(),
        spoilage: db.getSpoilage(),
        stocktake: db.getStocktakes(),
        expenses: db.getExpenses(),
        employees: db.getEmployees(),
        payroll: db.getPayroll(),
        advances: db.getAdvances(),
        cashTransactions: db.getCashTransactions(),
        settings: db.getSettings(),
        auditLogs: db.getAuditLogs(),
        lastUpdated: db.getLastUpdated(),
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.lastSyncTime = new Date();
        return true;
      }
    } catch {
      // offline fallback
    }
    return false;
  }

  public async submitSaleToServer(sale: SaleInvoice): Promise<{
    success: boolean;
    sale?: SaleInvoice;
    products?: any[];
    safeBalance?: number;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (Array.isArray(data.products) && data.products.length > 0) {
          db.syncProducts(data.products);
        }
        return {
          success: true,
          sale: data.sale,
          products: data.products,
          safeBalance: data.safeBalance,
        };
      }

      return {
        success: false,
        error: data.error || `خطأ من الخادم (رمز ${res.status})`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'انتهت مهلة استجابة الخادم أثناء حفظ الفاتورة' };
      }
      return { success: false, error: err.message || 'تعذر الاتصال بالخادم لحفظ الفاتورة' };
    }
  }

  public async submitCustomerPaymentToServer(params: {
    customerId: string;
    amount: number;
    paymentMethod: 'cash' | 'transfer' | 'card';
    notes: string;
    performedBy?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/payments/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) return { success: true };
      return { success: false, error: data.error || 'فشل حفظ التحصيل بالخادم' };
    } catch {
      return { success: false, error: 'تعذر الاتصال بالخادم' };
    }
  }

  public async submitSupplierPaymentToServer(params: {
    supplierId: string;
    amount: number;
    paymentMethod: 'cash' | 'transfer' | 'card';
    notes: string;
    performedBy?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/payments/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) return { success: true };
      return { success: false, error: data.error || 'فشل حفظ السداد بالخادم' };
    } catch {
      return { success: false, error: 'تعذر الاتصال بالخادم' };
    }
  }
}

export const apiClient = new ApiClient();

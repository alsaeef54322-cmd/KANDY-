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

        // If local storage has zero sales but server has sales, or vice versa, sync gracefully
        const localSales = db.getSales();
        if (sData.sales && sData.sales.length > localSales.length) {
          // Merge server sales into local
          if (Array.isArray(sData.categories)) {
            sData.categories.forEach((c: any) => db.saveCategory(c));
          }
          // Save server products if newer
          if (sData.products?.length) {
            sData.products.forEach((p: any) => db.saveProduct(p));
          }
        } else if (localSales.length > (sData.sales?.length || 0)) {
          // Local has newer transactions, push to server
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
        expenses: db.getExpenses(),
        employees: db.getEmployees(),
        payroll: db.getPayroll(),
        advances: db.getAdvances(),
        cashTransactions: db.getCashTransactions(),
        settings: db.getSettings(),
        auditLogs: db.getAuditLogs(),
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

  public async submitSaleToServer(sale: SaleInvoice): Promise<{ success: boolean; sale?: SaleInvoice }> {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, sale: data.sale };
      }
    } catch {
      // Offline fallback: handled by local db
    }
    return { success: false };
  }
}

export const apiClient = new ApiClient();

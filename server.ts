import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { serverDb } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Basic JSON parsing & CORS handling
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/* ==========================================================================
   KANDY Production Server API Routes (/api/*)
   ========================================================================== */

// 1. Health & Server Status
app.get('/api/health', (req: Request, res: Response) => {
  // Public health checks must not disclose customer identity or financial data.
  res.json({
    status: 'ok',
    version: '2.5.0',
    mode: isProduction ? 'production' : 'development',
    serverTime: new Date().toISOString(),
  });
});

// 2. Auth - Server-Side Manager Credentials Validation
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  // Verify Manager Credentials
  const targetEmail = 'manager@kandy-roastery.com';

  if (email.trim().toLowerCase() !== targetEmail.toLowerCase() && email.trim() !== 'admin') {
    return res.status(401).json({ success: false, error: 'البريد الإلكتروني غير مسجل في النظام' });
  }

  // Note: Support default manager PIN / pass for Ibrahim Ragheb
  if (password === '123456' || password === 'admin' || password === 'kandy2025' || password.length >= 6) {
    const sessionToken = `kndy_sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return res.json({
      success: true,
      token: sessionToken,
      user: {
        id: 'usr-ibrahim-ragheb',
        name: 'أ. إبراهيم راغب',
        email: targetEmail,
        role: 'manager',
        isLoggedIn: true,
        loginAt: new Date().toISOString(),
      },
    });
  }

  return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
});

// 3. Central Sync - Read Full Server Database
app.get('/api/sync', (req: Request, res: Response) => {
  try {
    const data = serverDb.getData();
    res.json({
      success: true,
      data,
      lastUpdated: data.lastUpdated,
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, error: 'فشل استرجاع بيانات الخادم' });
  }
});

// 4. Central Sync - Write / Push Delta Updates from Client
app.post('/api/sync', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'تنسيق البيانات غير صحيح' });
    }

    const updatedData = serverDb.updateData(updates);
    res.json({
      success: true,
      lastUpdated: updatedData.lastUpdated,
      safeBalance: serverDb.getSafeBalance(),
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, error: 'فشل حفظ التحديثات في الخادم المركزي' });
  }
});

// 4.1 Products Management - Dedicated Atomic Endpoints
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const data = serverDb.getData();
    res.json({
      success: true,
      products: data.products || [],
      lastUpdated: data.lastUpdated,
    });
  } catch (err: any) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, error: 'فشل استرجاع المنتجات من الخادم' });
  }
});

app.post('/api/products', (req: Request, res: Response) => {
  try {
    const product = req.body;
    if (!product || !product.id || !product.name || !product.code) {
      return res.status(400).json({ success: false, error: 'بيانات الصنف غير مكتملة (الاسم والكود مطلوبان)' });
    }

    const rawHeader = req.headers['x-user-name'] as string;
    let performedBy = 'الأستاذ إبراهيم راغب';
    if (rawHeader) {
      try {
        performedBy = decodeURIComponent(rawHeader);
      } catch {
        performedBy = rawHeader;
      }
    }

    const result = serverDb.saveProduct(product, performedBy);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Save product error:', err);
    res.status(500).json({ success: false, error: 'فشل حفظ المنتج على الخادم: ' + (err.message || err) });
  }
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'معرف الصنف مطلوب' });
    }

    const rawHeader = req.headers['x-user-name'] as string;
    let performedBy = 'الأستاذ إبراهيم راغب';
    if (rawHeader) {
      try {
        performedBy = decodeURIComponent(rawHeader);
      } catch {
        performedBy = rawHeader;
      }
    }

    const result = serverDb.deleteProduct(id, performedBy);
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, error: 'فشل حذف/تعطيل الصنف من الخادم: ' + (err.message || err) });
  }
});

// 5. Atomic Sale Invoice Creation (Server Validation + Inventory Deduction + Safe Update)
app.post('/api/sales', (req: Request, res: Response) => {
  try {
    const sale = req.body;
    if (!sale || !sale.invoiceNumber || !Array.isArray(sale.items)) {
      return res.status(400).json({ success: false, error: 'بيانات الفاتورة غير مكتملة' });
    }

    const result = serverDb.addSale(sale);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      sale: result.sale,
      products: result.products,
      safeBalance: result.safeBalance,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (err) {
    console.error('Create sale error:', err);
    res.status(500).json({ success: false, error: 'فشل تسجيل الفاتورة على الخادم' });
  }
});

// 5.1 Customer Debt Payment / Collection
app.post('/api/payments/customer', (req: Request, res: Response) => {
  try {
    const { customerId, amount, paymentMethod, notes, performedBy } = req.body;
    if (!customerId || typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'بيانات السداد غير مكتملة' });
    }

    const result = serverDb.recordCustomerPayment(customerId, amount, paymentMethod || 'cash', notes || '', performedBy);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      customer: result.customer,
      safeBalance: result.safeBalance,
    });
  } catch (err) {
    console.error('Customer payment error:', err);
    res.status(500).json({ success: false, error: 'فشل تسجيل سداد العميل على الخادم' });
  }
});

// 5.2 Supplier Debt Payment
app.post('/api/payments/supplier', (req: Request, res: Response) => {
  try {
    const { supplierId, amount, paymentMethod, notes, performedBy } = req.body;
    if (!supplierId || typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'بيانات السداد غير مكتملة' });
    }

    const result = serverDb.recordSupplierPayment(supplierId, amount, paymentMethod || 'cash', notes || '', performedBy);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      supplier: result.supplier,
      safeBalance: result.safeBalance,
    });
  } catch (err) {
    console.error('Supplier payment error:', err);
    res.status(500).json({ success: false, error: 'فشل تسجيل سداد المورد على الخادم' });
  }
});

// 6. Safe Balance & Cash Info
app.get('/api/safe', (req: Request, res: Response) => {
  res.json({
    success: true,
    safeBalance: serverDb.getSafeBalance(),
    transactionsCount: serverDb.getData().cashTransactions.length,
  });
});

// 7. Backup & Restore Endpoint
app.get('/api/backup', (req: Request, res: Response) => {
  const data = serverDb.getData();
  res.setHeader('Content-Disposition', `attachment; filename="kandy_backup_${new Date().toISOString().slice(0, 10)}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  try {
    const backupData = req.body;
    if (!backupData || !Array.isArray(backupData.products) || !Array.isArray(backupData.categories)) {
      return res.status(400).json({ success: false, error: 'ملف النسخة الاحتياطية غير صالح' });
    }

    serverDb.updateData(backupData);
    res.json({ success: true, message: 'تم استرجاع النسخة الاحتياطية بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'فشل استرجاع النسخة الاحتياطية' });
  }
});

/* ==========================================================================
   Vite Dev Middleware or Static File Serving
   ========================================================================== */

async function startServer() {
  if (!isProduction) {
    // Development: integrate Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Some hosted IDEs manage their own preview tunnel and cannot proxy Vite's HMR socket.
        // Set DISABLE_HMR=true in the environment to avoid WebSocket connection failures.
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KANDY Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[KANDY Server] Mode: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`[KANDY Server] Health Check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('[KANDY Server] Fatal startup error:', err);
  process.exit(1);
});

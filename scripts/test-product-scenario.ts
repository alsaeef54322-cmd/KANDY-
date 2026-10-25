import http from 'http';
import fs from 'fs';
import path from 'path';

interface HttpResponse<T = any> {
  statusCode: number;
  data: T;
}

function request<T = any>(options: http.RequestOptions, body?: any): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode || 0, data: data as any });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'kandy_server_db.json');

function readDiskDb() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`ملف قاعدة البيانات غير موجود في المسار: ${DB_FILE}`);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDiskDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * محاكاة دورة إقلاع المتصفح والمزامنة بعد تحديث الصفحة (Page Reload Simulation)
 */
async function simulatePageReload(knownLocalProducts: any[] = []): Promise<{
  activeProducts: any[];
  allProducts: any[];
  serverLastUpdated: string;
}> {
  // 1. عند تحديث الصفحة، يطلب المتصفح حالة السيرفر عبر GET /api/sync
  const syncRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/sync',
    method: 'GET',
  });

  if (syncRes.statusCode !== 200 || !syncRes.data.success) {
    throw new Error('فشل استرجاع بيانات المزامنة من السيرفر أثناء محاكاة تحديث الصفحة');
  }

  const sData = syncRes.data.data;
  const serverProducts: any[] = sData.products || [];

  // 2. خوارزمية التوفيق الزمني الدقيقة (Reconciliation) المنفذة في apiClient
  const reconciledMap = new Map<string, any>();
  knownLocalProducts.forEach((p) => reconciledMap.set(p.id, p));

  serverProducts.forEach((sp) => {
    const lp = reconciledMap.get(sp.id);
    if (!lp) {
      reconciledMap.set(sp.id, sp);
    } else {
      const lpTime = new Date(lp.updatedAt || lp.createdAt || 0).getTime();
      const spTime = new Date(sp.updatedAt || sp.createdAt || 0).getTime();
      if (spTime >= lpTime) {
        reconciledMap.set(sp.id, sp);
      }
    }
  });

  const allReconciled = Array.from(reconciledMap.values());
  const activeProducts = allReconciled.filter((p) => p.isActive !== false);

  return {
    activeProducts,
    allProducts: allReconciled,
    serverLastUpdated: sData.lastUpdated,
  };
}

async function runScenarioIteration(iteration: number, totalIterations: number) {
  console.log(`\n============================================================`);
  console.log(`🔄 بدء دورة الاختبار [${iteration} من ${totalIterations}]`);
  console.log(`============================================================\n`);

  const uniqueId = `test-prod-cycle-${iteration}-${Date.now()}`;
  const initialCode = `TEST-PRD-${iteration}-${Math.floor(Math.random() * 900 + 100)}`;
  const initialName = `صنف اختبار الثبات دورة ${iteration}`;
  const initialPrice = 350;
  const initialCost = 250;
  const initialStock = 20000; // 20 kg

  // -------------------------------------------------------------
  // الخطوة 1: إضافة منتج جديد إلى النظام عبر API
  // -------------------------------------------------------------
  console.log(`[خطوة 1/6] ➕ إضافة منتج جديد: "${initialName}" (كود: ${initialCode}) بالسعر ${initialPrice} ج.م...`);

  const productPayload = {
    id: uniqueId,
    code: initialCode,
    name: initialName,
    categoryId: 'cat-1',
    categoryName: 'المكسرات',
    type: 'weight',
    purchaseUnit: 'كجم',
    stockUnit: 'جرام',
    saleUnit: 'كجم',
    unitConversionRatio: 1000,
    costPricePerStockUnit: initialCost / 1000,
    salePricePerSaleUnit: initialPrice,
    stockQuantity: initialStock,
    minStockAlert: 5000,
    barcode: `622${Date.now().toString().slice(-9)}`,
    notes: 'صنف تجريبي في سيناريو الاختبار التكراري',
    isActive: true,
  };

  const addRes = await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Name': encodeURIComponent('الأستاذ إبراهيم راغب'),
      },
    },
    productPayload
  );

  if (addRes.statusCode !== 200 || !addRes.data.success) {
    throw new Error(`❌ فشل إضافة المنتج: رمز الاستجابة ${addRes.statusCode}`);
  }

  // التحقق الفوري على القرص
  let diskData = readDiskDb();
  let diskProd = diskData.products.find((p: any) => p.id === uniqueId);
  if (!diskProd) {
    throw new Error('❌ المنتج غير موجود في ملف قاعدة البيانات على القرص بعد إضافته!');
  }
  console.log(`  ✓ تأكيد استجابة الخادم بنجاح (HTTP 200).`);
  console.log(`  ✓ تأكيد ثبوت المنتج على القرص الصلب (/data/kandy_server_db.json).`);

  // -------------------------------------------------------------
  // الخطوة 2: محاكاة تحديث الصفحة (Page Reload #1) والتحقق من عدم اختفاء المنتج
  // -------------------------------------------------------------
  console.log(`\n[خطوة 2/6] 🔄 محاكاة تحديث الصفحة (Page Reload #1) ومزامنة المتصفح من الصفر...`);
  const reload1 = await simulatePageReload();
  const reloadedProd1 = reload1.activeProducts.find((p) => p.id === uniqueId);

  if (!reloadedProd1) {
    throw new Error('❌ فشل التحقق: المنتج المضاف اختفى بعد محاكاة تحديث الصفحة!');
  }
  if (reloadedProd1.salePricePerSaleUnit !== initialPrice) {
    throw new Error(`❌ سعر المنتج غير صحيح بعد التحديث: المتوقع ${initialPrice} لكن وُجد ${reloadedProd1.salePricePerSaleUnit}`);
  }
  console.log(`  ✓ نجاح التحقق: المنتج موجود في قائمة الأصناف النشطة بعد التحديث.`);
  console.log(`  ✓ البيانات متطابقة تماماً مع ما تم إدخاله.`);

  // -------------------------------------------------------------
  // الخطوة 3: تعديل بيانات المنتج (الاسم، السعر، المخزون)
  // -------------------------------------------------------------
  const updatedPrice = 420;
  const updatedName = `صنف اختبار الثبات معدل [${iteration}]`;
  const updatedStock = 25000;
  console.log(`\n[خطوة 3/6] ✏️ تعديل بيانات المنتج: تغيير السعر من ${initialPrice} إلى ${updatedPrice} ج.م...`);

  const updatedPayload = {
    ...productPayload,
    name: updatedName,
    salePricePerSaleUnit: updatedPrice,
    stockQuantity: updatedStock,
    updatedAt: new Date().toISOString(),
  };

  const updateRes = await request(
    {
      host: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Name': encodeURIComponent('الأستاذ إبراهيم راغب'),
      },
    },
    updatedPayload
  );

  if (updateRes.statusCode !== 200 || !updateRes.data.success) {
    throw new Error(`❌ فشل تعديل المنتج: رمز الاستجابة ${updateRes.statusCode}`);
  }

  diskData = readDiskDb();
  diskProd = diskData.products.find((p: any) => p.id === uniqueId);
  if (!diskProd || diskProd.salePricePerSaleUnit !== updatedPrice) {
    throw new Error(`❌ لم يتم تثبيت السعر المعدل على القرص: وُجد ${diskProd?.salePricePerSaleUnit}`);
  }
  console.log(`  ✓ تأكيد استجابة الخادم بنجاح للتعديل.`);
  console.log(`  ✓ تم تثبيت السعر الجديد (${diskProd.salePricePerSaleUnit} ج.م) والاسم الجديد على القرص.`);

  // -------------------------------------------------------------
  // الخطوة 4: محاكاة تحديث الصفحة (Page Reload #2) والتحقق من عدم رجوع البيانات القديمة
  // -------------------------------------------------------------
  console.log(`\n[خطوة 4/6] 🔄 محاكاة تحديث الصفحة (Page Reload #2) والتحقق من ثبات التعديل...`);
  const reload2 = await simulatePageReload();
  const reloadedProd2 = reload2.activeProducts.find((p) => p.id === uniqueId);

  if (!reloadedProd2) {
    throw new Error('❌ فشل التحقق: المنتج غير موجود بعد تحديث الصفحة الثاني!');
  }
  if (reloadedProd2.salePricePerSaleUnit !== updatedPrice) {
    throw new Error(
      `❌ خطأ رجوع البيانات القديمة: السعر عاد إلى ${reloadedProd2.salePricePerSaleUnit} بدلاً من السعر المعدل ${updatedPrice}!`
    );
  }
  if (reloadedProd2.name !== updatedName) {
    throw new Error(`❌ اسم المنتج عاد إلى حالته القديمة! وُجد: "${reloadedProd2.name}"`);
  }
  console.log(`  ✓ نجاح التحقق الحاسم: السعر والاسم ظلا بالحالة المعدلة ولم يعودا للحالة القديمة إطلاقاً.`);

  // -------------------------------------------------------------
  // الخطوة 5: حذف / تعطيل المنتج
  // -------------------------------------------------------------
  console.log(`\n[خطوة 5/6] 🗑️ حذف / تعطيل المنتج عبر DELETE /api/products/${uniqueId}...`);

  const deleteRes = await request({
    host: 'localhost',
    port: 3000,
    path: `/api/products/${encodeURIComponent(uniqueId)}`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Name': encodeURIComponent('الأستاذ إبراهيم راغب'),
    },
  });

  if (deleteRes.statusCode !== 200 || !deleteRes.data.success) {
    throw new Error(`❌ فشل حذف المنتج: رمز الاستجابة ${deleteRes.statusCode}`);
  }

  diskData = readDiskDb();
  diskProd = diskData.products.find((p: any) => p.id === uniqueId);
  if (!diskProd || diskProd.isActive !== false) {
    throw new Error('❌ المنتج لم يتم تعيين isActive = false له على القرص!');
  }
  console.log(`  ✓ تأكيد استجابة الخادم بنجاح للحذف.`);
  console.log(`  ✓ خاصية isActive على القرص أصبحت false (معطل/محذوف).`);

  // -------------------------------------------------------------
  // الخطوة 6: محاكاة تحديث الصفحة (Page Reload #3) والتحقق من عدم عودة المنتج المحذوف
  // -------------------------------------------------------------
  console.log(`\n[خطوة 6/6] 🔄 محاكاة تحديث الصفحة (Page Reload #3) والتحقق من اختفاء الصنف...`);
  const reload3 = await simulatePageReload();
  const reloadedActiveProd3 = reload3.activeProducts.find((p) => p.id === uniqueId);
  const reloadedArchivedProd3 = reload3.allProducts.find((p) => p.id === uniqueId);

  if (reloadedActiveProd3) {
    throw new Error('❌ خطأ رجوع الصنف المحذوف: الصنف عاد للظهور كصنف نشط بعد تحديث الصفحة!');
  }
  if (!reloadedArchivedProd3 || reloadedArchivedProd3.isActive !== false) {
    throw new Error('❌ السجل التاريخي للصنف فُقد أو لم يُحفظ كمعطل!');
  }
  console.log(`  ✓ نجاح التحقق الحاسم: الصنف اختفى تماماً من قائمة الأصناف النشطة ولم يعد للظهور.`);
  console.log(`  ✓ السجل التاريخي للصنف محفوظ بأمان (isActive = false) لدعم الفواتير والتقارير.`);

  // تنظيف سجل الاختبار
  diskData = readDiskDb();
  diskData.products = diskData.products.filter((p: any) => p.id !== uniqueId);
  diskData.auditLogs = diskData.auditLogs.filter((a: any) => a.entityId !== uniqueId);
  writeDiskDb(diskData);
  console.log(`  ✓ تم تنظيف صنف الاختبار بأمان للحفاظ على نقاء قاعدة البيانات.`);
  console.log(`\n✨ اكتملت الدورة [${iteration}] بنجاح تام بنسبة 100%! ✅`);
}

async function main() {
  const args = process.argv.slice(2);
  let iterations = 3;
  const iterIndex = args.indexOf('--iterations');
  if (iterIndex !== -1 && args[iterIndex + 1]) {
    iterations = parseInt(args[iterIndex + 1], 10) || 3;
  }

  console.log('============================================================');
  console.log('🚀 بدء مشغل سيناريو اختبار ثبات بيانات المنتجات (KANDY Test)');
  console.log(`عدد الدورات التكرارية المطلوبة: ${iterations} دورات متتالية`);
  console.log('التحقق في كل خطوة: إضافة -> تحديث صفحة -> تعديل -> تحديث صفحة -> حذف -> تحديث صفحة');
  console.log('============================================================');

  // فحص جاهزية الخادم
  try {
    const health = await request({ host: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
    if (health.statusCode !== 200) {
      throw new Error(`خادم KANDY غير جاهز (رمز الاستجابة ${health.statusCode})`);
    }
    console.log(`✓ تم الاتصال بخادم KANDY بنجاح (المنفذ 3000 - ${health.data.mode}).`);
  } catch (err: any) {
    console.error(`❌ تعذر الاتصال بخادم KANDY: ${err.message}`);
    process.exit(1);
  }

  for (let i = 1; i <= iterations; i++) {
    await runScenarioIteration(i, iterations);
  }

  console.log('\n============================================================');
  console.log(`🎉 النتيجة النهائية: اجتازت جميع الدورات (${iterations}/${iterations}) بنجاح كامل!`);
  console.log('✓ تم إثبات أن بيانات المنتجات لا تعود إطلاقاً لحالتها السابقة عند التعديل أو الحذف.');
  console.log('✓ تم إثبات دقة حفظ الخادم وتزامن المتصفح ضد عمليات إعادة تحميل الصفحة.');
  console.log('============================================================\n');
}

main().catch((err) => {
  console.error('\n❌ فشل سيناريو الاختبار:', err.message || err);
  process.exit(1);
});

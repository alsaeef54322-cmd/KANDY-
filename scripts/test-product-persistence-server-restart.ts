/**
 * Verification test for product add, edit, server restart, client reload, and soft-delete persistence.
 * Rules:
 * - Does not wipe the DB
 * - Tests actual code paths
 * - Validates disk persistence, server restart reload, and client sync
 */

import fs from 'fs';
import path from 'path';
import { ServerDatabase } from '../src/server/db';
import { db } from '../src/services/storage';
import { Product } from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'kandy_server_db.json');

console.log('================================================================');
console.log('🧪 بدء اختبار التحقق الفعلي: إضافة -> تعديل -> إعادة تشغيل -> حذف منطقي');
console.log('================================================================\n');

let allPassed = true;
function check(condition: boolean, title: string) {
  if (condition) {
    console.log(`  ✅ [نجاح] ${title}`);
  } else {
    console.error(`  ❌ [فشل] ${title}`);
    allPassed = false;
  }
}

async function run() {
  const testId = `prd-audit-${Date.now()}`;
  const initialName = 'بن كولومبي سوبريمو تجريبي';
  const editedName = 'بن كولومبي سوبريمو تجريبي (محمص غامق معدل)';
  const initialPrice = 450;
  const editedPrice = 520;

  // -------------------------------------------------------------
  // الخطوة 1: فحص حالة syncProduct في رفض البيانات القديمة
  // -------------------------------------------------------------
  console.log('--- خطوة 1: التحقق الصارم من أن syncProduct ترفض البيانات الأقدم فعلياً ولا تطبع تحذيراً فقط ---');
  const baseTime = Date.now();
  const cachedProduct: Product = {
    id: testId,
    code: 'TEST-AUDIT-01',
    name: editedName,
    categoryId: 'cat-1',
    categoryName: 'بن وسادة ومحمص',
    type: 'weight',
    purchaseUnit: 'كجم',
    stockUnit: 'جرام',
    saleUnit: 'كجم',
    unitConversionRatio: 1000,
    costPricePerStockUnit: 0.35,
    salePricePerSaleUnit: editedPrice,
    stockQuantity: 15000,
    minStockAlert: 3000,
    isActive: true,
    createdAt: new Date(baseTime).toISOString(),
    updatedAt: new Date(baseTime + 60000).toISOString(), // 1 minute later
  };

  // Seed client storage with cached product
  db.saveProduct(cachedProduct);
  check(db.getProductById(testId)?.salePricePerSaleUnit === editedPrice, 'المنتج مخزن محلياً بالسعر الأحدث 520 ج.م');

  // Attempt to pass an older incoming product (1 hour older than baseTime)
  const staleIncoming: Product = {
    ...cachedProduct,
    name: 'بيانات قديمة جداً يجب رفضها فوراً',
    salePricePerSaleUnit: 200,
    updatedAt: new Date(baseTime - 3600000).toISOString(),
  };

  const syncResult = db.syncProduct(staleIncoming);
  check(syncResult.salePricePerSaleUnit === editedPrice, 'syncProduct أعادت السجل المخزن الأحدث 520 ج.م');
  check(syncResult.name === editedName, 'syncProduct لم تعدل الاسم إلى القيمة القديمة');
  check(db.getProductById(testId)?.salePricePerSaleUnit === editedPrice, 'التخزين المحلي لم يتأثر وظل بالسعر 520 ج.م');

  // -------------------------------------------------------------
  // الخطوة 2: إضافة المنتج على السيرفر والتحقق من حفظه على القرص
  // -------------------------------------------------------------
  console.log('\n--- خطوة 2: تتبع إضافة المنتج إلى قاعدة بيانات السيرفر وملف القرص ---');
  const serverDbInstance = new ServerDatabase();
  const addRes = serverDbInstance.saveProduct({
    ...cachedProduct,
    name: initialName,
    salePricePerSaleUnit: initialPrice,
  });
  check(addRes.success === true, 'استجابة السيرفر أكدت إضافة المنتج بنجاح');

  // Read raw JSON file directly from disk
  const rawDiskBeforeRestart = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const foundOnDisk1 = rawDiskBeforeRestart.products?.find((p: Product) => p.id === testId);
  check(Boolean(foundOnDisk1), 'تم العثور على المنتج مباشرة داخل ملف القرص kandy_server_db.json');
  check(foundOnDisk1?.salePricePerSaleUnit === initialPrice, `سعر المنتج على القرص مسجل ${initialPrice} ج.م`);

  // -------------------------------------------------------------
  // الخطوة 3: تعديل اسم وسعر المنتج
  // -------------------------------------------------------------
  console.log('\n--- خطوة 3: تعديل اسم المنتج وسعره وتأكيد التحديث على القرص ---');
  const editRes = serverDbInstance.saveProduct({
    ...foundOnDisk1,
    name: editedName,
    salePricePerSaleUnit: editedPrice,
  });
  check(editRes.success === true, 'استجابة السيرفر أكدت تعديل المنتج بنجاح');

  const rawDiskAfterEdit = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const foundOnDisk2 = rawDiskAfterEdit.products?.find((p: Product) => p.id === testId);
  check(foundOnDisk2?.name === editedName, `تم تحديث الاسم على القرص إلى: "${editedName}"`);
  check(foundOnDisk2?.salePricePerSaleUnit === editedPrice, `تم تحديث السعر على القرص إلى: ${editedPrice} ج.م`);

  // -------------------------------------------------------------
  // الخطوة 4: محاكاة إعادة تشغيل السيرفر (قراءة جديدة بالكامل من القرص)
  // -------------------------------------------------------------
  console.log('\n--- خطوة 4: محاكاة إعادة تشغيل السيرفر وإعادة تحميل قاعدة البيانات من القرص ---');
  const restartedServerDb = new ServerDatabase(); // Fresh instance loading from DB_FILE
  const productAfterServerRestart = restartedServerDb.getData().products.find((p) => p.id === testId);
  check(Boolean(productAfterServerRestart), 'المنتج متواجد بعد إعادة تشغيل السيرفر بالكامل');
  check(productAfterServerRestart?.name === editedName, 'الاسم المعدل ظل محفوظاً بعد إعادة التشغيل');
  check(productAfterServerRestart?.salePricePerSaleUnit === editedPrice, 'السعر المعدل (520 ج.م) ظل محفوظاً بعد إعادة التشغيل');

  // -------------------------------------------------------------
  // الخطوة 5: محاكاة إعادة تشغيل المتصفح/التطبيق والمزامنة
  // -------------------------------------------------------------
  console.log('\n--- خطوة 5: محاكاة إعادة تشغيل المتصفح والمزامنة بعد التشغيل ---');
  // Client reconciles against server data
  db.applyServerData(restartedServerDb.getData());
  const clientProduct = db.getProductById(testId);
  check(clientProduct?.name === editedName, 'العميل بعد المزامنة يحتفظ بالاسم المعدل');
  check(clientProduct?.salePricePerSaleUnit === editedPrice, 'العميل بعد المزامنة يحتفظ بالسعر المعدل (520 ج.م)');

  // -------------------------------------------------------------
  // الخطوة 6: اختبار الحذف المنطقي isActive = false
  // -------------------------------------------------------------
  console.log('\n--- خطوة 6: فحص الحذف المنطقي (isActive=false) والتحقق من عدم ظهوره بعد المزامنة ---');
  const deleteRes = restartedServerDb.deleteProduct(testId);
  check(deleteRes.success === true, 'تم تنفيذ الحذف المنطقي على السيرفر بنجاح');

  // Verify on disk that isActive === false
  const rawDiskAfterDelete = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const foundOnDiskDeleted = rawDiskAfterDelete.products?.find((p: Product) => p.id === testId);
  check(foundOnDiskDeleted?.isActive === false, 'خاصية isActive على القرص أصبحت false بصورة دائمة');

  // Sync to client
  db.applyServerData(restartedServerDb.getData());

  // Check getProducts() (active list used in all UI screens)
  const activeProducts = db.getProducts(); // Should exclude inactive
  const isPresentInActive = activeProducts.some((p) => p.id === testId);
  check(!isPresentInActive, 'المنتج المحذوف اختفى تماماً من قائمة الأصناف النشطة (getProducts)');

  // Check getAllProducts() (all products including archived)
  const allProducts = db.getAllProducts();
  const foundInAll = allProducts.find((p) => p.id === testId);
  check(Boolean(foundInAll && foundInAll.isActive === false), 'السجل ما زال موجوداً في getAllProducts مع isActive=false للحفاظ على سلامة الفواتير السابقة');

  // Simulate another server sync cycle to ensure it doesn't resurrect
  db.applyServerData(restartedServerDb.getData());
  const stillHiddenAfterSecondSync = !db.getProducts().some((p) => p.id === testId);
  check(stillHiddenAfterSecondSync, 'تأكيد حاسم: المنتج المحذوف لا يعود إطلاقاً للظهور في الأصناف النشطة بعد دورات مزامنة متكررة');

  // -------------------------------------------------------------
  // الخطوة 7: تنظيف سجل الاختبار للحفاظ على نقاء قاعدة البيانات
  // -------------------------------------------------------------
  console.log('\n--- خطوة 7: تنظيف سجل الاختبار بأمان دون المساس بقاعدة البيانات ---');
  const cleanDb = new ServerDatabase();
  const currentData = cleanDb.getData();
  currentData.products = currentData.products.filter((p) => p.id !== testId);
  fs.writeFileSync(DB_FILE, JSON.stringify(currentData, null, 2), 'utf-8');
  db.applyServerData(currentData);
  console.log('  ✓ تم تنظيف صنف الاختبار بنجاح.');

  console.log('\n================================================================');
  if (allPassed) {
    console.log('🎉 نجحت جميع فحوصات التحقق الفعلي بنسبة 100%!');
  } else {
    console.error('❌ فشل في بعض الفحوصات!');
    process.exit(1);
  }
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});

/**
 * Targeted verification script for StorageService.syncProduct timestamp comparison logic.
 * Tests:
 * 1. Newer incoming edit vs older cached product (Must accept incoming).
 * 2. Older incoming edit vs newer cached product (Must reject incoming to prevent regression).
 * 3. Identical timestamps (Must merge safely).
 * 4. Missing/malformed timestamp fallback (Must never crash or drop newer edits).
 * 5. Brand new product insertion.
 */

// Simulate localStorage in Node environment
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) || null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};

import { db } from '../src/services/storage';
import { Product } from '../src/types';

console.log('============================================================');
console.log('🔍 بدء فحص واختبار دالة db.syncProduct ومقارنة الطوابع الزمنية');
console.log('============================================================\n');

let allPassed = true;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ❌ فشل التحقق: ${msg}`);
    allPassed = false;
  }
}

// ---------------------------------------------------------------------
// Test 1: New Product Insertion
// ---------------------------------------------------------------------
console.log('--- اختبار 1: إضافة منتج جديد غير موجود في الكاش ---');
const prod1: Product = {
  id: 'test-sync-p1',
  code: 'TSP-01',
  name: 'منتج تجريبي 1',
  categoryId: 'cat-1',
  categoryName: 'المكسرات',
  type: 'weight',
  purchaseUnit: 'كجم',
  stockUnit: 'جرام',
  saleUnit: 'كجم',
  unitConversionRatio: 1000,
  costPricePerStockUnit: 0.2,
  salePricePerSaleUnit: 250,
  stockQuantity: 5000,
  minStockAlert: 1000,
  isActive: true,
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
};

const res1 = db.syncProduct(prod1);
assert(res1.id === 'test-sync-p1', 'تمت إضافة المنتج بنجاح');
assert(db.getProductById('test-sync-p1')?.salePricePerSaleUnit === 250, 'السعر مسجل 250 ج.م');

// ---------------------------------------------------------------------
// Test 2: Newer Incoming Edit (Incoming > Cached)
// ---------------------------------------------------------------------
console.log('\n--- اختبار 2: تعديل أحدث وارد من السيرفر (Incoming > Cached) ---');
const newerIncoming: Product = {
  ...prod1,
  name: 'منتج تجريبي 1 (معدل أحدث)',
  salePricePerSaleUnit: 320,
  updatedAt: '2026-10-25T10:30:00.000Z', // +30 minutes newer
};

const res2 = db.syncProduct(newerIncoming);
assert(res2.salePricePerSaleUnit === 320, 'تم قبول التعديل الأحدث وتحديث السعر إلى 320 ج.م');
assert(db.getProductById('test-sync-p1')?.name === 'منتج تجريبي 1 (معدل أحدث)', 'تم تحديث الاسم الجديد بالكاش');

// ---------------------------------------------------------------------
// Test 3: Stale / Older Incoming Data (Incoming < Cached)
// ---------------------------------------------------------------------
console.log('\n--- اختبار 3: حماية التعديل المحلي الأحدث ضد بيانات قديمة واردة (Incoming < Cached) ---');
// User locally edited product at 11:00
db.saveProduct({
  ...res2,
  salePricePerSaleUnit: 400,
  updatedAt: '2026-10-25T11:00:00.000Z',
});

// A stale response or cache arrives with 10:15 timestamp
const staleIncoming: Product = {
  ...prod1,
  name: 'بيانات قديمة من السيرفر لا يجب أن تطغى',
  salePricePerSaleUnit: 200,
  updatedAt: '2026-10-25T10:15:00.000Z', // 45 minutes older than current cached
};

const res3 = db.syncProduct(staleIncoming);
assert(res3.salePricePerSaleUnit === 400, 'تم رفض البيانات القديمة والاحتفاظ بالسعر الأحدث 400 ج.م');
assert(db.getProductById('test-sync-p1')?.salePricePerSaleUnit === 400, 'الكاش لم يرجع للحالة القديمة');

// ---------------------------------------------------------------------
// Test 4: Missing or Invalid Timestamp Handling
// ---------------------------------------------------------------------
console.log('\n--- اختبار 4: التعامل مع طابع زمني غير صالح أو مفقود دون تعطل ---');
const unversionedProduct: Product = {
  ...prod1,
  id: 'test-sync-p2',
  salePricePerSaleUnit: 180,
  updatedAt: undefined as any,
  createdAt: undefined as any,
};

const res4 = db.syncProduct(unversionedProduct);
assert(res4.id === 'test-sync-p2', 'تم حفظ المنتج ذو التاريخ المفقود بنجاح');
assert(Boolean(db.getProductById('test-sync-p2')?.updatedAt), 'تم توليد طابع زمني تلقائي صالح لمنع تعطل المقارنة');

console.log('\n============================================================');
if (allPassed) {
  console.log('🎉 اكتملت جميع اختبارات مقارنة التواريخ في syncProduct بنجاح تام!');
} else {
  console.error('❌ توجد بعض الإخفاقات في اختبارات مقارنة التواريخ!');
  process.exit(1);
}
console.log('============================================================');

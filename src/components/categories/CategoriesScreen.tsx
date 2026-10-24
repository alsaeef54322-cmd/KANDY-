import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  AlertCircle,
  Coffee,
} from 'lucide-react';
import { Category, Product } from '../../types';
import { db } from '../../services/storage';
import { ExportService } from '../../services/exportService';

export const CategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  const loadData = () => {
    setCategories(db.getCategories());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  // Compute products per category
  const categoriesWithStats = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id);
      const activeProductsCount = catProducts.filter((p) => p.isActive).length;
      return {
        ...cat,
        productCount: catProducts.length,
        activeProductCount: activeProductsCount,
      };
    });
  }, [categories, products]);

  const filteredCategories = useMemo(() => {
    return categoriesWithStats.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [categoriesWithStats, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormIsActive(cat.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('يرجى إدخال اسم القسم');
      return;
    }

    if (editingCategory) {
      db.saveCategory({
        ...editingCategory,
        name: formName.trim(),
        isActive: formIsActive,
      });
    } else {
      const newCategory: Category = {
        id: 'cat-' + Date.now(),
        name: formName.trim(),
        isActive: formIsActive,
      };
      db.saveCategory(newCategory);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (cat: Category) => {
    setErrorNotice(null);
    const productsInCat = products.filter((p) => p.categoryId === cat.id);
    if (productsInCat.length > 0) {
      setErrorNotice(
        `لا يمكن حذف هذا القسم لأنه يحتوي على ${productsInCat.length} منتج مسجل. قم بنقل أو حذف المنتجات أولاً.`
      );
      setTimeout(() => setErrorNotice(null), 5000);
      return;
    }

    setCatToDelete(cat);
  };

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const rows = categoriesWithStats.map((c) => ({
      'كود القسم': c.id,
      'اسم القسم': c.name,
      'الحالة': c.isActive ? 'نشط' : 'معطل',
      'عدد المنتجات': c.productCount,
      'عدد المنتجات النشطة': c.activeProductCount,
    }));
    ExportService.exportToExcel(rows, `أقسام_كاندي_${dateStr}`, 'الأقسام والتصنيفات');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-xl font-bold text-[#341B11] flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-[#8C4A26]" />
            <span>إدارة وتصنيف الأقسام</span>
          </h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            تنظيم أصناف المحمصة والمكسرات والشوكولاتة والحلويات في تصنيفات دقيقة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2B7A4B]" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>إضافة قسم جديد</span>
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <span>{errorNotice}</span>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-amber-700 hover:text-amber-900 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#EAE1D7] shadow-2xs">
          <div className="text-xs text-[#7A5E4F] font-semibold">إجمالي الأقسام</div>
          <div className="text-2xl font-bold text-[#341B11] mt-1 font-mono">
            {categories.length}
          </div>
          <div className="text-[11px] text-[#8C6F5E] mt-1">تصنيفات رئيسية معتمدة بالمحمصة</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE1D7] shadow-2xs">
          <div className="text-xs text-[#2B7A4B] font-semibold">الأقسام النشطة في البيع</div>
          <div className="text-2xl font-bold text-[#2B7A4B] mt-1 font-mono">
            {categories.filter((c) => c.isActive).length}
          </div>
          <div className="text-[11px] text-[#8C6F5E] mt-1">متاحة حالياً على شاشة الكاشير</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE1D7] shadow-2xs">
          <div className="text-xs text-[#8C4A26] font-semibold">إجمالي الأصناف المصنفة</div>
          <div className="text-2xl font-bold text-[#8C4A26] mt-1 font-mono">
            {products.length}
          </div>
          <div className="text-[11px] text-[#8C6F5E] mt-1">منتج موزع عبر الأقسام المختلفة</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-[#EAE1D7] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم القسم..."
            className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#E4D7C8] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E]"
          />
        </div>
        <div className="text-xs text-[#8C6F5E]">
          عرض <span className="font-bold text-[#341B11]">{filteredCategories.length}</span> من أصل{' '}
          <span className="font-bold text-[#341B11]">{categories.length}</span> قسم
        </div>
      </div>

      {/* Categories Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl border border-[#EAE1D7] p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F6EFE6] border border-[#D9C6B2] text-[#8C4A26] flex items-center justify-center font-bold">
                    <Coffee className="w-5 h-5 text-[#8C4A26]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#341B11]">{cat.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#2B7A4B] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>نشط ومعتمد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>معطل مؤقتاً</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(cat)}
                    title="تعديل القسم"
                    className="p-1.5 text-[#6B5345] hover:text-[#341B11] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    title="حذف القسم"
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-4 pt-3 border-t border-[#F2ECE4] flex items-center justify-between text-xs">
                <span className="text-[#7A5E4F] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#8C4A26]" />
                  <span>المنتجات المرتبطة بالقسم:</span>
                </span>
                <span className="font-bold text-[#341B11] bg-[#FAF7F2] px-2.5 py-1 rounded-md border border-[#E8DC CE] font-mono">
                  {cat.productCount} منتج
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-[#D9C6B2] p-8 text-center text-[#7A5E4F]">
            لا توجد أقسام مطابقة للبحث الحالي.
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#D9C6B2] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#341B11] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCategory ? 'تعديل بيانات القسم' : 'إضافة قسم جديد للمحمصة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#C7B2A3] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4A2613] mb-1">
                  اسم القسم <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: مكسرات فاخرة محامص، شوكولاتة بلجيكية..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#D9C6B2] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E]"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#542E1D] focus:ring-[#542E1D]"
                />
                <label htmlFor="catActive" className="text-xs text-[#341B11] font-semibold select-none cursor-pointer">
                  تفعيل القسم وإتاحته على شاشة الكاشير والمبيعات
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EDE2D4]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B5345] hover:bg-[#FAF7F2] rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg shadow-xs"
                >
                  {editingCategory ? 'حفظ التعديلات' : 'إضافة القسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category In-App Confirmation Modal */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-rose-200 overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-rose-800 font-bold text-sm">
              <FolderTree className="w-4 h-4 text-rose-600" />
              <span>تأكيد حذف القسم</span>
            </div>
            <div className="p-4 text-xs text-[#542E1D]">
              هل أنت متأكد من حذف قسم <strong className="text-[#341B11]">"{catToDelete.name}"</strong> نهائياً من قاعدة البيانات؟
            </div>
            <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE1D7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-[#DAC8B6] text-xs font-semibold text-[#542E1D] hover:bg-white cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  db.deleteCategory(catToDelete.id);
                  setCatToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                نعم، تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

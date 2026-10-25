import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,

  X,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Product, Category } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ExportService } from '../../services/exportService';

export const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'low'>('all');

  // Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form State for Product
  const [prodForm, setProdForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    type: 'weight' as 'weight' | 'piece' | 'package',
    purchaseUnit: 'كجم',
    stockUnit: 'جرام',
    saleUnit: 'كجم',
    unitConversionRatio: 1000,
    costPerKgOrUnit: 300, // EGP per kg or per unit
    salePrice: 400,
    stockQuantityDisplay: 10, // e.g. 10 kg or 10 pieces
    minStockAlertDisplay: 3,
    barcode: '',
    notes: '',
  });

  // Form State for Category
  const [catName, setCatName] = useState('');

  const loadData = () => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return () => unsub();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));

      const isLow = p.stockQuantity <= p.minStockAlert;
      let matchStatus = true;
      if (statusFilter === 'available') matchStatus = !isLow && p.stockQuantity > 0;
      if (statusFilter === 'low') matchStatus = isLow;
const isActive = p.isActive !== false;

return isActive && matchCat && matchSearch && matchStatus;
    });
  }, [products, selectedCategory, searchQuery, statusFilter]);

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdForm({
      code: 'PRD-' + (products.length + 1).toString().padStart(3, '0'),
      name: '',
      categoryId: categories[0]?.id || '',
      type: 'weight',
      purchaseUnit: 'كجم',
      stockUnit: 'جرام',
      saleUnit: 'كجم',
      unitConversionRatio: 1000,
      costPerKgOrUnit: 300,
      salePrice: 400,
      stockQuantityDisplay: 10,
      minStockAlertDisplay: 3,
      barcode: '',
      notes: '',
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    const isWeight = product.type === 'weight';
    setProdForm({
      code: product.code,
      name: product.name,
      categoryId: product.categoryId,
      type: product.type,
      purchaseUnit: product.purchaseUnit,
      stockUnit: product.stockUnit,
      saleUnit: product.saleUnit,
      unitConversionRatio: product.unitConversionRatio,
      costPerKgOrUnit: isWeight ? product.costPricePerStockUnit * 1000 : product.costPricePerStockUnit,
      salePrice: product.salePricePerSaleUnit,
      stockQuantityDisplay: isWeight ? product.stockQuantity / 1000 : product.stockQuantity,
      minStockAlertDisplay: isWeight ? product.minStockAlert / 1000 : product.minStockAlert,
      barcode: product.barcode || '',
      notes: product.notes || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === prodForm.categoryId);
    const isWeight = prodForm.type === 'weight';

    const costPricePerStockUnit = isWeight ? prodForm.costPerKgOrUnit / 1000 : prodForm.costPerKgOrUnit;
    const stockQuantityInBase = isWeight ? Math.round(prodForm.stockQuantityDisplay * 1000) : prodForm.stockQuantityDisplay;
    const minStockAlertInBase = isWeight ? Math.round(prodForm.minStockAlertDisplay * 1000) : prodForm.minStockAlertDisplay;

    const productData: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      code: prodForm.code,
      name: prodForm.name,
      categoryId: prodForm.categoryId,
      categoryName: cat?.name || 'عام',
      type: prodForm.type,
      purchaseUnit: prodForm.purchaseUnit,
      stockUnit: prodForm.stockUnit,
      saleUnit: prodForm.saleUnit,
      unitConversionRatio: prodForm.unitConversionRatio,
      costPricePerStockUnit,
      salePricePerSaleUnit: Number(prodForm.salePrice),
      stockQuantity: stockQuantityInBase,
      minStockAlert: minStockAlertInBase,
      barcode: prodForm.barcode,
      notes: prodForm.notes,
      isActive: true,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveProduct(productData);
    setIsProductModalOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: catName.trim(),
      itemCount: 0,
      isActive: true,
    };
    db.saveCategory(newCat);
    setCatName('');
    setIsCategoryModalOpen(false);
  };

  const handleExportExcel = () => {
    const exportRows = filteredProducts.map((p) => ({
      'كود الصنف': p.code,
      'اسم الصنف': p.name,
      'القسم': p.categoryName,
      'النوع': p.type === 'weight' ? 'موزون (كجم/جرام)' : 'بالقطعة/العبوة',
      'سعر البيع (ج.م)': p.salePricePerSaleUnit,
      'سعر التكلفة (ج.م)': p.type === 'weight' ? p.costPricePerStockUnit * 1000 : p.costPricePerStockUnit,
      'الكمية المتاحة بالمخزون': p.type === 'weight' ? `${p.stockQuantity / 1000} كجم` : `${p.stockQuantity} ${p.stockUnit}`,
      'حد التنبيه': p.type === 'weight' ? `${p.minStockAlert / 1000} كجم` : p.minStockAlert,
      'الحالة': p.stockQuantity <= p.minStockAlert ? 'منخفض' : 'متوفر',
      'الباركود': p.barcode || '-',
    }));
    ExportService.exportToExcel(exportRows, `كتالوج_منتجات_كاندي_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#FAF7F2]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-[#E8DCCE]">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#341B11]">دليل وأصناف المنتجات</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            إدارة كتالوج المحمصة، المكسرات، الشوكولاتة، الأسعار، ووحدات القياس الدقيقة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 sm:px-3.5 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#2B7A4B] border border-[#C2DEC8] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير</span>
            <span>Excel</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-[#F5ECE1] text-[#542E1D] border border-[#DAC8B6] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ قسم</span>
          </button>
          <button
            onClick={openAddProductModal}
            className="px-3.5 sm:px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FDE68A]" />
            <span>+ صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Category Cards Showcase */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = products.filter((p) => p.categoryId === cat.id).length;

          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer text-center group flex flex-col items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-[#542E1D] text-white border-[#542E1D] shadow-sm'
                  : 'bg-white text-[#341B11] border-[#E6D9CC] hover:border-[#542E1D]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF3EC] text-[#542E1D] group-hover:bg-[#542E1D] group-hover:text-white'
                }`}
              >
                {cat.name.slice(0, 2)}
              </div>
              <div className="font-bold text-xs truncate max-w-full">{cat.name}</div>
              <div className={`text-[10px] ${isSelected ? 'text-[#FDE68A]' : 'text-[#8C7A6D]'}`}>
                {count} صنف
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E6D9CC] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الكود، أو الباركود..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs p-1.5 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg text-[#542E1D] font-medium"
          >
            <option value="all">جميع الحالات</option>
            <option value="available">متوفر فقط</option>
            <option value="low">منخفض المخزون</option>
          </select>
        </div>

        <div className="text-xs text-[#7A5E4F] font-semibold">
          عرض {filteredProducts.length} من أصل {products.length} صنف
        </div>
      </div>

      {/* Products Table (matching mockup) */}
      <div className="bg-white rounded-xl border border-[#E6D9CC] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] border-b border-[#E6D9CC] text-[#6B5345] font-semibold">
              <tr>
                <th className="py-3 px-4">الصورة</th>
                <th className="py-3 px-4">اسم المنتج</th>
                <th className="py-3 px-4">القسم</th>
                <th className="py-3 px-4">السعر (ج.م)</th>
                <th className="py-3 px-4">التكلفة (ج.م)</th>
                <th className="py-3 px-4">الكمية بالمخزون</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0;
                const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert;
                const isNear = p.stockQuantity > p.minStockAlert && p.stockQuantity <= p.minStockAlert * 1.3;

                let rowBgClass = 'hover:bg-[#FAF6F2] transition-colors';
                if (isOutOfStock) {
                  rowBgClass = 'bg-rose-100/90 hover:bg-rose-200/80 border-r-4 border-r-rose-600';
                } else if (isLow) {
                  rowBgClass = 'bg-amber-100/90 hover:bg-amber-200/80 border-r-4 border-r-amber-500';
                } else if (isNear) {
                  rowBgClass = 'bg-yellow-50/90 hover:bg-yellow-100/80 border-r-4 border-r-yellow-400';
                }

                const costDisplay =
                  p.type === 'weight'
                    ? (p.costPricePerStockUnit * 1000).toFixed(2)
                    : p.costPricePerStockUnit.toFixed(2);

                const stockDisplay =
                  p.type === 'weight'
                    ? `${(p.stockQuantity / 1000).toFixed(3)} كجم`
                    : `${p.stockQuantity} ${p.stockUnit}`;

                return (
                  <tr key={p.id} className={rowBgClass}>
                    <td className="py-2.5 px-4">
                      <div className="w-9 h-9 rounded-lg bg-[#F5ECE1] text-[#542E1D] flex items-center justify-center font-bold text-xs border border-[#E0D2C3]">
                        {p.name.slice(0, 2)}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-[#2B170E] flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {isOutOfStock && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />}
                      </div>
                      <div className="text-[10px] text-[#8C7A6D] font-mono mt-0.5">{p.code}</div>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#6B5345]">{p.categoryName}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#542E1D]">
                      {p.salePricePerSaleUnit.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-[#8C7A6D]">/{p.saleUnit}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#7A5E4F]">
                      {costDisplay}{' '}
                      <span className="text-[10px] font-normal text-[#8C7A6D]">/{p.saleUnit}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      <span className={isOutOfStock ? 'text-rose-700 font-extrabold text-sm' : isLow ? 'text-amber-900 font-bold' : 'text-[#2B170E]'}>
                        {stockDisplay}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-rose-700 px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                          <span>نفد بالكامل (0)</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 text-amber-800" />
                          <span>دون الحد الأدنى</span>
                        </span>
                      ) : isNear ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-900 bg-yellow-200/80 border border-yellow-300 px-2 py-0.5 rounded-md">
                          <span>قارب على النفاد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2B7A4B] bg-[#EDF8F1] border border-[#BDE3CB] px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3 text-[#2B7A4B]" />
                          <span>متوفر</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditProductModal(p)}
                          title="تعديل السعر والبيانات"
                          className="p-1.5 text-[#542E1D] hover:bg-[#F3ECE2] rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(p)}
                          title="تعطيل أو حذف المنتج"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#D5C2B0] animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-[#341B11]">
                {editingProduct ? `تعديل صنف: ${editingProduct.name}` : 'إضافة صنف جديد لمحمصة كاندي'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    اسم المنتج *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    placeholder="مثال: كاجو جامبو محمص"
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    كود الصنف الفريد *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodForm.code}
                    onChange={(e) => setProdForm({ ...prodForm, code: e.target.value })}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    القسم *
                  </label>
                  <select
                    value={prodForm.categoryId}
                    onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                    نوع المنتج *
                  </label>
                  <select
                    value={prodForm.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setProdForm({
                        ...prodForm,
                        type: t,
                        purchaseUnit: t === 'weight' ? 'كجم' : t === 'package' ? 'كرتونة' : 'قطعة',
                        saleUnit: t === 'weight' ? 'كجم' : t === 'package' ? 'علبة' : 'قطعة',
                        stockUnit: t === 'weight' ? 'جرام' : t === 'package' ? 'عبوة' : 'قطعة',
                        unitConversionRatio: t === 'weight' ? 1000 : 12,
                      });
                    }}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                  >
                    <option value="weight">موزون (بالجرام والكيلو)</option>
                    <option value="package">معبأ بالعلبة / كرتونة</option>
                    <option value="piece">بالقطعة المفردة</option>
                  </select>
                </div>
              </div>

              {/* Units & Pricing */}
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EDE2D4] space-y-2">
                <div className="text-[11px] font-bold text-[#542E1D]">
                  {prodForm.type === 'weight'
                    ? 'الأسعار لوحدة الكيلوجرام (يتم حفظ الجرام آلياً بدقة):'
                    : 'الأسعار ووحدات القياس:'}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">
                      سعر الشراء / التكلفة ({prodForm.type === 'weight' ? 'للكيلو ج.م' : 'للقطعة ج.م'})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={prodForm.costPerKgOrUnit}
                      onChange={(e) => setProdForm({ ...prodForm, costPerKgOrUnit: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-[#DAC8B6] rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">
                      سعر البيع للجمهور ({prodForm.type === 'weight' ? 'للكيلو ج.م' : 'للقطعة ج.م'})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={prodForm.salePrice}
                      onChange={(e) => setProdForm({ ...prodForm, salePrice: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-[#DAC8B6] rounded-lg font-mono font-bold text-[#2B7A4B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">
                      الكمية الابتدائية بالمخزون ({prodForm.saleUnit})
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      required
                      value={prodForm.stockQuantityDisplay}
                      onChange={(e) => setProdForm({ ...prodForm, stockQuantityDisplay: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-[#DAC8B6] rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6B5345] mb-0.5">
                      حد تنبيه النواقص ({prodForm.saleUnit})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={prodForm.minStockAlertDisplay}
                      onChange={(e) => setProdForm({ ...prodForm, minStockAlertDisplay: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-[#DAC8B6] rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  الباركود (اختياري)
                </label>
                <input
                  type="text"
                  value={prodForm.barcode}
                  onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })}
                  placeholder="622100..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#542E1D] mb-1">
                  ملاحظات أو مواصفات خاصة
                </label>
                <textarea
                  rows={2}
                  value={prodForm.notes}
                  onChange={(e) => setProdForm({ ...prodForm, notes: e.target.value })}
                  placeholder="درجة التحميص، بلد المنشأ..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-[#EAE1D7] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#DAC8B6] rounded-lg text-[#542E1D] font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-[#DAC8B6] space-y-4">
            <h3 className="text-sm font-bold text-[#341B11]">إضافة قسم أصناف جديد</h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#542E1D] mb-1">
                  اسم القسم
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="مثال: حبوب وبن أخضر"
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DAC8B6] rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#542E1D] text-white rounded-lg text-xs font-bold"
                >
                  إضافة القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-rose-200 overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-rose-800 font-bold text-sm">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>تأكيد تعطيل / حذف المنتج</span>
            </div>
            <div className="p-4 text-xs text-[#542E1D]">
              هل أنت متأكد من رغبتك في تعطيل أو إزالة المنتج <strong className="text-[#341B11]">"{productToDelete.name}"</strong> من قائمة المنتجات النشطة؟
            </div>
            <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE1D7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-[#DAC8B6] text-xs font-semibold text-[#542E1D] hover:bg-white cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  db.deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                نعم، تعطيل المنتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

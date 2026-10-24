import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  Clock,
  UserCheck,
  AlertCircle,
  Barcode,
  Camera,
  Layers,
  PauseCircle,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, Category, Customer, SaleItem, SaleInvoice, UserSession } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { ReceiptModal } from '../common/ReceiptModal';
import { toast } from '../common/Toast';

interface POSScreenProps {
  session: UserSession;
}

export const POSScreen: React.FC<POSScreenProps> = ({ session }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'debt'>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidInput, setPaidInput] = useState<string>('');
  const [activeSelectedProduct, setActiveSelectedProduct] = useState<Product | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Quick weight helper for active item
  const [customWeight, setCustomWeight] = useState<number>(0.25); // in kg or unit

  // Barcode / Scanner
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);

  // Suspended Cart
  const [suspendedCarts, setSuspendedCarts] = useState<{ id: string; time: string; items: SaleItem[] }[]>([]);

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<SaleInvoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  const loadData = () => {
    setCategories(db.getCategories());
    setProducts(db.getProducts().filter((p) => p.isActive));
    setCustomers(db.getCustomers().filter((c) => c.status === 'active'));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  // Set default active product if none selected
  useEffect(() => {
    if (!activeSelectedProduct && products.length > 0) {
      setActiveSelectedProduct(products[0]);
    }
  }, [products, activeSelectedProduct]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Subtotal & Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discountAmount) || 0));
  }, [subtotal, discountAmount]);

  const paidAmount = useMemo(() => {
    if (paymentMethod === 'debt') return 0;
    if (!paidInput) return grandTotal;
    return Number(paidInput) || 0;
  }, [paymentMethod, paidInput, grandTotal]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  // Next invoice number
  const nextInvoiceNumber = useMemo(() => {
    const sales = db.getSales();
    const num = sales.length + 126;
    return String(num).padStart(6, '0');
  }, [completedSale]);

  // Add active product to cart with chosen weight / quantity
  const handleAddToCart = (product: Product, quantityChosen: number = customWeight) => {
    setErrorMessage(null);
    if (quantityChosen <= 0) return;

    let stockNeededInBase = quantityChosen;
    if (product.type === 'weight') {
      stockNeededInBase = Math.round(quantityChosen * 1000); // convert kg to grams
    }

    // Check stock
    const existingInCart = cart.find((i) => i.productId === product.id);
    const totalDeductedAlready = existingInCart ? existingInCart.stockQuantityDeducted : 0;

    if (totalDeductedAlready + stockNeededInBase > product.stockQuantity) {
      const availableDisplay =
        product.type === 'weight'
          ? `${(product.stockQuantity / 1000).toFixed(3)} كجم`
          : `${product.stockQuantity} ${product.stockUnit}`;
      setErrorMessage(`الكمية المطلوبة تتجاوز المخزون المتاح! المتاح حالياً: ${availableDisplay}`);
      return;
    }

    const unitPrice = product.salePricePerSaleUnit;
    const itemSubtotal = quantityChosen * unitPrice;

    setCart((prevCart) => {
      const idx = prevCart.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const updated = [...prevCart];
        const newQty = updated[idx].quantity + quantityChosen;
        const newStockDeducted = updated[idx].stockQuantityDeducted + stockNeededInBase;
        updated[idx] = {
          ...updated[idx],
          quantity: Math.round(newQty * 1000) / 1000,
          stockQuantityDeducted: newStockDeducted,
          subtotal: Math.round(newQty * unitPrice * 100) / 100,
          total: Math.round(newQty * unitPrice * 100) / 100,
        };
        return updated;
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          productType: product.type,
          quantity: Math.round(quantityChosen * 1000) / 1000,
          stockQuantityDeducted: stockNeededInBase,
          unitName: product.saleUnit,
          unitPrice,
          costPrice: 0, // computed inside storage.ts at actual batch cost
          subtotal: Math.round(itemSubtotal * 100) / 100,
          discount: 0,
          total: Math.round(itemSubtotal * 100) / 100,
        };
        return [...prevCart, newItem];
      }
    });

    // Provide subtle tactile visual confirmation on addition
    setRecentlyAddedId(product.id);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === product.id ? null : curr));
    }, 600);
  };

  const updateCartItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const stockNeeded = product.type === 'weight' ? Math.round(newQty * 1000) : newQty;
    if (stockNeeded > product.stockQuantity) {
      setErrorMessage(`لا يتوفر مخزون كافٍ لهذا التعديل! المتاح: ${product.stockQuantity / 1000} كجم`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const total = Math.round(newQty * item.unitPrice * 100) / 100;
          return {
            ...item,
            quantity: newQty,
            stockQuantityDeducted: stockNeeded,
            subtotal: total,
            total,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => p.barcode === barcodeInput.trim() || p.code.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      setActiveSelectedProduct(matched);
      const defaultQty = matched.type === 'weight' ? 0.25 : 1;
      handleAddToCart(matched, defaultQty);
      setBarcodeInput('');
    } else {
      setErrorMessage(`لم يتم العثور على صنف بالباركود: ${barcodeInput}`);
    }
  };

  // Hold current cart
  const handleSuspendCart = () => {
    if (cart.length === 0) return;
    setSuspendedCarts((prev) => [
      ...prev,
      {
        id: 'susp-' + Date.now(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        items: [...cart],
      },
    ]);
    setCart([]);
    setDiscountAmount(0);
    setPaidInput('');
    toast.info('تم تعليق الفاتورة بنجاح. يمكنك استرجاعها من الشريط العلوي.');
  };

  const handleResumeCart = (suspId: string) => {
    const target = suspendedCarts.find((s) => s.id === suspId);
    if (!target) return;
    setCart(target.items);
    setSuspendedCarts((prev) => prev.filter((s) => s.id !== suspId));
    toast.info('تم استعادة الفاتورة المعلقة إلى شاشة البيع');
  };

  // Complete and Print Sale
  const handleCheckout = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    if (cart.length === 0) {
      setErrorMessage('سلة البيع فارغة! اختر منتجاً واحداً على الأقل.');
      return;
    }

    if (paymentMethod === 'debt' && !selectedCustomerId) {
      setErrorMessage('يجب تحديد العميل في حالة البيع الآجل لتسجيل المديونية.');
      return;
    }

    const customerObj = customers.find((c) => c.id === selectedCustomerId);

    setIsSubmitting(true);
    try {
      const sale = db.recordSale({
        invoiceNumber: nextInvoiceNumber,
        date: new Date().toISOString().split('T')[0],
        customerId: customerObj?.id,
        customerName: customerObj?.name,
        items: cart,
        subtotal,
        discount: Number(discountAmount) || 0,
        tax: 0,
        total: grandTotal,
        paidAmount,
        remainingAmount,
        paymentMethod,
        status: remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'debt',
        cashierName: session.name,
      });

      // Confetti celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      setCompletedSale(sale);
      setCart([]);
      setDiscountAmount(0);
      setPaidInput('');
      setSelectedCustomerId('');
      toast.success(`تم تسجيل وحفظ الفاتورة #${sale.invoiceNumber} بنجاح!`);
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء اعتماد الفاتورة: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden select-none">
      {/* Top Invoice Header Bar */}
      <div className="h-13 bg-white border-b border-[#E8DC CE] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A5E4F] font-semibold">فاتورة كاشير:</span>
            <span className="text-sm font-mono font-bold text-[#542E1D] bg-[#F5ECE2] px-2.5 py-0.5 rounded-md border border-[#E0D2C3]">
              #{nextInvoiceNumber}
            </span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="text-xs text-[#6B5345]">
            الكاشير: <strong className="text-[#341B11]">{session.name}</strong>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          {suspendedCarts.length > 0 && (
            <div className="flex items-center gap-1.5">
              {suspendedCarts.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => handleResumeCart(sc.id)}
                  className="px-2.5 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md font-medium border border-amber-300 flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>معلقة ({sc.time})</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleSuspendCart}
            disabled={cart.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-[#542E1D] bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#DAC8B6] rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>تعليق الفاتورة</span>
          </button>

          <button
            onClick={() => {
              if (cart.length > 0) setShowClearCartModal(true);
            }}
            disabled={cart.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إلغاء</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            ×
          </button>
        </div>
      )}

      {/* Main Split: Left Side (Products & Quick Weight) | Right Side (Cart & Payment) */}
      <div className="flex-1 flex overflow-hidden">
        {/* RIGHT PANEL: CART & CHECKOUT (RTL means right is primary for Arabic) */}
        <div className="w-[420px] bg-white border-l border-[#EAE1D7] flex flex-col justify-between shrink-0 shadow-xs">
          {/* Cart Header */}
          <div className="p-3 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between">
            <span className="text-xs font-bold text-[#341B11]">
              عناصر الفاتورة ({cart.length})
            </span>
            <span className="text-xs text-[#8C6F5E]">
              {cart.reduce((acc, i) => acc + (i.productType === 'weight' ? 1 : i.quantity), 0)} صنف
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F0E6DC] p-2 space-y-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A68F80]">
                <Layers className="w-12 h-12 text-[#DAC8B6] mb-3 stroke-[1.2]" />
                <p className="text-xs font-semibold text-[#542E1D]">سلة المبيعات فارغة</p>
                <p className="text-[11px] text-[#8C7A6D] mt-1 max-w-[200px]">
                  اختر منتجاً من القائمة أو حدد الوزن وأضفه مباشرة للفاتورة
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const isJustAdded = recentlyAddedId === item.productId;
                return (
                  <div
                    key={item.productId}
                    className={`p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between gap-2 ${
                      isJustAdded
                        ? 'bg-[#FAF3E8] border-[#C28B38] ring-1 ring-[#C28B38]/40 animate-cart-item-added'
                        : 'bg-[#FCFAF8] hover:bg-[#F8F2EC] border-[#EFE5DB]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#2B170E] truncate">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-[#7A6354] flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{item.unitPrice} ج.م / {item.unitName}</span>
                        <span>×</span>
                        <strong className="text-[#341B11] font-mono">
                          {item.productType === 'weight'
                            ? `${item.quantity} كجم`
                            : `${item.quantity} ${item.unitName}`}
                        </strong>
                      </div>
                    </div>

                    {/* Quantity Stepper & Price */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-[#DAC8B6] rounded-md overflow-hidden bg-white shadow-2xs">
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.productId,
                              item.productType === 'weight'
                                ? Math.max(0, item.quantity - 0.25)
                                : item.quantity - 1
                            )
                          }
                          className="p-1 hover:bg-[#F3ECE2] text-[#542E1D] btn-tactile cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 text-xs font-mono font-bold min-w-[36px] text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.productId,
                              item.productType === 'weight'
                                ? item.quantity + 0.25
                                : item.quantity + 1
                            )
                          }
                          className="p-1 hover:bg-[#F3ECE2] text-[#542E1D] btn-tactile cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-left w-16">
                        <span className="text-xs font-bold font-mono text-[#2B170E] tabular-nums">
                          {item.total.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-[#A68F80] hover:text-rose-600 rounded hover:bg-rose-50 transition-colors btn-tactile cursor-pointer"
                        title="حذف من الفاتورة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Payment & Totals Summary Panel */}
          <div className="p-3.5 bg-[#FAF7F2] border-t border-[#EAE1D7] space-y-2.5">
            {/* Customer Selector & Discount */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-[#6B5345] mb-0.5">
                  العميل (اختياري / آجل)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs p-1.5 bg-white border border-[#DAC8B6] rounded-md focus:border-[#542E1D]"
                >
                  <option value="">عميل نقدي عام</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.balanceDue > 0 ? `(مدين: ${c.balanceDue} ج.م)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#6B5345] mb-0.5">
                  خصم إضافي (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xs p-1.5 bg-white border border-[#DAC8B6] rounded-md font-mono"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-semibold text-[#6B5345] mb-1">
                طريقة الدفع
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#542E1D] text-white shadow-xs'
                      : 'bg-white border border-[#DAC8B6] text-[#6B5345] hover:bg-[#F3ECE2]'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>نقدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#542E1D] text-white shadow-xs'
                      : 'bg-white border border-[#DAC8B6] text-[#6B5345] hover:bg-[#F3ECE2]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>بطاقة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('debt')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    paymentMethod === 'debt'
                      ? 'bg-[#8C4A26] text-white shadow-xs'
                      : 'bg-white border border-[#DAC8B6] text-[#6B5345] hover:bg-[#F3ECE2]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>آجل</span>
                </button>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-white p-2.5 rounded-lg border border-[#E6D9CC] space-y-1 text-xs">
              <div className="flex justify-between text-[#6B5345]">
                <span>الإجمالي الفرعي:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم:</span>
                  <span className="font-mono">- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#2B170E] pt-1 border-t border-[#EAE1D7]">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-base text-[#2B7A4B]">{formatCurrency(grandTotal)}</span>
              </div>

              {paymentMethod !== 'debt' && (
                <div className="pt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#6B5345]">المدفوع نقداً:</span>
                  <input
                    type="number"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    placeholder={grandTotal.toFixed(2)}
                    className="w-24 p-1 text-xs text-left bg-[#FAF7F2] border border-[#DAC8B6] rounded font-mono font-bold"
                  />
                </div>
              )}

              {paymentMethod !== 'debt' && paidAmount > grandTotal && (
                <div className="flex justify-between text-[11px] text-[#2B7A4B] font-bold">
                  <span>الباقي للعميل:</span>
                  <span className="font-mono">
                    {formatCurrency(paidAmount - grandTotal)}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-[#542E1D] to-[#3B1E12] hover:from-[#6A3B25] hover:to-[#4D2717] text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer btn-tactile"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-[#FDE68A] rounded-full animate-spin" />
                  <span>جاري اعتماد وحفظ الفاتورة...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-[#FDE68A]" />
                  <span>حفظ واعتماد الفاتورة (طباعة إيصال)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* LEFT PANEL: PRODUCT CATALOG, CATEGORIES & WEIGHT CONTROLS */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
          {/* Top Barcode & Search Controls */}
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#E8DC CE] shadow-2xs">
            {/* Barcode input */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5 flex-1">
              <Barcode className="w-4 h-4 text-[#8C6F5E] shrink-0" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="مسح باركود المنتج أو الكود الداخلي..."
                className="w-full text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#542E1D] font-mono"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-[#542E1D] text-white text-xs rounded-md font-semibold shrink-0"
              >
                إضافة
              </button>
            </form>

            {/* Camera Barcode Scanner Simulator/Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsScanningCamera(!isScanningCamera);
                if (!isScanningCamera) {
                  setToastMessage('ميزة قارئ الكاميرا جاهزة للعمل عند توفر كاميرا الويب وموافقة النظام.');
                  setTimeout(() => setToastMessage(null), 3500);
                }
              }}
              title="مسح بواسطة كاميرا الجهاز"
              className={`p-1.5 rounded-md border text-xs flex items-center gap-1 cursor-pointer ${
                isScanningCamera
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-[#FAF7F2] text-[#6B5345] border-[#DAC8B6] hover:bg-[#F3ECE2]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">كاميرا</span>
            </button>

            {/* General Filter Search */}
            <div className="relative w-48 hidden md:block">
              <Search className="w-3.5 h-3.5 text-[#8C6F5E] absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="تصفية بالاسم..."
                className="w-full pl-2 pr-7 py-1 text-xs bg-[#FAF7F2] border border-[#DAC8B6] rounded-md"
              />
            </div>
          </div>

          {/* Category Tabs (Segmented filter buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-[#542E1D] text-white shadow-xs'
                  : 'bg-white text-[#6B5345] hover:bg-[#F3ECE2] border border-[#E0D2C3]'
              }`}
            >
              جميع الأقسام ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#542E1D] text-white shadow-xs'
                    : 'bg-white text-[#6B5345] hover:bg-[#F3ECE2] border border-[#E0D2C3]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Active Product & Weight Selector Banner (Direct from mockup) */}
          {activeSelectedProduct && (
            <div className="bg-gradient-to-r from-[#FAF3EC] to-[#F5ECE1] p-3.5 rounded-xl border border-[#D9C4B0] flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#542E1D] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {activeSelectedProduct.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2B170E]">{activeSelectedProduct.name}</h3>
                  <div className="flex items-center gap-3 text-xs mt-0.5">
                    <span className="text-[#542E1D] font-bold">
                      {activeSelectedProduct.salePricePerSaleUnit} ج.م / {activeSelectedProduct.saleUnit}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-[#2B7A4B] font-semibold">
                      المخزون المتاح:{' '}
                      {activeSelectedProduct.type === 'weight'
                        ? `${(activeSelectedProduct.stockQuantity / 1000).toFixed(3)} كجم`
                        : `${activeSelectedProduct.stockQuantity} ${activeSelectedProduct.stockUnit}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight or Quantity Selector */}
              <div className="flex items-center gap-2">
                {activeSelectedProduct.type === 'weight' ? (
                  <>
                    <span className="text-xs text-[#6B5345] font-semibold">الوزن (كجم):</span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#DAC8B6]">
                      {[
                        { label: '0.25 (ربع)', val: 0.25 },
                        { label: '0.5 (نصف)', val: 0.5 },
                        { label: '0.75', val: 0.75 },
                        { label: '1.0 (كيلو)', val: 1.0 },
                      ].map((w) => (
                        <button
                          key={w.val}
                          type="button"
                          onClick={() => setCustomWeight(w.val)}
                          className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                            customWeight === w.val
                              ? 'bg-[#542E1D] text-white shadow-xs'
                              : 'text-[#6B5345] hover:bg-[#F3ECE2]'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom weight input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        value={customWeight}
                        onChange={(e) => setCustomWeight(Number(e.target.value) || 0.25)}
                        className="w-18 p-1 text-xs bg-white border border-[#DAC8B6] rounded-md font-mono text-center font-bold"
                      />
                      <span className="text-[11px] text-[#6B5345]">كجم</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6B5345] font-semibold">الكمية ({activeSelectedProduct.saleUnit}):</span>
                    <div className="flex items-center border border-[#DAC8B6] rounded-md overflow-hidden bg-white">
                      <button
                        onClick={() => setCustomWeight((prev) => Math.max(1, prev - 1))}
                        className="p-1 hover:bg-[#F3ECE2]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={customWeight}
                        onChange={(e) => setCustomWeight(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center text-xs font-mono font-bold border-none"
                      />
                      <button
                        onClick={() => setCustomWeight((prev) => prev + 1)}
                        className="p-1 hover:bg-[#F3ECE2]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct Add Button */}
                <button
                  type="button"
                  onClick={() => handleAddToCart(activeSelectedProduct, customWeight)}
                  className="px-4 py-1.5 bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة للفاتورة</span>
                </button>
              </div>
            </div>
          )}

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pr-1">
            {filteredProducts.map((product) => {
              const isSelected = activeSelectedProduct?.id === product.id;
              const isLow = product.stockQuantity <= product.minStockAlert;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setActiveSelectedProduct(product);
                    setCustomWeight(product.type === 'weight' ? 0.25 : 1);
                  }}
                  className={`bg-white rounded-xl p-3 border transition-all duration-150 cursor-pointer flex flex-col justify-between group card-tactile btn-tactile ${
                    isSelected
                      ? 'border-[#542E1D] ring-2 ring-[#542E1D]/20 bg-[#FAF6F2]'
                      : 'border-[#E6D9CC] hover:border-[#C4AD9A]'
                  }`}
                >
                  <div>
                    {/* Badge and Code */}
                    <div className="flex items-center justify-between text-[10px] text-[#8C7A6D] mb-1.5">
                      <span className="font-mono">{product.code}</span>
                      {isLow && (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-1 rounded animate-badge-pop">
                          منخفض
                        </span>
                      )}
                    </div>

                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[#EFE4D8] text-[#542E1D] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#542E1D] group-hover:text-white transition-colors duration-150">
                        {product.name.slice(0, 1)}
                      </div>
                      <h4 className="text-xs font-bold text-[#2B170E] line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                    </div>
                  </div>

                  {/* Price & Stock info */}
                  <div className="pt-2 border-t border-[#F0E6DC] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-[#542E1D]">
                        {product.salePricePerSaleUnit}{' '}
                        <span className="text-[10px] font-normal text-[#7A6354]">
                          ج.م/{product.saleUnit}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        {product.type === 'weight'
                          ? `${(product.stockQuantity / 1000).toFixed(2)} كجم`
                          : `${product.stockQuantity} ${product.stockUnit}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSelectedProduct(product);
                        handleAddToCart(product, product.type === 'weight' ? 0.25 : 1);
                      }}
                      title="إضافة سريعة"
                      className="p-1.5 rounded-lg bg-[#F5ECE1] text-[#542E1D] hover:bg-[#542E1D] hover:text-white transition-all duration-150 btn-tactile cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {completedSale && (
        <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-rose-200 overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-rose-800 font-bold text-sm">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>إفراغ سلة البيع</span>
            </div>
            <div className="p-4 text-xs text-[#542E1D]">
              هل أنت متأكد من رغبتك في إفراغ كافة الأصناف الحالية من سلة البيع؟
            </div>
            <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE1D7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearCartModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#DAC8B6] text-xs font-semibold text-[#542E1D] hover:bg-white cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setShowClearCartModal(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                نعم، إفراغ السلة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#341B11] text-[#FDE68A] text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-[#8C4A26] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

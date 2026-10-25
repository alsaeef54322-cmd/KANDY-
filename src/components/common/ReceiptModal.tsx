
import React, { useState } from 'react';
import { Printer, X, Check } from 'lucide-react';
import { SaleInvoice } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';
import { printThermalReceipt } from '../../services/printService';

interface ReceiptModalProps {
  sale: SaleInvoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  onClose,
}) => {
  if (!sale) return null;

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const settings = db.getSettings();

  const handlePrint = (width: '80mm' | '58mm' = paperWidth) => {
    printThermalReceipt(sale, { paperWidth: width });
  };

  const is58 = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Controls */}
        <div className="p-3 bg-[#FAF7F2] border-b border-[#E8DCCE] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#542E1D]">مقاس الورق الحراري:</span>
              <div className="inline-flex rounded-lg bg-[#EAE1D7] p-0.5 border border-[#DAC8B6]">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    paperWidth === '80mm'
                      ? 'bg-[#542E1D] text-white shadow-xs'
                      : 'text-[#6B5345] hover:text-[#341B11]'
                  }`}
                >
                  80 مم (قياسي)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    paperWidth === '58mm'
                      ? 'bg-[#542E1D] text-white shadow-xs'
                      : 'text-[#6B5345] hover:text-[#341B11]'
                  }`}
                >
                  58 مم (محمول)
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Print Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(paperWidth)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#542E1D] hover:bg-[#3D2114] text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة ({paperWidth})</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint(is58 ? '80mm' : '58mm')}
              className="px-3 py-2 bg-white hover:bg-[#F3ECE2] text-[#542E1D] border border-[#DAC8B6] rounded-lg font-bold text-xs transition-colors cursor-pointer"
              title={`طباعة سريعة بمقاس ${is58 ? '80mm' : '58mm'}`}
            >
              طباعة {is58 ? '80 مم' : '58 مم'}
            </button>
          </div>
        </div>

        {/* Receipt Live Preview Container */}
        <div className="p-4 overflow-y-auto flex justify-center bg-[#F4EFEA]">
          <div
            className={`bg-white p-4 text-black shadow-md border border-gray-200 transition-all duration-200 ${
              is58 ? 'w-[240px] text-[11px]' : 'w-[320px] text-xs'
            }`}
          >
            <h2 className={`text-center font-black tracking-wider ${is58 ? 'text-lg' : 'text-xl'}`}>
              {settings.storeName || 'كاندي | KANDY'}
            </h2>
            <p className="text-center font-semibold text-[10px] text-gray-600 mt-0.5">
              محمصة المكسرات الفاخرة والشوكولاتة والحلويات
            </p>
            {settings.phone && (
              <p className="text-center text-[10px] text-gray-600">هاتف: {settings.phone}</p>
            )}

            <hr className="my-2 border-dashed border-gray-400" />

            <div className="flex justify-between font-bold text-[11px] mb-1">
              <span>فاتورة بيع</span>
              <span className="font-mono">#{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>التاريخ: {new Date(sale.createdAt || sale.date).toLocaleDateString('ar-EG')}</span>
              <span>الكاشير: {sale.cashierName}</span>
            </div>

            <hr className="my-2 border-dashed border-gray-400" />

            {/* Items */}
            <table className="w-full text-right mb-2">
              <thead>
                <tr className="border-b border-gray-300 text-[10px] text-gray-600">
                  <th className="py-1">الصنف</th>
                  <th className="py-1 text-center">الكمية</th>
                  <th className="py-1 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={index} className="border-b border-dashed border-gray-200">
                    <td className="py-1 font-bold">{item.productName}</td>
                    <td className="py-1 text-center font-mono">
                      {item.quantity} {item.productType === 'weight' ? 'كجم' : item.unitName || ''}
                    </td>
                    <td className="py-1 text-left font-mono font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="my-2 border-dashed border-gray-400" />

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>الخصم:</span>
                  <span className="font-mono">-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className={`flex justify-between font-black border-t border-b border-gray-900 py-1.5 my-1 ${
                is58 ? 'text-sm' : 'text-base'
              }`}>
                <span>الإجمالي الصافي:</span>
                <span className="font-mono">{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>المدفوع:</span>
                <span className="font-mono">{formatCurrency(sale.paidAmount)}</span>
              </div>
              {sale.remainingAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold text-[10px]">
                  <span>المتبقي (مديونية):</span>
                  <span className="font-mono">{formatCurrency(sale.remainingAmount)}</span>
                </div>
              )}
            </div>

            <p className="text-center font-bold text-xs mt-4 pt-2 border-t border-dashed border-gray-300">
              {settings.receiptFooter || 'شكرًا لزيارتكم كاندي ❤️'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


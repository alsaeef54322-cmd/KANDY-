import React from 'react';
import { Printer, X, Check, Coffee } from 'lucide-react';
import { SaleInvoice } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';

interface ReceiptModalProps {
  sale: SaleInvoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const settings = db.getSettings();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in no-print-backdrop">
      {/* Modal Wrapper */}
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-[#D5C2B0] animate-scale-in">
        {/* Controls Toolbar (hidden during print) */}
        <div className="p-3 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold shadow-xs transition-colors btn-tactile cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#FDE68A]" />
              <span>طباعة الإيصال (F9)</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors btn-tactile cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Content */}
        <div className="p-6 bg-white text-black font-mono text-xs print-receipt-container">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-gray-400">
            <div className="flex justify-center mb-1">
              <Coffee className="w-8 h-8 text-[#542E1D]" />
            </div>
            <h2 className="text-base font-bold text-black font-['Cairo',sans-serif]">{settings.storeName}</h2>
            <div className="text-[11px] text-gray-700 font-['Cairo',sans-serif]">محمصة ومكسرات وشوكولاتة فاخرة</div>
            <div className="text-[10px] text-gray-600 font-['Cairo',sans-serif] mt-0.5">{settings.address}</div>
            <div className="text-[10px] text-gray-600 font-mono">هاتف: {settings.phone}</div>
            {settings.taxNumber && (
              <div className="text-[10px] text-gray-600 font-mono">الرقم الضريبي: {settings.taxNumber}</div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>رقم الفاتورة:</span>
              <strong className="font-bold">#{sale.invoiceNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span>التاريخ:</span>
              <span>{new Date(sale.createdAt || sale.date).toLocaleString('ar-EG')}</span>
            </div>
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <span>{sale.cashierName}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between">
                <span>العميل:</span>
                <span className="font-semibold">{sale.customerName}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <table className="w-full my-3 text-right text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="py-1">الصنف</th>
                <th className="py-1 text-center">الكمية</th>
                <th className="py-1 text-center">السعر</th>
                <th className="py-1 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sale.items.map((item, idx) => (
                <tr key={idx} className="py-1">
                  <td className="py-1.5 font-['Cairo',sans-serif] text-[11px]">
                    {item.productName}
                  </td>
                  <td className="py-1.5 text-center font-mono">
                    {item.productType === 'weight'
                      ? `${item.quantity} كجم`
                      : `${item.quantity} ${item.unitName}`}
                  </td>
                  <td className="py-1.5 text-center font-mono">{item.unitPrice}</td>
                  <td className="py-1.5 text-left font-mono font-bold">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals */}
          <div className="pt-2 border-t border-dashed border-gray-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>الإجمالي الفرعي:</span>
              <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>الخصم الممنوح:</span>
                <span className="font-mono">- {formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-black pt-1.5 my-1">
              <span>الإجمالي الكلي:</span>
              <span className="font-mono">{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>المبلغ المدفوع:</span>
              <span className="font-mono font-semibold">{formatCurrency(sale.paidAmount)}</span>
            </div>
            {sale.remainingAmount > 0 && (
              <div className="flex justify-between font-bold text-amber-700">
                <span>المتبقي (آجل):</span>
                <span className="font-mono">{formatCurrency(sale.remainingAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>طريقة الدفع:</span>
              <span>
                {sale.paymentMethod === 'cash'
                  ? 'نقدي (كاش)'
                  : sale.paymentMethod === 'card'
                  ? 'بطاقة دفع إلكتروني'
                  : sale.paymentMethod === 'debt'
                  ? 'آجل (حساب عميل)'
                  : 'تحويل'}
              </span>
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center pt-4 border-t border-dashed border-gray-400 mt-4 text-[10px] text-gray-600 font-['Cairo',sans-serif]">
            <p className="font-bold">{settings.receiptFooter}</p>
            <p className="mt-1 text-[9px]">نظام كاندي لإدارة المحامص · شكراً لثقتكم</p>
          </div>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { Printer, X } from 'lucide-react';
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

  const settings = db.getSettings();

  const handlePrint = () => {
    printThermalReceipt(sale, { paperWidth: '80mm' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-3 flex items-center justify-between border-b">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#542E1D] text-white rounded-lg"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الفاتورة</span>
          </button>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 text-black text-sm">
          <h2 className="text-center text-2xl font-black tracking-widest">
            {settings.storeName || 'KANDY'}
          </h2>
          <p className="text-center font-medium">
            للمحمصة والمكسرات والحلويات
          </p>

          <hr className="my-3 border-dashed border-gray-400" />

          <h3 className="text-center text-lg font-bold">فاتورة بيع</h3>
          <p>رقم الفاتورة: {sale.invoiceNumber}</p>

          <hr className="my-3 border-dashed border-gray-400" />

          {sale.items.map((item, index) => (
            <div
              key={index}
              className="flex justify-between gap-2 py-2 border-b border-dashed"
            >
              <span>{item.productName} × {item.quantity}</span>
              <strong>{formatCurrency(item.total)}</strong>
            </div>
          ))}

          <div className="flex justify-between text-lg font-black pt-3">
            <span>الإجمالي</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>

          <p className="text-center font-bold mt-5">
            شكرًا لزيارتكم ❤️
          </p>
        </div>
      </div>
    </div>
  );
};

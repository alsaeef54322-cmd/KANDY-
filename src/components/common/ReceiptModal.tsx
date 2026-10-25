
import React from 'react';
import { Printer, X } from 'lucide-react';
import { SaleInvoice } from '../../types';
import { db } from '../../services/storage';
import { formatCurrency } from '../../services/accounting';

interface ReceiptModalProps {
  sale: SaleInvoice | null;
  onClose: () => void;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  onClose,
}) => {
  if (!sale) return null;

  const settings = db.getSettings();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=650');

    if (!printWindow) {
      alert('اسمح بفتح النوافذ المنبثقة علشان تطبع الفاتورة.');
      return;
    }

    const items = sale.items.map((item) => `
      <tr>
        <td class="item-name">${escapeHtml(item.productName)}</td>
        <td>${escapeHtml(item.quantity)} ${
          item.productType === 'weight'
            ? 'كجم'
            : escapeHtml(item.unitName)
        }</td>
        <td class="money">${escapeHtml(formatCurrency(item.total))}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة KANDY</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 3mm;
          }

          * { box-sizing: border-box; }

          body {
            width: 74mm;
            margin: 0 auto;
            color: #000;
            background: #fff;
            font-family: Arial, Tahoma, sans-serif;
            font-size: 12px;
            line-height: 1.6;
          }

          .header {
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 2px dashed #000;
          }

          .brand {
            font-size: 30px;
            font-weight: 900;
            letter-spacing: 2px;
            line-height: 1.4;
          }

          .subtitle {
            font-size: 11px;
            font-weight: bold;
          }

          .invoice-title {
            text-align: center;
            font-size: 17px;
            font-weight: bold;
            margin: 10px 0 5px;
          }

          .meta {
            display: flex;
            justify-content: space-between;
            gap: 5px;
            margin: 3px 0;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 9px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th, td {
            text-align: right;
            padding: 6px 2px;
            vertical-align: top;
            border-bottom: 1px dashed #bbb;
            overflow-wrap: anywhere;
          }

          th {
            font-size: 10px;
            font-weight: bold;
          }

          th:first-child { width: 39%; }
          th:nth-child(2) { width: 23%; }
          th:last-child { width: 38%; }

          .item-name { font-weight: bold; }
          .money { font-size: 10px; }

          .total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            font-weight: 900;
            padding: 5px 0;
          }

          .discount {
            display: flex;
            justify-content: space-between;
          }

          .thanks {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            margin-top: 12px;
          }

          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 3px;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="brand">${escapeHtml(settings.storeName || 'KANDY')}</div>
          <div class="subtitle">للمحمصة والمكسرات والحلويات</div>
        </header>

        <div class="invoice-title">فاتورة بيع</div>

        <div class="meta">
          <span>رقم الفاتورة:</span>
          <strong>${escapeHtml(sale.invoiceNumber)}</strong>
        </div>

        <div class="meta">
          <span>التاريخ:</span>
          <span>${escapeHtml(
            new Date(sale.createdAt || sale.date).toLocaleDateString('ar-EG')
          )}</span>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الكمية</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>

        ${sale.discount > 0 ? `
          <div class="divider"></div>
          <div class="discount">
            <span>الخصم</span>
            <strong>${escapeHtml(formatCurrency(sale.discount))}</strong>
          </div>
        ` : ''}

        <div class="divider"></div>

        <div class="total">
          <span>الإجمالي</span>
          <span>${escapeHtml(formatCurrency(sale.total))}</span>
        </div>

        <div class="divider"></div>

        <div class="thanks">شكرًا لزيارتكم ❤️</div>
        <div class="footer">نسعد بخدمتكم دائمًا</div>
      </body>
      </html>
    `);

    printWindow.document.close();

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);

    printWindow.onafterprint = () => printWindow.close();
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

/**
 * KANDY POS & Roastery Management System
 * Universal High-Precision Printing Engine
 * Supports Web Iframe Printing, Electron Desktop IPC, and A4 multi-page pagination with full RTL Arabic support.
 */

export interface PrintReportKPI {
  label: string;
  value: string;
  color?: string;
}

export interface PrintReportColumn {
  header: string;
  align?: 'right' | 'center' | 'left';
  width?: string;
}

export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  kpis?: PrintReportKPI[];
  columns: PrintReportColumn[];
  rows: (string | number)[][];
  summaryNotes?: string[];
  orientation?: 'portrait' | 'landscape';
}

declare global {
  interface Window {
    electronAPI?: {
      isDesktop?: boolean;
      platform?: string;
      version?: string;
      minimize?: () => void;
      maximize?: () => void;
      close?: () => void;
      printReceipt?: (content?: unknown) => Promise<{ success: boolean; error?: string }>;
      printReport?: (options?: { landscape?: boolean }) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export function printReportDocument(options: PrintReportOptions): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const {
        title,
        subtitle = 'محمصة كاندي للمكسرات الفاخرة والشوكولاتة والحلويات',
        periodLabel,
        kpis = [],
        columns = [],
        rows = [],
        summaryNotes = [],
        orientation = 'portrait',
      } = options;

      const now = new Date();
      const printDateStr = now.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const printTimeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Build HTML
      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${title} - محمصة كاندي</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@500;700&display=swap');

    @page {
      size: A4 ${orientation};
      margin: 12mm 10mm 14mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #26160F;
      background: #ffffff;
      padding: 10px;
      direction: rtl;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #542E1D;
      margin-bottom: 14px;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #341B11;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-title span.tag {
      background: #542E1D;
      color: #FDE68A;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
    }

    .brand-sub {
      font-size: 10px;
      color: #7A5E4F;
      margin-top: 2px;
      font-weight: 600;
    }

    .meta-box {
      text-align: left;
      font-size: 10px;
      color: #555555;
      line-height: 1.5;
    }

    .meta-box strong {
      color: #341B11;
    }

    .report-title-bar {
      background: #FAF7F2;
      border: 1px solid #E4D7C8;
      border-right: 5px solid #8C4A26;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-title-text {
      font-size: 14px;
      font-weight: 700;
      color: #341B11;
    }

    .report-period-badge {
      font-size: 11px;
      font-weight: 600;
      color: #542E1D;
      background: #F0E6DC;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }

    .kpi-card {
      background: #FAF7F2;
      border: 1px solid #E2D5C7;
      border-radius: 6px;
      padding: 7px 10px;
      text-align: right;
    }

    .kpi-label {
      font-size: 9.5px;
      color: #6B5345;
      font-weight: 600;
    }

    .kpi-val {
      font-size: 13px;
      font-weight: 800;
      color: #341B11;
      margin-top: 2px;
      font-family: 'Cairo', monospace;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      page-break-inside: auto;
    }

    table.data-table thead {
      display: table-header-group;
    }

    table.data-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.data-table th {
      background: #542E1D;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 6px 8px;
      border: 1px solid #422315;
      text-align: right;
    }

    table.data-table td {
      font-size: 9.5px;
      padding: 5px 8px;
      border: 1px solid #E2D5C7;
      color: #26160F;
    }

    table.data-table tbody tr:nth-child(even) {
      background: #FAF7F2;
    }

    .report-footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px dashed #C2AB9A;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #6B5345;
      page-break-inside: avoid;
    }

    .approval-box {
      text-align: center;
      min-width: 200px;
    }

    .approval-line {
      margin-top: 35px;
      border-top: 1px dotted #8C6A53;
      padding-top: 4px;
      font-weight: 700;
      color: #341B11;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-title">
        <span>كاندي | KANDY</span>
        <span class="tag">محمصة راقية</span>
      </div>
      <div class="brand-sub">${subtitle}</div>
      <div class="brand-sub">المدير المسؤول: <strong>الأستاذ إبراهيم راغب</strong></div>
    </div>
    <div class="meta-box">
      <div>تاريخ الاستخراج: <strong>${printDateStr}</strong></div>
      <div>وقت الطباعة: <strong>${printTimeStr}</strong></div>
      <div>الفرع: <strong>الفرع الرئيسي</strong></div>
      ${periodLabel ? `<div>فترة التقرير: <strong>${periodLabel}</strong></div>` : ''}
    </div>
  </div>

  <div class="report-title-bar">
    <div class="report-title-text">${title}</div>
    ${periodLabel ? `<div class="report-period-badge">الفترة: ${periodLabel}</div>` : ''}
  </div>

  ${
    kpis.length > 0
      ? `<div class="kpi-grid">
      ${kpis
        .map(
          (kpi) => `
        <div class="kpi-card" style="${kpi.color ? `border-top: 3px solid ${kpi.color}` : ''}">
          <div class="kpi-label">${kpi.label}</div>
          <div class="kpi-val" style="${kpi.color ? `color: ${kpi.color}` : ''}">${kpi.value}</div>
        </div>
      `
        )
        .join('')}
    </div>`
      : ''
  }

  <table class="data-table">
    <thead>
      <tr>
        ${columns
          .map(
            (col) => `
          <th style="${col.width ? `width:${col.width};` : ''} text-align: ${col.align || 'right'};">
            ${col.header}
          </th>
        `
          )
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${
        rows.length > 0
          ? rows
              .map(
                (row) => `
            <tr>
              ${row
                .map((cell, idx) => {
                  const colAlign = columns[idx]?.align || 'right';
                  return `<td style="text-align: ${colAlign};">${cell ?? '-'}</td>`;
                })
                .join('')}
            </tr>
          `
              )
              .join('')
          : `<tr><td colspan="${columns.length}" style="text-align:center; padding: 18px; color: #888;">لا توجد سجلات مطابقة للفترة المحددة</td></tr>`
      }
    </tbody>
  </table>

  ${
    summaryNotes.length > 0
      ? `<div style="margin-bottom: 12px; font-size: 9.5px; color: #555; background: #FAF7F2; padding: 6px 10px; border-radius: 4px;">
      ${summaryNotes.map((note) => `<div>• ${note}</div>`).join('')}
    </div>`
      : ''
  }

  <div class="report-footer">
    <div>
      <div>كاندي - نظام إدارة المحمصة والمبيعات والمخزون والحسابات</div>
      <div>مستخرج ومولد آلياً بنجاح عبر النظام</div>
    </div>
    <div class="approval-box">
      <div>اعتماد المدير العام</div>
      <div class="approval-line">الأستاذ إبراهيم راغب</div>
    </div>
  </div>
</body>
</html>`;

      // 1. If in Electron and native print is supported
      if (window.electronAPI?.printReport) {
        // Can call electron native print handler
        window.electronAPI.printReport({ landscape: orientation === 'landscape' }).catch(() => {});
      }

      // 2. Invisible Iframe approach (Rock-solid in all browsers & Electron)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      iframe.setAttribute('title', 'KANDY Report Print Frame');

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Unable to access print frame document');
      }

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          if (!iframe.contentWindow) {
            window.print();
            resolve(true);
            return;
          }

          iframe.contentWindow.focus();
          iframe.contentWindow.print();

          // Cleanup after print dialog completes
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {}
            resolve(true);
          }, 2000);
        } catch (err) {
          console.error('Iframe print failed, falling back to window.print():', err);
          window.print();
          try {
            document.body.removeChild(iframe);
          } catch {}
          resolve(true);
        }
      };

      // Ensure fonts and stylesheets are evaluated
      if (iframeDoc.readyState === 'complete') {
        setTimeout(triggerPrint, 300);
      } else {
        iframe.onload = () => {
          setTimeout(triggerPrint, 300);
        };
      }
    } catch (err) {
      console.error('Fatal print error:', err);
      // Fallback
      window.print();
      resolve(false);
    }
  });
}

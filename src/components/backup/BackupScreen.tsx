import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
} from 'lucide-react';
import { db } from '../../services/storage';

export const BackupScreen: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownloadBackup = () => {
    try {
      const backupJson = db.exportFullBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `نسخة_احتياطية_كاندي_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'تم إنشاء وتنزيل النسخة الاحتياطية الكاملة بنجاح.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'فشل في إنشاء النسخة الاحتياطية: ' + (err as Error).message });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = db.restoreFullBackup(content);
      if (result.success) {
        setStatusMessage({ type: 'success', text: result.message });
      } else {
        setStatusMessage({ type: 'error', text: result.message });
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleResetToSeed = () => {
    if (confirm('تنبيه هام: هل تريد استعادة البيانات الافتراضية الأصلية لمحمصة كاندي؟ ستعود كافة الحسابات والمخزون لحالتها الأولية.')) {
      db.resetToDefaults();
      setStatusMessage({ type: 'success', text: 'تمت إعادة تهيئة النظام إلى البيانات النموذجية الأصلية بنجاح.' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8DC CE]">
        <h2 className="text-xl font-bold text-[#341B11]">النسخ الاحتياطي واستعادة البيانات</h2>
        <p className="text-xs text-[#7A5E4F] mt-0.5">
          تصدير وحفظ نسخ احتياطية كاملة لقاعدة البيانات، واسترجاعها بأمان مع الحفاظ على سلامة القيود
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-[#EDF8F1] border-[#BDE3CB] text-[#1E5C36]'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#2B7A4B] shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#FAF3EC] text-[#542E1D] flex items-center justify-center font-bold border border-[#DAC8B6]">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#341B11]">تصدير نسخة احتياطية كاملة (JSON)</h3>
            <p className="text-xs text-[#6B5345] leading-relaxed">
              يقوم هذا الإجراء بحفظ نسخة احتياطية فورية وشاملة تحتوي على جميع المنتجات، أسعار الشراء والبيع،
              فواتير المبيعات والمشتريات، حركة الخزنة، والموردين والعملاء.
            </p>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-[#FDE68A]" />
            <span>تنزيل ملف النسخة الاحتياطية الآن</span>
          </button>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#FAF3EC] text-[#542E1D] flex items-center justify-center font-bold border border-[#DAC8B6]">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#341B11]">استعادة نسخة احتياطية سابقة</h3>
            <p className="text-xs text-[#6B5345] leading-relaxed">
              اختر ملف نسخة احتياطية (.json) محفوظ مسبقاً لاسترجاع كافة البيانات والسجلات
              والحركات المالية كما كانت لحظة الحفظ.
            </p>
          </div>

          <label className="w-full py-2.5 bg-[#2B7A4B] hover:bg-[#23633D] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer text-center">
            <Upload className="w-4 h-4 text-[#FDE68A]" />
            <span>تحديد ملف النسخة الاحتياطية واستعادتها</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Reset to Seed Data */}
      <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>إعادة التعيين إلى البيانات التجريبية النموذجية</span>
          </h4>
          <p className="text-[11px] text-[#7A5E4F] mt-0.5">
            إعادة تعيين قاعدة البيانات وإعادة تحميل الأصناف والموردين والفواتير النموذجية الأصلية لمحمصة كاندي.
          </p>
        </div>

        <button
          onClick={handleResetToSeed}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors shrink-0"
        >
          إعادة التعيين للبيانات النموذجية
        </button>
      </div>
    </div>
  );
};

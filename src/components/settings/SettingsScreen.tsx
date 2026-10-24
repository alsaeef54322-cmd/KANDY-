import React, { useState, useEffect } from 'react';
import { Settings, Save, Coffee, CheckCircle2, Phone, MapPin, Printer } from 'lucide-react';
import { StoreSettings } from '../../types';
import { db } from '../../services/storage';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>(db.getSettings());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8DC CE]">
        <h2 className="text-xl font-bold text-[#341B11]">إعدادات وبيانات المحمصة</h2>
        <p className="text-xs text-[#7A5E4F] mt-0.5">
          تخصيص هوية محمصة كاندي، بيانات الإيصالات المطبوعة، وإعدادات النظام
        </p>
      </div>

      {isSaved && (
        <div className="p-3.5 rounded-xl bg-[#EDF8F1] border border-[#BDE3CB] text-[#1E5C36] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#2B7A4B] shrink-0" />
          <span>تم حفظ الإعدادات بنجاح وتحديث كافة بيانات الفواتير والتقارير.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        {/* Brand Card (matching mockup) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4 flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#4A2613] to-[#2B1408] text-white flex flex-col items-center justify-center shadow-lg border-2 border-[#8C4A26]/40 p-4">
            <Coffee className="w-10 h-10 text-[#FDE68A] mb-1" />
            <span className="text-base font-extrabold tracking-wide">كاندي</span>
            <span className="text-[9px] text-[#E8B87D] font-mono">KANDY</span>
          </div>

          <div>
            <h3 className="font-bold text-sm text-[#341B11]">{settings.storeName}</h3>
            <p className="text-[11px] text-[#7A5E4F] mt-0.5">محمصة ومكسرات وشوكولاتة فاخرة</p>
          </div>

          <button
            type="button"
            onClick={() => alert('يمكنك تغيير الشعار عبر تخصيص صورة اللوجو في مجلد المشروع.')}
            className="px-3.5 py-1.5 border border-[#DAC8B6] rounded-lg text-xs font-semibold text-[#542E1D] hover:bg-[#FAF7F2] transition-colors"
          >
            تغيير الشعار
          </button>

          <div className="w-full pt-4 border-t border-[#EAE1D7] text-right space-y-2 text-[11px] text-[#6B5345]">
            <div className="flex justify-between">
              <span>المدير العام:</span>
              <strong className="text-[#341B11]">{settings.managerName}</strong>
            </div>
            <div className="flex justify-between">
              <span>العملة المعتمدة:</span>
              <strong className="text-[#341B11]">{settings.currency} ({settings.currencySymbol})</strong>
            </div>
          </div>
        </div>

        {/* General Store Details */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#341B11] pb-2 border-b border-[#EAE1D7]">
            بيانات المنشأة والفواتير
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">اسم النشاط التجاري</label>
              <input
                type="text"
                required
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">المدير المسؤول</label>
              <input
                type="text"
                required
                value={settings.managerName}
                onChange={(e) => setSettings({ ...settings, managerName: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">رقم الهاتف للتواصل</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">عنوان المحمصة والفرع</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">الرقم الضريبي (اختياري)</label>
              <input
                type="text"
                value={settings.taxNumber || ''}
                onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">السجل التجاري (اختياري)</label>
              <input
                type="text"
                value={settings.commercialRecord || ''}
                onChange={(e) => setSettings({ ...settings, commercialRecord: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Receipt Header & Footer */}
          <div>
            <label className="block font-semibold text-[#542E1D] mb-1">ترويسة الإيصال المطبوع (أعلى الفاتورة)</label>
            <input
              type="text"
              value={settings.receiptHeader}
              onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
              className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#542E1D] mb-1">تذييل الإيصال المطبوع (أسفل الفاتورة)</label>
            <input
              type="text"
              value={settings.receiptFooter}
              onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
              className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
            />
          </div>

          {/* Print Toggles */}
          <div className="pt-2 border-t border-[#EAE1D7] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPrintReceipt}
                onChange={(e) => setSettings({ ...settings, autoPrintReceipt: e.target.checked })}
                className="rounded border-[#DAC8B6] text-[#542E1D] focus:ring-[#542E1D]"
              />
              <span className="font-semibold text-[#341B11]">
                فتح نافذة الطباعة تلقائياً عند اعتماد فاتورة الكاشير
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#EAE1D7] flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-[#FDE68A]" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

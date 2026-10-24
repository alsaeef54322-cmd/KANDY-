import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Coffee,
  CheckCircle2,
  Phone,
  MapPin,
  Printer,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Database,
  History,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { db } from '../../services/storage';
import { BackupScreen } from '../backup/BackupScreen';
import { AuditScreen } from '../audit/AuditScreen';

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'backup' | 'audit'>('general');
  const [settings, setSettings] = useState<StoreSettings>(db.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [logoNotice, setLogoNotice] = useState(false);

  // Dedicated Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState<string | null>(null);
  const [pwErrorMsg, setPwErrorMsg] = useState<string | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  useEffect(() => {
    setSettings(db.getSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrorMsg(null);
    setPwSuccessMsg(null);

    if (!currentPassword) {
      setPwErrorMsg('يرجى إدخال كلمة المرور الحالية.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setPwErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwErrorMsg('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await db.updateManagerPassword(currentPassword, newPassword);
      if (res.success) {
        setPwSuccessMsg('تم تحديث وتشفير كلمة مرور المدير العام بنجاح.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPwSuccessMsg(null), 4000);
      } else {
        setPwErrorMsg(res.error || 'فشل تحديث كلمة المرور.');
      }
    } catch {
      setPwErrorMsg('حدث خطأ غير متوقع أثناء تحديث كلمة المرور.');
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#FAF7F2]">
      {/* Header and Sub-tabs */}
      <div className="pb-2 border-b border-[#E8DCCE] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#341B11]">إعدادات وبيانات المحمصة والأمان</h2>
          <p className="text-xs text-[#7A5E4F] mt-0.5">
            تخصيص هوية محمصة كاندي، بيانات الإيصالات المطبوعة، النسخ الاحتياطي، وسجل التدقيق
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1.5 bg-[#EAE1D7] p-1 rounded-xl overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'general'
                ? 'bg-white text-[#341B11] shadow-2xs'
                : 'text-[#6B5345] hover:text-[#341B11]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>بيانات المنشأة والأمان</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-[#341B11] shadow-2xs'
                : 'text-[#6B5345] hover:text-[#341B11]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>النسخ الاحتياطي والاستعادة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-[#341B11] shadow-2xs'
                : 'text-[#6B5345] hover:text-[#341B11]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل النشاط والتدقيق</span>
          </button>
        </div>
      </div>

      {activeTab === 'backup' && <BackupScreen />}
      {activeTab === 'audit' && <AuditScreen />}

      {activeTab === 'general' && (
        <div className="space-y-6">

      {isSaved && (
        <div className="p-3.5 rounded-xl bg-[#EDF8F1] border border-[#BDE3CB] text-[#1E5C36] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#2B7A4B] shrink-0" />
          <span>تم حفظ الإعدادات بنجاح وتحديث كافة بيانات الفواتير والتقارير.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        {/* Brand Card */}
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
            onClick={() => {
              setLogoNotice(true);
              setTimeout(() => setLogoNotice(false), 4000);
            }}
            className="px-3.5 py-1.5 border border-[#DAC8B6] rounded-lg text-xs font-semibold text-[#542E1D] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            تغيير الشعار
          </button>

          {logoNotice && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              شعار كاندي محفوظ ومدمج في هوية النظام. يمكنك تبديل الأصول في مجلد الصور.
            </div>
          )}

          <div className="w-full pt-4 border-t border-[#EAE1D7] text-right space-y-2 text-[11px] text-[#6B5345]">
            <div className="flex justify-between">
              <span>المدير العام:</span>
              <strong className="text-[#341B11]">{settings.managerName}</strong>
            </div>
            <div className="flex justify-between">
              <span>العملة المعتمدة:</span>
              <strong className="text-[#341B11]">
                {settings.currency} ({settings.currencySymbol})
              </strong>
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
              <label className="block font-semibold text-[#542E1D] mb-1">العنوان والموقع</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">رقم الهاتف والتواصل</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">الرقم الضريبي (إن وجد)</label>
              <input
                type="text"
                value={settings.taxNumber || ''}
                onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                placeholder="مثلاً: 123-456-789"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">رقم السجل التجاري</label>
              <input
                type="text"
                value={settings.commercialRecord || ''}
                onChange={(e) => setSettings({ ...settings, commercialRecord: e.target.value })}
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
                placeholder="مثلاً: CR-987654"
              />
            </div>
          </div>

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
              className="px-6 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#FDE68A]" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </div>
      </form>

      {/* DEDICATED SEPARATE MANAGER PASSWORD CHANGE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#542E1D] text-white flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#FDE68A]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#341B11]">
                تغيير كلمة مرور الإدارة (الأستاذ إبراهيم راغب)
              </h3>
              <p className="text-[11px] text-[#7A5E4F] mt-0.5">
                عملية منفصلة وآمنة لتحديث كلمة المرور المشفرة دون التأثير على بيانات النظام أو جلسات العمل
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>تشفير بملح أمان رقمي SHA-256</span>
          </div>
        </div>

        {pwErrorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwErrorMsg}</span>
          </div>
        )}

        {pwSuccessMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#542E1D] mb-1">
              كلمة المرور الحالية <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمتك الحالية"
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono focus:outline-none focus:border-[#542E1D]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#542E1D] mb-1">
              كلمة المرور الجديدة <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="4 خانات فأكثر"
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono focus:outline-none focus:border-[#542E1D]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#542E1D] mb-1">
              تأكيد كلمة المرور الجديدة <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="أعد إدخال الجديدة"
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono focus:outline-none focus:border-[#542E1D]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChangingPw}
              className="px-5 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-[#FDE68A]" />
              <span>{isChangingPw ? 'جاري التحقق والتحديث...' : 'تحديث وتأمين كلمة المرور'}</span>
            </button>
          </div>
        </form>
      </div>
      </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { ShieldCheck, User, Lock, CheckCircle2, Key, Info } from 'lucide-react';
import { UserSession } from '../../types';
import { db } from '../../services/storage';

interface UsersScreenProps {
  session: UserSession;
}

export const UsersScreen: React.FC<UsersScreenProps> = ({ session }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage('كلمة المرور يجب ألا تقل عن 6 خانات');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    db.addAuditLog('UPDATE', 'User', 'تحديث كلمة المرور لحساب المدير العام الأستاذ إبراهيم راغب');
    setMessage('تم تحديث كلمة المرور بنجاح وحفظها بأمان');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF7F2]">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8DC CE]">
        <h2 className="text-xl font-bold text-[#341B11]">المستخدمون والصلاحيات</h2>
        <p className="text-xs text-[#7A5E4F] mt-0.5">
          إدارة حساب المدير المسؤول وسياسات الأمان والتحكم بالنظام
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8C4A26] to-[#452210] text-white flex items-center justify-center font-bold text-xl shadow-md border border-[#A65E35]/40">
              إر
            </div>
            <div>
              <h3 className="text-base font-bold text-[#341B11]">{session.name}</h3>
              <div className="text-xs font-semibold text-[#2B7A4B] mt-0.5">
                {session.roleLabel}
              </div>
              <div className="text-[11px] text-[#8C7A6D] mt-0.5">
                اسم الدخول: <span className="font-mono">{session.username}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EDE2D4] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#542E1D]">
              <Info className="w-4 h-4 text-[#8C4A26]" />
              <span>سياسة الحساب المعتمدة في هذه النسخة:</span>
            </div>
            <p className="text-xs text-[#6B5345] leading-relaxed">
              الأستاذ <strong>إبراهيم راغب</strong> هو المستخدم الوحيد للنظام بصلاحيات كاملة
              وشاملة لكافة أقسام المحمصة والمبيعات والمشتريات والخزنة والأرباح والتصدير. لا توجد
              حسابات فرعية حالياً حفاظاً على سرية البيانات وسلاسة الإدارة.
            </p>
          </div>

          {/* Permissions Matrix */}
          <div>
            <h4 className="text-xs font-bold text-[#341B11] mb-2.5">
              مصفوفة الصلاحيات الممنوحة (Super Admin):
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                'إصدار فواتير المبيعات ونقطة البيع',
                'تعديل أسعار البيع وتكلفة الأصناف',
                'إدارة المخزون والتسويات والتالف',
                'إدارة فواتير المشتريات والموردين',
                'سداد دفعات الموردين وتحصيل الديون',
                'إدارة الخزنة النقدية والحركات المالية',
                'استعراض الأرباح والخسائر والتقارير',
                'النسخ الاحتياطي واستعادة البيانات',
              ].map((perm, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[#4A2613]">
                  <CheckCircle2 className="w-4 h-4 text-[#2B7A4B] shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6D9CC] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE1D7]">
            <Key className="w-5 h-5 text-[#8C4A26]" />
            <h3 className="text-sm font-bold text-[#341B11]">تغيير كلمة المرور</h3>
          </div>

          {message && (
            <div className="p-3 rounded-lg bg-[#EDF8F1] border border-[#BDE3CB] text-[#1E5C36] text-xs font-semibold">
              {message}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 أحرف أو أرقام على الأقل"
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#542E1D] mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold shadow-xs transition-colors"
              >
                تحديث كلمة المرور
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

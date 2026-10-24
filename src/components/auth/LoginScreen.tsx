import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  KeyRound,
} from 'lucide-react';
import { UserSession } from '../../types';
import { db } from '../../services/storage';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  // Setup Wizard State (First-Run only)
  const [setupEmail, setSetupEmail] = useState('ibrahim@kandy-roastery.com');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Feedback State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const configured = db.isManagerConfigured();
    setIsConfigured(configured);
    if (configured) {
      const auth = db.getManagerAuth();
      if (auth?.email) {
        setLoginEmail(auth.email);
      }
    }
  }, []);

  // Handle First-Time Setup Wizard submission
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!setupEmail.trim() || !setupEmail.includes('@')) {
      setError('يرجى كتابة بريد إلكتروني صالح للمدير العام الأستاذ إبراهيم راغب.');
      return;
    }

    if (!setupPassword || setupPassword.length < 4) {
      setError('كلمة المرور يجب أن لا تقل عن 4 أحرف أو أرقام.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await db.setupManagerAccount(setupEmail.trim(), setupPassword);
      if (res.success) {
        setSuccessMsg('تم إنشاء وتأمين حساب المدير العام بنجاح! جاري تحويلك للنظام...');
        setTimeout(() => {
          const session = db.getSession();
          onLoginSuccess(session);
        }, 700);
      } else {
        setError(res.error || 'تعذر إنشاء الحساب');
        setIsLoading(false);
      }
    } catch {
      setError('حدث خطأ أثناء تهيئة الحساب');
      setIsLoading(false);
    }
  };

  // Handle standard login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!loginEmail.trim() || !loginPassword) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await db.loginManager(loginEmail.trim(), loginPassword);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
        setIsLoading(false);
      }
    } catch {
      setError('فشل التحقق من بيانات الدخول.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#2B170E] p-4 font-['Cairo',sans-serif]">
      {/* Container Frame */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-[#4D2C1B]">
        {/* Visual Roastery Showcase Side */}
        <div className="md:w-1/2 bg-gradient-to-br from-[#2D160C] via-[#3E2114] to-[#1A0C06] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#A65E35]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C28B38]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Headline */}
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#8C4A26] flex items-center justify-center text-white shadow-lg border border-[#B8683B] mb-5">
              <Coffee className="w-8 h-8 text-[#FDE68A]" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-wide text-white mb-2">كاندي</h1>
            <div className="text-[#E6C3A5] text-sm font-semibold mb-4">
              نظام إدارة المحمصة والمبيعات والمخزون
            </div>
            <p className="text-xs text-[#C7B2A3] leading-relaxed max-w-sm">
              المنظومة الإدارية والمحاسبية المعتمدة لإدارة وتتبع كافة عمليات محمصة كاندي، المكسرات الفاخرة، الشوكولاتة، والحلويات.
            </p>
          </div>

          {/* Key Security & Operation Pillars */}
          <div className="my-8 space-y-2.5 text-xs text-[#EAD8CA] relative z-10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E8B87D]" />
              <span>نظام تشغيل محلي آمن ومحمي بكلمة مرور مشفرة</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E8B87D]" />
              <span>المدير المسؤول: الأستاذ إبراهيم راغب (صلاحية كاملة)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E8B87D]" />
              <span>نقطة بيع فورية، جرد بالجرام، وتصدير دقيق إلى Excel</span>
            </div>
          </div>

          {/* Tagline footer */}
          <div className="pt-6 border-t border-[#4E2B1B] text-center md:text-right relative z-10">
            <p className="text-sm font-bold text-[#F3E5D8] italic">
              "الطعم الأصيل .. في كل لحظة"
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-[#FAF7F2]">
          <div className="max-w-sm w-full mx-auto">
            {!isConfigured ? (
              /* --- FIRST RUN SETUP WIZARD --- */
              <div>
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8C4A26]/10 text-[#8C4A26] text-xs font-bold mb-2">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>التهيئة لأول مرة فقط</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#341B11]">إعداد حساب المدير العام</h2>
                  <p className="text-xs text-[#7A5E4F] mt-1">
                    الأستاذ إبراهيم راغب — صاحب ومدير المحمصة
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs mb-5 leading-relaxed">
                  هذا الحساب هو الحساب الإداري الوحيد للنظام. يرجى ضبط بريدك الإلكتروني وكلمة المرور الخاصة بك. سيتم قفل معالج الإعداد تلقائياً بعد الحفظ.
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSetupSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A2613] mb-1">
                      اسم المدير العام
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        disabled
                        value="الأستاذ إبراهيم راغب"
                        className="w-full pl-3 pr-9 py-2 text-xs bg-[#EAE1D7] text-[#4A2613] font-bold border border-[#D9C6B2] rounded-lg cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A2613] mb-1">
                      البريد الإلكتروني للإدارة <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={setupEmail}
                        onChange={(e) => setSetupEmail(e.target.value)}
                        placeholder="ibrahim@kandy-roastery.com"
                        className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-[#D9C6B2] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A2613] mb-1">
                      كلمة مرور الإدارة الجديدة <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSetupPassword ? 'text' : 'password'}
                        required
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور قوية (4 خانات فأكثر)"
                        className="w-full pl-10 pr-9 py-2 text-xs bg-white border border-[#D9C6B2] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSetupPassword(!showSetupPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6F5E] hover:text-[#4A2613]"
                      >
                        {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A2613] mb-1">
                      تأكيد كلمة المرور <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSetupPassword ? 'text' : 'password'}
                        required
                        value={setupConfirmPassword}
                        onChange={(e) => setSetupConfirmPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور"
                        className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-[#D9C6B2] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 px-4 bg-[#542E1D] hover:bg-[#3E2114] text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>جاري الحفظ والتأمين...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#FDE68A]" />
                        <span>تأكيد وإنشاء الحساب وقفل المعالج</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* --- STANDARD LOGIN SCREEN --- */
              <div>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-[#341B11]">تسجيل الدخول</h2>
                  <p className="text-xs text-[#7A5E4F] mt-1">
                    مرحباً بالأستاذ إبراهيم راغب في نظام كاندي
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A2613] mb-1">
                      البريد الإلكتروني أو اسم المستخدم
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="ibrahim@kandy-roastery.com"
                        className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-[#D9C6B2] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A2613] mb-1">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-9 py-2 text-xs bg-white border border-[#D9C6B2] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E] transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6F5E] hover:text-[#4A2613]"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7A5E4F] pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#6B371E] focus:ring-[#6B371E] border-[#D9C6B2]"
                      />
                      <span>تذكرني على هذا الجهاز</span>
                    </label>

                    <span className="text-[11px] text-[#8C6F5E] font-medium">
                      جلسة محلية مؤمنة
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 px-4 bg-[#542E1D] hover:bg-[#3E2114] text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>جاري التحقق...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-[#FDE68A]" />
                        <span>تسجيل الدخول إلى نظام كاندي</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

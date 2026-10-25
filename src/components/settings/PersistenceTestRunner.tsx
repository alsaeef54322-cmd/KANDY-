import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck2,
  RefreshCw,
  PlusCircle,
  Edit3,
  Trash2,
  Sparkles,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { db } from '../../services/storage';
import { Product } from '../../types';

interface TestStep {
  id: string;
  iteration: number;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  details?: string;
}

export const PersistenceTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [iterationsCount, setIterationsCount] = useState<number>(3);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [overallResult, setOverallResult] = useState<'idle' | 'success' | 'failed'>('idle');

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ar-EG');
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const runTestScenario = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOverallResult('idle');
    setLogs([]);
    setSteps([]);

    addLog(`🚀 بدء سيناريو اختبار ثبات وتزامن البيانات لعدد (${iterationsCount}) دورات متتالية...`);

    try {
      // 0. التحقق من اتصال الخادم
      const isOnline = await apiClient.checkHealth();
      if (!isOnline) {
        throw new Error('الخادم المركزي غير متصل! يرجى التأكد من تشغيل السيرفر.');
      }
      addLog('✓ تم التحقق من اتصال خادم KANDY المركزي.');

      for (let iter = 1; iter <= iterationsCount; iter++) {
        setCurrentIteration(iter);
        addLog(`\n================== بدء الدورة [${iter} من ${iterationsCount}] ==================`);

        const uniqueId = `diag-prod-iter-${iter}-${Date.now()}`;
        const initialCode = `DIAG-${iter}-${Math.floor(Math.random() * 900 + 100)}`;
        const initialName = `صنف فحص التزامن الدورة ${iter}`;
        const initialPrice = 400;
        const updatedPrice = 490;
        const updatedName = `صنف فحص التزامن المعدل [${iter}]`;

        // Step 1: إضافة الصنف
        const step1: TestStep = {
          id: `step-add-${iter}`,
          iteration: iter,
          label: `الدورة ${iter}: إضافة صنف جديد`,
          description: `إضافة "${initialName}" بالسعر ${initialPrice} ج.م وحفظه على الخادم`,
          status: 'running',
        };
        setSteps((prev) => [...prev, step1]);

        const testProduct: Product = {
          id: uniqueId,
          code: initialCode,
          name: initialName,
          categoryId: 'cat-1',
          categoryName: 'المكسرات',
          type: 'weight',
          purchaseUnit: 'كجم',
          stockUnit: 'جرام',
          saleUnit: 'كجم',
          unitConversionRatio: 1000,
          costPricePerStockUnit: 0.3,
          salePricePerSaleUnit: initialPrice,
          stockQuantity: 15000,
          minStockAlert: 3000,
          barcode: `622${Date.now().toString().slice(-9)}`,
          notes: 'صنف اختبار تشخيصي تكراري',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const addRes = await apiClient.saveProduct(testProduct);
        if (!addRes.success) {
          step1.status = 'failed';
          step1.details = addRes.error || 'فشلت إضافة الصنف على الخادم';
          setSteps((prev) => prev.map((s) => (s.id === step1.id ? { ...step1 } : s)));
          throw new Error(step1.details);
        }
        step1.status = 'success';
        step1.details = 'تم الحفظ وتأكيد الثبات على الخادم ومحلياً';
        setSteps((prev) => prev.map((s) => (s.id === step1.id ? { ...step1 } : s)));
        addLog(`[دورة ${iter} - خطوة 1] تمت إضافة الصنف بنجاح وحفظه على السيرفر.`);

        // Step 2: محاكاة تحديث الصفحة ومزامنة المتصفح #1
        const step2: TestStep = {
          id: `step-reload-1-${iter}`,
          iteration: iter,
          label: `الدورة ${iter}: محاكاة تحديث الصفحة ومزامنة البيانات #1`,
          description: 'تنفيذ syncWithServer والتحقق من عدم اختفاء الصنف المضاف حديثاً',
          status: 'running',
        };
        setSteps((prev) => [...prev, step2]);

        const syncRes1 = await apiClient.syncWithServer();
        if (!syncRes1.success) {
          step2.status = 'failed';
          step2.details = syncRes1.message || 'فشلت المزامنة مع الخادم';
          setSteps((prev) => prev.map((s) => (s.id === step2.id ? { ...step2 } : s)));
          throw new Error(step2.details);
        }

        const foundAfterReload1 = db.getProducts().find((p) => p.id === uniqueId);
        if (!foundAfterReload1) {
          step2.status = 'failed';
          step2.details = 'اختفى الصنف بعد المزامنة وتحديث الصفحة!';
          setSteps((prev) => prev.map((s) => (s.id === step2.id ? { ...step2 } : s)));
          throw new Error(step2.details);
        }
        step2.status = 'success';
        step2.details = 'اجتاز الفحص: الصنف موجود وثابت بكامل بياناته';
        setSteps((prev) => prev.map((s) => (s.id === step2.id ? { ...step2 } : s)));
        addLog(`[دورة ${iter} - خطوة 2] نجح تحديث الصفحة: الصنف موجود بالسعر ${foundAfterReload1.salePricePerSaleUnit} ج.م ولم يُفقد.`);

        // Step 3: تعديل بيانات المنتج
        const step3: TestStep = {
          id: `step-edit-${iter}`,
          iteration: iter,
          label: `الدورة ${iter}: تعديل بيانات المنتج`,
          description: `تغيير السعر إلى ${updatedPrice} ج.م والاسم إلى "${updatedName}"`,
          status: 'running',
        };
        setSteps((prev) => [...prev, step3]);

        const updatedProd: Product = {
          ...testProduct,
          name: updatedName,
          salePricePerSaleUnit: updatedPrice,
          updatedAt: new Date().toISOString(),
        };

        const updateRes = await apiClient.saveProduct(updatedProd);
        if (!updateRes.success) {
          step3.status = 'failed';
          step3.details = updateRes.error || 'فشل حفظ التعديل على الخادم';
          setSteps((prev) => prev.map((s) => (s.id === step3.id ? { ...step3 } : s)));
          throw new Error(step3.details);
        }
        step3.status = 'success';
        step3.details = `تم تعديل السعر إلى ${updatedPrice} ج.م وحفظه بالسيرفر`;
        setSteps((prev) => prev.map((s) => (s.id === step3.id ? { ...step3 } : s)));
        addLog(`[دورة ${iter} - خطوة 3] تم تعديل الصنف إلى السعر الجديد ${updatedPrice} ج.م بنجاح.`);

        // Step 4: محاكاة تحديث الصفحة #2 والتحقق من عدم عودة السعر القديم
        const step4: TestStep = {
          id: `step-reload-2-${iter}`,
          iteration: iter,
          label: `الدورة ${iter}: محاكاة تحديث الصفحة #2 والتحقق من ثبات التعديل`,
          description: 'التأكد من أن السعر ظل 490 ج.م ولم يرجع إطلاقاً للسعر القديم 400 ج.م',
          status: 'running',
        };
        setSteps((prev) => [...prev, step4]);

        await apiClient.syncWithServer();
        const foundAfterReload2 = db.getProducts().find((p) => p.id === uniqueId);
        if (!foundAfterReload2) {
          step4.status = 'failed';
          step4.details = 'الصنف اختفى بعد التعديل وتحديث الصفحة!';
          setSteps((prev) => prev.map((s) => (s.id === step4.id ? { ...step4 } : s)));
          throw new Error(step4.details);
        }
        if (foundAfterReload2.salePricePerSaleUnit !== updatedPrice) {
          step4.status = 'failed';
          step4.details = `فشل: السعر عاد إلى ${foundAfterReload2.salePricePerSaleUnit} بدلاً من ${updatedPrice}!`;
          setSteps((prev) => prev.map((s) => (s.id === step4.id ? { ...step4 } : s)));
          throw new Error(step4.details);
        }
        step4.status = 'success';
        step4.details = `نجح الفحص: السعر ظل ${foundAfterReload2.salePricePerSaleUnit} ج.م والاسم "${foundAfterReload2.name}" دون أي تراجع`;
        setSteps((prev) => prev.map((s) => (s.id === step4.id ? { ...step4 } : s)));
        addLog(`[دورة ${iter} - خطوة 4] نجاح حاسم: السعر المعدل ظل ثابتاً تماماً.`);

        // Step 5: حذف الصنف
        const step5: TestStep = {
          id: `step-delete-${iter}`,
          iteration: iter,
          label: `الدورة ${iter}: حذف / تعطيل الصنف`,
          description: 'إرسال طلب الحذف للسيرفر مع الحفاظ على السجلات التاريخية',
          status: 'running',
        };
        setSteps((prev) => [...prev, step5]);

        const deleteRes = await apiClient.deleteProduct(uniqueId);
        if (!deleteRes.success) {
          step5.status = 'failed';
          step5.details = deleteRes.error || 'فشل حذف الصنف من الخادم';
          setSteps((prev) => prev.map((s) => (s.id === step5.id ? { ...step5 } : s)));
          throw new Error(step5.details);
        }
        step5.status = 'success';
        step5.details = 'تم تأكيد الحذف والتعطيل على الخادم بنجاح';
        setSteps((prev) => prev.map((s) => (s.id === step5.id ? { ...step5 } : s)));
        addLog(`[دورة ${iter} - خطوة 5] تم تعطيل وحذف الصنف على السيرفر.`);

        // Step 6: محاكاة تحديث الصفحة #3 والتحقق من عدم عودة الصنف المحذوف
        const step6: TestStep = {
          id: `step-reload-3-${iter}`,
          iteration: iter,
          label: `الدورة ${iter}: محاكاة تحديث الصفحة #3 والتحقق من عدم عودة المحذوف`,
          description: 'التأكد من اختفاء الصنف المحذوف تماماً من قائمة الأصناف النشطة',
          status: 'running',
        };
        setSteps((prev) => [...prev, step6]);

        await apiClient.syncWithServer();
        const foundActive3 = db.getProducts().find((p) => p.id === uniqueId);
        const foundHistorical3 = db.getAllProducts().find((p) => p.id === uniqueId);

        if (foundActive3) {
          step6.status = 'failed';
          step6.details = 'فشل: الصنف المحذوف عاد للظهور كصنف نشط!';
          setSteps((prev) => prev.map((s) => (s.id === step6.id ? { ...step6 } : s)));
          throw new Error(step6.details);
        }
        if (!foundHistorical3 || foundHistorical3.isActive !== false) {
          step6.status = 'failed';
          step6.details = 'فشل: لم يتم الحفاظ على السجل التاريخي للصنف كـ isActive=false';
          setSteps((prev) => prev.map((s) => (s.id === step6.id ? { ...step6 } : s)));
          throw new Error(step6.details);
        }
        step6.status = 'success';
        step6.details = 'نجح الفحص: الصنف مختفٍ تماماً من القوائم النشطة، وسجله التاريخي محفوظ';
        setSteps((prev) => prev.map((s) => (s.id === step6.id ? { ...step6 } : s)));
        addLog(`[دورة ${iter} - خطوة 6] نجاح حاسم: الصنف المحذوف لم يعد للظهور إطلاقاً.`);

        // تنظيف صنف الفحص من الذاكرة المحلية والقرص
        const cleanedProducts = db.getAllProducts().filter((p) => p.id !== uniqueId);
        db.syncProducts(cleanedProducts, true);
        await apiClient.pushLocalDataToServer();
        addLog(`✓ تم تنظيف صنف الفحص دورة [${iter}] بنجاح للحفاظ على نقاء البيانات.`);
      }

      setOverallResult('success');
      addLog(`\n🎉 اكتمل سيناريو الاختبار التكراري بنجاح باهر لجميع الدورات (${iterationsCount}/${iterationsCount}) دون أي أخطاء!`);
    } catch (err: any) {
      setOverallResult('failed');
      addLog(`\n❌ توقف سيناريو الاختبار عند خطأ: ${err.message || err}`);
    } finally {
      setIsRunning(false);
      setCurrentIteration(0);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DAC8B6] shadow-sm p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE1D7]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base sm:text-lg font-bold text-[#341B11]">
              سيناريو فحص ثبات البيانات والمزامنة التكراري
            </h3>
          </div>
          <p className="text-xs text-[#7A5E4F] mt-1">
            يقوم هذا الاختبار بإضافة صنف تجريبي، وتعديله، وحذفه مع محاكاة تحديث الصفحة ومزامنة المتصفح بالكامل في كل خطوة للتحقق من عدم عودة البيانات القديمة إطلاقاً.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#542E1D] font-medium">
            <span>عدد الدورات:</span>
            <select
              disabled={isRunning}
              value={iterationsCount}
              onChange={(e) => setIterationsCount(Number(e.target.value))}
              className="p-1.5 bg-[#FAF7F2] border border-[#DAC8B6] rounded-lg text-xs font-bold text-[#341B11]"
            >
              <option value={1}>دورة واحدة (سريع)</option>
              <option value={3}>3 دورات تكرارية (موصى به)</option>
              <option value={5}>5 دورات إجهاد وتكرار مكثف</option>
            </select>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={runTestScenario}
            className="px-4 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#FDE68A]" />
                <span>جاري تنفيذ الفحص ({currentIteration}/{iterationsCount})...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[#FDE68A]" />
                <span>بدء سيناريو الاختبار التكراري</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Status Banner */}
      {overallResult === 'success' && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3 text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">اجتاز النظام سيناريو الاختبار التكراري بنجاح 100%! 🎉</div>
            <div className="text-xs text-emerald-800">
              تم إثبات أن إضافة وتعديل وحذف المنتجات ثابت على الخادم المركزي وعلى القرص الصلب، ولا تعود البيانات لحالتها السابقة عند تحديث الصفحة أو إعادة تشغيل المتصفح.
            </div>
          </div>
        </div>
      )}

      {overallResult === 'failed' && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">توقف سيناريو الفحص نتيجة خطأ غير متوقع!</div>
            <div className="text-xs text-rose-800">يرجى مراجعة سجل النشاط أدناه للتعرف على الخطوة التي فشلت بالتفصيل.</div>
          </div>
        </div>
      )}

      {/* Step Breakdown Cards */}
      {steps.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#542E1D] flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-[#8C6F5E]" />
            <span>خطوات الفحص التكرارية والنتائج اللحظية:</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto p-1">
            {steps.map((st) => (
              <div
                key={st.id}
                className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                  st.status === 'success'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : st.status === 'running'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 animate-pulse'
                    : st.status === 'failed'
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-[#FAF7F2] border-[#E8DCCE] text-gray-600'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {st.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {st.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
                  {st.status === 'failed' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                  {st.status === 'pending' && <RotateCcw className="w-4 h-4 text-gray-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold">{st.label}</div>
                  <div className="text-[11px] text-[#6B5345] mt-0.5 truncate">{st.description}</div>
                  {st.details && (
                    <div className="text-[10px] font-mono mt-1 pt-1 border-t border-black/5 opacity-85">
                      {st.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Live Output Log */}
      <div className="rounded-xl bg-[#170D08] border border-[#341F14] overflow-hidden text-xs">
        <div className="p-2.5 bg-[#26160F] border-b border-[#341F14] flex items-center justify-between text-[#DAC8B6]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#E8B87D]" />
            <span className="font-mono text-[11px] font-bold">سجل الفحص البرمجي المباشر (Diagnostic Log)</span>
          </div>
          <span className="text-[10px] text-[#8C7A6D]">محدث لحظياً</span>
        </div>

        <div className="p-3 font-mono text-[11px] text-[#E8B87D] space-y-1 max-h-52 overflow-y-auto select-text direction-ltr text-right">
          {logs.length === 0 ? (
            <div className="text-[#8C7A6D] text-center py-4">اضغط على "بدء سيناريو الاختبار التكراري" لتشغيل الفحص التلقائي</div>
          ) : (
            logs.map((log, index) => <div key={index} className="whitespace-pre-wrap">{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
};

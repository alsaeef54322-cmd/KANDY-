import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronRight,
  ArrowLeft,
  BellRing,
  RotateCcw,
} from 'lucide-react';
import { db } from '../../services/storage';
import { getRealSystemAlerts } from '../../services/accounting';
import { SystemAlert } from '../../types';
import { NavItemKey } from '../layout/Sidebar';

interface SmartAlertsBannerProps {
  onNavigate: (tab: NavItemKey) => void;
  onOpenClosingWizard?: () => void;
}

export const SmartAlertsBanner: React.FC<SmartAlertsBannerProps> = ({
  onNavigate,
  onOpenClosingWizard,
}) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const refreshAlerts = () => {
    setAlerts(getRealSystemAlerts());
  };

  useEffect(() => {
    refreshAlerts();
    const unsub = db.subscribe(refreshAlerts);
    return () => unsub();
  }, []);

  if (alerts.length === 0) return null;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    db.dismissAlert(id);
  };

  const handleActionClick = (alert: SystemAlert) => {
    if (alert.type === 'unclosed_day' || alert.type === 'cash_difference') {
      if (onOpenClosingWizard) {
        onOpenClosingWizard();
        return;
      }
    }
    onNavigate(alert.linkTab as NavItemKey);
  };

  const topAlert = alerts[0];

  return (
    <div className="bg-white rounded-2xl border border-[#E6D9CC] shadow-2xs overflow-hidden transition-all">
      {/* Top Banner Bar */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="p-3 sm:p-4 bg-gradient-to-r from-amber-500/10 via-[#FAF7F2] to-emerald-500/10 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#341B11]">
                مركز التنبيهات الذكي ({alerts.length})
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                يتطلب متابعة المدير
              </span>
            </div>
            <p className="text-xs text-[#6B5345] truncate mt-0.5">
              <strong>{topAlert.title}:</strong> {topAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(topAlert);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#542E1D] hover:bg-[#341B11] text-white text-xs font-bold transition-colors flex items-center gap-1"
          >
            <span>{topAlert.actionText}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs text-[#8C7A6D] hidden sm:inline-block">
            {isExpanded ? 'طي التنبيهات ↑' : 'عرض الكل ↓'}
          </span>
        </div>
      </div>

      {/* Expanded Alerts List */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2.5 border-t border-[#E6D9CC] bg-[#FAF7F2] divide-y divide-[#EDE0D2]">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                {alert.severity === 'danger' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}

                <div>
                  <h4 className="text-xs font-bold text-[#341B11]">{alert.title}</h4>
                  <p className="text-xs text-[#6B5345] mt-0.5">{alert.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleActionClick(alert)}
                  className="px-3 py-1 rounded-lg bg-white border border-[#D5C2B1] hover:bg-[#F3ECE2] text-xs font-bold text-[#542E1D] transition-colors"
                >
                  {alert.actionText}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDismiss(alert.id, e)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                  title="تجاهل التنبيه مؤقتاً"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => db.resetDismissedAlerts()}
              className="text-[11px] text-[#8C7A6D] hover:text-[#542E1D] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>استعادة التنبيهات التي تم إخفاؤها</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

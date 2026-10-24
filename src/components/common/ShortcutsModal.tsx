import React from 'react';
import {
  Keyboard,
  X,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  Truck,
  Users,
  UserCheck,
  Wallet,
  Landmark,
  BadgeDollarSign,
  BarChart3,
  Settings,
  Zap,
  Calculator,
} from 'lucide-react';
import { NavItemKey } from '../layout/Sidebar';
import { HOTKEY_ITEMS } from '../../hooks/useGlobalHotkeys';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavItemKey) => void;
}

const navIcons: Record<NavItemKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  sales: ShoppingCart,
  products: Package,
  categories: FolderTree,
  inventory: Boxes,
  purchases: Truck,
  suppliers: Users,
  customers: UserCheck,
  expenses: Wallet,
  safe: Landmark,
  closing: Calculator,
  payroll: BadgeDollarSign,
  reports: BarChart3,
  settings: Settings,
};

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-[#D9C6B2] overflow-hidden animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#542E1D] text-[#FDE68A] flex items-center justify-center shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#341B11] flex items-center gap-2">
                <span>اختصارات لوحة المفاتيح السريعة</span>
                <span className="text-[10px] bg-[#EAE1D7] text-[#542E1D] px-2 py-0.5 rounded-full font-mono font-bold">
                  Global Hotkeys
                </span>
              </h3>
              <p className="text-[11px] text-[#7A5E4F]">
                تنقل فوري بين أقسام نظام كاندي للمحمصة لتعزيز سرعة الإنجاز والبيع
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Screen Navigation */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#542E1D] mb-2.5 pb-1 border-b border-[#EAE1D7]">
              <Zap className="w-3.5 h-3.5 text-[#C28B38]" />
              <span>التنقل السريع بين الشاشات الرئيسية (اضغط على أي اختصار للانتقال المباشر)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOTKEY_ITEMS.map((item) => {
                const Icon = navIcons[item.key] || LayoutDashboard;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onSelectTab(item.key);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#EDE2D4] bg-[#FAF7F2] hover:bg-[#F3ECE2] hover:border-[#D5C2B0] transition-all text-right group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white text-[#542E1D] group-hover:bg-[#542E1D] group-hover:text-white transition-colors flex items-center justify-center border border-[#E0D2C3] shadow-2xs">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-[#2B170E]">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-[#542E1D] bg-white border border-[#DAC8B6] rounded-md shadow-2xs">
                        {item.comboLabel}
                      </kbd>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: POS Cashier Hotkeys */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#542E1D] mb-2.5 pb-1 border-b border-[#EAE1D7]">
              <ShoppingCart className="w-3.5 h-3.5 text-[#2B7A4B]" />
              <span>اختصارات شاشة الكاشير والمبيعات (POS)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#EDE2D4] bg-white">
                <span className="font-medium text-[#4A3224]">فتح نافذة الاختصارات</span>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-[#542E1D] bg-[#FAF7F2] border border-[#DAC8B6] rounded-md shadow-2xs">
                  Ctrl + K / F1
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#EDE2D4] bg-white">
                <span className="font-medium text-[#4A3224]">إغلاق النوافذ المنبثقة</span>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-[#542E1D] bg-[#FAF7F2] border border-[#DAC8B6] rounded-md shadow-2xs">
                  Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#EDE2D4] bg-white">
                <span className="font-medium text-[#4A3224]">إعدادات المتجر</span>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-[#542E1D] bg-[#FAF7F2] border border-[#DAC8B6] rounded-md shadow-2xs">
                  Ctrl + ,
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#EDE2D4] bg-white">
                <span className="font-medium text-[#4A3224]">الخزنة النقدية</span>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-[#542E1D] bg-[#FAF7F2] border border-[#DAC8B6] rounded-md shadow-2xs">
                  Ctrl + 0
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE1D7] flex items-center justify-between shrink-0 text-[11px] text-[#7A5E4F]">
          <span>يمكن استخدام مفتاح <strong>Ctrl</strong> على Windows/Linux أو <strong>Cmd</strong> على Mac.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
          >
            فهمت، إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

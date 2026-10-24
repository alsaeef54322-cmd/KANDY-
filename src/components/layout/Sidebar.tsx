import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  Truck,
  Users,
  UserCheck,
  Wallet,
  BadgeDollarSign,
  Landmark,
  BarChart3,
  Settings,
  LogOut,
  Coffee,
  X,
  Keyboard,
  Calculator,
} from 'lucide-react';
import { UserSession } from '../../types';

export type NavItemKey =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'expenses'
  | 'safe'
  | 'closing'
  | 'payroll'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  session: UserSession;
  onLogout: () => void;
  lowStockCount?: number;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  onOpenShortcuts?: () => void;
}

// Navigational sections with shortcuts + Logout button
const navItems: {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
}[] = [
  { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, hotkey: 'Ctrl+1' },
  { key: 'sales', label: 'نقطة البيع (الكاشير)', icon: ShoppingCart, hotkey: 'Ctrl+2' },
  { key: 'products', label: 'المنتجات والأصناف', icon: Package, hotkey: 'Ctrl+3' },
  { key: 'categories', label: 'التصنيفات والأقسام', icon: FolderTree, hotkey: 'Ctrl+4' },
  { key: 'inventory', label: 'المخزون وحركة الجرد', icon: Boxes, hotkey: 'Ctrl+5' },
  { key: 'purchases', label: 'فواتير المشتريات', icon: Truck, hotkey: 'Ctrl+6' },
  { key: 'suppliers', label: 'الموردون والمستحقات', icon: Users, hotkey: 'Ctrl+7' },
  { key: 'customers', label: 'العملاء وكشوف الحساب', icon: UserCheck, hotkey: 'Ctrl+8' },
  { key: 'expenses', label: 'المصروفات والتشغيل', icon: Wallet, hotkey: 'Ctrl+9' },
  { key: 'safe', label: 'الخزنة النقدية', icon: Landmark, hotkey: 'Ctrl+0' },
  { key: 'closing', label: 'إقفال اليومية (المطابقة)', icon: Calculator, hotkey: 'Alt+C' },
  { key: 'payroll', label: 'الرواتب والسلف', icon: BadgeDollarSign, hotkey: 'Alt+P' },
  { key: 'reports', label: 'التقارير والأرباح', icon: BarChart3, hotkey: 'Alt+R' },
  { key: 'settings', label: 'إعدادات النظام', icon: Settings, hotkey: 'Alt+S' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  onLogout,
  lowStockCount = 0,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
  onOpenShortcuts,
}) => {
  const handleItemClick = (key: NavItemKey) => {
    onSelectTab(key);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const sidebarContent = (
    <aside className="w-68 max-w-[85vw] lg:w-64 bg-[#1E110A] text-[#E0D2C7] flex flex-col h-full select-none border-l border-[#3D2517] shrink-0 no-print">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#341F14] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8C4A26] to-[#452210] flex items-center justify-center text-white shadow-md border border-[#A65E35]/30 shrink-0">
            <Coffee className="w-6 h-6 text-[#F9E2AF]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>كاندي</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8C4A26]/40 text-[#E8B87D] font-mono font-bold">
                KANDY
              </span>
            </h1>
            <p className="text-[11px] text-[#A68F80] truncate">إدارة المحمصة والمبيعات والمخزون</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobileDrawer && (
          <button
            onClick={onCloseMobileDrawer}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C1A10] cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu (13 Items) */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          const isLowStock = item.key === 'inventory' && lowStockCount > 0;

          return (
            <button
              key={item.key}
              onClick={() => handleItemClick(item.key)}
              title={`${item.label} (${item.hotkey})`}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 relative cursor-pointer btn-tactile ${
                isActive
                  ? 'bg-gradient-to-r from-[#8C4A26] to-[#693418] text-white shadow-sm font-semibold border-r-3 border-[#FDE68A]'
                  : 'text-[#D1BEB0] hover:bg-[#2C1A10] hover:text-white hover:-translate-x-0.5'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                    isActive ? 'text-[#FDE68A] scale-105' : 'text-[#9E8272] group-hover:text-[#D1BEB0]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isLowStock && (
                  <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-badge-pop shadow-xs">
                    {lowStockCount}
                  </span>
                )}
                {/* Hotkey badge */}
                <span
                  className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors ${
                    isActive
                      ? 'bg-black/30 text-[#FDE68A] border-[#FDE68A]/30'
                      : 'bg-[#2A170E] text-[#8C7A6D] border-[#3D2517]'
                  }`}
                >
                  {item.hotkey}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Shortcuts Help Bar */}
      {onOpenShortcuts && (
        <div className="px-3 py-2 border-t border-[#341F14]/70 bg-[#160C07]">
          <button
            onClick={onOpenShortcuts}
            className="w-full flex items-center justify-between py-1.5 px-2 rounded-md text-[11px] text-[#C2AB9A] hover:text-[#FDE68A] hover:bg-[#2C1A10] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-[#C28B38]" />
              <span>دليل اختصارات المفاتيح</span>
            </div>
            <kbd className="text-[9px] font-mono bg-[#2C1A10] px-1.5 py-0.5 rounded border border-[#452718] text-[#E8B87D]">
              Ctrl+K
            </kbd>
          </button>
        </div>
      )}

      {/* 14th Item: Manager Profile & Logout */}
      <div className="p-3 border-t border-[#341F14] bg-[#170D08]">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#8C4A26] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#A65E35] shadow-xs">
              إر
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">{session.name}</div>
              <div className="text-[10px] text-[#8C7A6D]">المدير العام المسؤول</div>
            </div>
          </div>
        </div>

        {/* Dedicated Logout Action (Item 14) */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-[#E0D2C7] bg-[#2C1A10] hover:bg-rose-950/70 hover:text-rose-200 border border-[#452718] hover:border-rose-800/80 transition-all duration-150 cursor-pointer btn-tactile"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* 1. Desktop permanent sidebar (lg and up) */}
      <div className="hidden lg:flex h-screen shrink-0">{sidebarContent}</div>

      {/* 2. Mobile & Tablet Drawer Modal */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={onCloseMobileDrawer}
          />

          {/* Drawer content sliding in from right (RTL) */}
          <div className="relative z-50 h-full animate-slide-in-right shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

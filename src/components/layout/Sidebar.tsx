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
  | 'payroll'
  | 'safe'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  session: UserSession;
  onLogout: () => void;
  lowStockCount?: number;
}

// Exactly 13 navigational sections + Logout button (14 items total)
const navItems: {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { key: 'sales', label: 'المبيعات', icon: ShoppingCart },
  { key: 'products', label: 'المنتجات', icon: Package },
  { key: 'categories', label: 'التصنيفات', icon: FolderTree },
  { key: 'inventory', label: 'المخزون والجرد', icon: Boxes },
  { key: 'purchases', label: 'المشتريات', icon: Truck },
  { key: 'suppliers', label: 'الموردون', icon: Users },
  { key: 'customers', label: 'العملاء', icon: UserCheck },
  { key: 'expenses', label: 'المصروفات', icon: Wallet },
  { key: 'payroll', label: 'الرواتب والسلف', icon: BadgeDollarSign },
  { key: 'safe', label: 'الخزنة', icon: Landmark },
  { key: 'reports', label: 'التقارير', icon: BarChart3 },
  { key: 'settings', label: 'الإعدادات الأساسية', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  onLogout,
  lowStockCount = 0,
}) => {
  return (
    <aside className="w-64 bg-[#1E110A] text-[#E0D2C7] flex flex-col h-screen select-none border-l border-[#3D2517] shrink-0 no-print">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#341F14] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8C4A26] to-[#452210] flex items-center justify-center text-white shadow-md border border-[#A65E35]/30">
            <Coffee className="w-6 h-6 text-[#F9E2AF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>كاندي</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8C4A26]/40 text-[#E8B87D] font-mono font-bold">
                KANDY
              </span>
            </h1>
            <p className="text-[11px] text-[#A68F80] truncate">إدارة المحمصة والمبيعات والمخزون</p>
          </div>
        </div>
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
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#8C4A26] to-[#693418] text-white shadow-sm font-semibold'
                  : 'text-[#D1BEB0] hover:bg-[#2C1A10] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#FDE68A]' : 'text-[#9E8272]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isLowStock && (
                <span className="bg-amber-600/80 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {lowStockCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 14th Item: Manager Profile & Logout */}
      <div className="p-3 border-t border-[#341F14] bg-[#170D08]">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#8C4A26] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#A65E35]">
              إر
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">{session.name}</div>
              <div className="text-[10px] text-[#8C7A6D]">المدير المسؤول</div>
            </div>
          </div>
        </div>

        {/* Dedicated Logout Action (Item 14) */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-[#E0D2C7] bg-[#2C1A10] hover:bg-rose-950/60 hover:text-rose-300 border border-[#452718] hover:border-rose-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

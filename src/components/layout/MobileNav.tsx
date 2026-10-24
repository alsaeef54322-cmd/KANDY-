import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Landmark,
  Menu,
} from 'lucide-react';
import { NavItemKey } from './Sidebar';

interface MobileNavProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onOpenDrawer: () => void;
  lowStockCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenDrawer,
  lowStockCount = 0,
}) => {
  const items: {
    key: NavItemKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { key: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { key: 'sales', label: 'الكاشير', icon: ShoppingCart },
    { key: 'products', label: 'المنتجات', icon: Package },
    { key: 'safe', label: 'الخزنة', icon: Landmark },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1E110A] text-[#E0D2C7] border-t border-[#3D2517] h-14 flex items-center justify-around px-2 no-print shadow-lg select-none"
      dir="rtl"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelectTab(item.key)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-lg transition-all text-center relative ${
              isActive
                ? 'text-[#FDE68A] font-bold'
                : 'text-[#B8A395] hover:text-white'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <button
        onClick={onOpenDrawer}
        className="flex-1 flex flex-col items-center justify-center py-1 rounded-lg text-[#B8A395] hover:text-white transition-all text-center relative"
      >
        <div className="relative">
          <Menu className="w-5 h-5" />
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              !
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 leading-none">كل الأقسام</span>
      </button>
    </nav>
  );
};

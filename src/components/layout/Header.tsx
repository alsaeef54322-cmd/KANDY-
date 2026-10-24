import React from 'react';
import {
  Calendar,
  MapPin,
  Landmark,
  AlertTriangle,
  Search,
  Bell,
  RefreshCw,
} from 'lucide-react';

import { UserSession } from '../../types';
import { formatCurrency } from '../../services/accounting';

interface HeaderProps {
  session: UserSession;
  safeBalance: number;
  lowStockCount: number;
  onOpenSafe: () => void;
  onOpenLowStock: () => void;
  onRefreshData: () => void;
  searchQuery: string;

  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  safeBalance,
  lowStockCount,
  onOpenSafe,
  onOpenLowStock,
  onRefreshData,
  searchQuery,
  onSearchChange,
}) => {

  const todayFormatted = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-[#EAE1D7] px-6 flex items-center justify-between shadow-xs z-10 shrink-0 no-print">
      {/* Right side: Search and quick shortcuts */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن منتج، كود، فاتورة، أو مورد..."
            className="w-full pl-3 pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#E4D7C8] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E] transition-colors"
          />
        </div>
      </div>

      {/* Left side: Date, Branch, Safe balance, Alerts & Profile */}
      <div className="flex items-center gap-3">
        {/* Date indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#6B5345] bg-[#FAF7F2] px-3 py-1.5 rounded-lg border border-[#EDE2D4]">
          <Calendar className="w-3.5 h-3.5 text-[#8C4A26]" />
          <span>{todayFormatted}</span>
        </div>

        {/* Branch */}
        <div className="hidden xl:flex items-center gap-1 text-xs text-[#6B5345] bg-[#FAF7F2] px-2.5 py-1.5 rounded-lg border border-[#EDE2D4]">
          <MapPin className="w-3.5 h-3.5 text-[#8C4A26]" />
          <span>الفرع الرئيسي</span>
        </div>

        {/* Cash Safe Balance Badge */}
        <button
          onClick={onOpenSafe}
          title="عرض الخزنة والحسابات النقدية"
          className="flex items-center gap-2 bg-[#F6EFE6] hover:bg-[#EFE5D8] text-[#4A2613] px-3 py-1.5 rounded-lg border border-[#D9C6B2] text-xs font-semibold transition-colors"
        >
          <Landmark className="w-3.5 h-3.5 text-[#8C4A26]" />
          <span>الخزنة:</span>
          <span className="text-[#2B7A4B] font-mono">{formatCurrency(safeBalance)}</span>
        </button>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <button
            onClick={onOpenLowStock}
            title={`${lowStockCount} منتجات قاربت على النفاد`}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="hidden sm:inline">نواقص:</span>
            <span className="font-bold">{lowStockCount}</span>
          </button>
        )}

        {/* Refresh button */}

        <button
          onClick={onRefreshData}
          title="تحديث البيانات"
          className="p-1.5 text-[#6B5345] hover:text-[#341B11] hover:bg-[#FAF7F2] rounded-lg transition-colors border border-transparent hover:border-[#E4D7C8]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 pr-2 border-r border-[#EAE1D7]">
          <div className="w-8 h-8 rounded-full bg-[#522914] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            إر
          </div>
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-[#341B11] leading-tight">{session.name}</div>
            <div className="text-[10px] text-[#2B7A4B] font-semibold">متصل · مدير النظام</div>
          </div>
        </div>
      </div>
    </header>
  );
};

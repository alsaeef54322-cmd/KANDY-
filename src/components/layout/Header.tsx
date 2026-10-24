import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Landmark,
  AlertTriangle,
  Search,
  RefreshCw,
  Menu,
  Keyboard,
  CloudCheck,
  CloudOff,
  Server,
} from 'lucide-react';

import { UserSession } from '../../types';
import { formatCurrency } from '../../services/accounting';
import { apiClient, ServerStatus } from '../../services/apiClient';
import { toast } from '../common/Toast';

interface HeaderProps {
  session: UserSession;
  safeBalance: number;
  lowStockCount: number;
  onOpenSafe: () => void;
  onOpenLowStock: () => void;
  onRefreshData: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileDrawer?: () => void;
  onOpenShortcuts?: () => void;
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
  onOpenMobileDrawer,
  onOpenShortcuts,
}) => {
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = apiClient.subscribeStatus((st) => setServerStatus(st));
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiClient.syncWithServer();
      if (res.success) {
        toast.success('تمت مزامنة البيانات مع الخادم المركزي بنجاح');
      } else {
        toast.info(res.message || 'النظام يعمل بالوضع المحلي حالياً');
      }
      onRefreshData();
    } finally {
      setIsSyncing(false);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('ar-EG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-15 sm:h-16 bg-white border-b border-[#EAE1D7] px-3 sm:px-6 flex items-center justify-between shadow-xs z-10 shrink-0 no-print gap-2">
      {/* Right side: Mobile Menu Button + Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl min-w-0">
        {/* Hamburger Menu on Mobile/Tablet */}
        {onOpenMobileDrawer && (
          <button
            onClick={onOpenMobileDrawer}
            className="lg:hidden p-2 text-[#542E1D] hover:bg-[#FAF7F2] active:bg-[#F3ECE2] rounded-lg border border-[#DAC8B6] transition-colors cursor-pointer shrink-0"
            title="فتح القائمة الرئيسية"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar */}
        <div className="relative w-full min-w-0">
          <Search className="w-4 h-4 text-[#8C6F5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث عن منتج، كود، فاتورة..."
            className="w-full pl-2 sm:pl-3 pr-8 sm:pr-9 py-1.5 text-xs bg-[#FAF7F2] border border-[#E4D7C8] rounded-lg focus:outline-none focus:border-[#6B371E] focus:ring-1 focus:ring-[#6B371E] transition-colors placeholder:text-[#A68F80]"
          />
        </div>
      </div>

      {/* Left side: Status indicators & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Server Connection Status Badge */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          title={
            serverStatus === 'connected'
              ? 'متصل بالسيرفر المركزي ومؤمن (انقر للتحديث)'
              : 'يعمل بالوضع المحلي المكتبي (انقر لمحاولة الاتصال بالسيرفر)'
          }
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            serverStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
        >
          <Server className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">
            {serverStatus === 'connected' ? 'سيرفر مركزي' : 'وضع محلي'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </button>

        {/* Hotkeys Modal Trigger Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="عرض اختصارات لوحة المفاتيح (Ctrl+K)"
            className="hidden md:flex items-center gap-1 text-xs text-[#542E1D] bg-[#FAF7F2] hover:bg-[#F3ECE2] px-2.5 py-1.5 rounded-lg border border-[#EDE2D4] font-medium transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#C28B38]" />
            <span className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-[#DAC8B6]">
              Ctrl+K
            </span>
          </button>
        )}

        {/* Cash Safe Balance Badge */}
        <button
          onClick={onOpenSafe}
          title="عرض الخزنة النقدية والحسابات"
          className="flex items-center gap-1.5 bg-[#F6EFE6] hover:bg-[#EFE5D8] text-[#4A2613] px-2 sm:px-3 py-1.5 rounded-lg border border-[#D9C6B2] text-xs font-semibold transition-colors cursor-pointer"
        >
          <Landmark className="w-3.5 h-3.5 text-[#8C4A26] shrink-0" />
          <span className="hidden sm:inline">الخزنة:</span>
          <span className="text-[#2B7A4B] font-mono text-[11px] sm:text-xs">
            {formatCurrency(safeBalance)}
          </span>
        </button>

        {/* Low Stock Alert Badge */}
        {lowStockCount > 0 && (
          <button
            onClick={onOpenLowStock}
            title={`${lowStockCount} منتجات قاربت على النفاد`}
            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
            <span className="font-bold">{lowStockCount}</span>
          </button>
        )}

        {/* Manual Refresh Data */}
        <button
          onClick={onRefreshData}
          title="تحديث البيانات"
          className="p-1.5 sm:p-2 text-[#6B5345] hover:text-[#341B11] hover:bg-[#FAF7F2] rounded-lg transition-colors border border-transparent hover:border-[#E4D7C8] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2 border-r border-[#EAE1D7]">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#522914] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            إر
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-xs font-bold text-[#341B11] leading-tight truncate max-w-[100px]">
              {session.name}
            </div>
            <div className="text-[10px] text-[#2B7A4B] font-semibold">متصل · مدير النظام</div>
          </div>
        </div>
      </div>
    </header>
  );
};

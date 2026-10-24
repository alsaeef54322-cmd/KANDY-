import React, { useState } from 'react';
import { ShoppingCart, Receipt } from 'lucide-react';
import { POSScreen } from '../pos/POSScreen';
import { InvoicesScreen } from '../invoices/InvoicesScreen';
import { UserSession } from '../../types';

interface SalesScreenProps {
  session: UserSession;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'invoices'>('pos');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Tab Bar */}
      <div className="bg-white border-b border-[#EAE1D7] px-3 sm:px-6 pt-2 sm:pt-3 flex items-center justify-between shrink-0 no-print overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pos'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>نقطة البيع (الكاشير السريع)</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'border-[#542E1D] text-[#542E1D]'
                : 'border-transparent text-[#7A5E4F] hover:text-[#341B11]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>سجل الفواتير والمرتجعات</span>
          </button>
        </div>
      </div>

      {/* Screen Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'pos' ? (
          <POSScreen session={session} />
        ) : (
          <InvoicesScreen />
        )}
      </div>
    </div>
  );
};

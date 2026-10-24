import React, { useState, useEffect } from 'react';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { SalesScreen } from './components/sales/SalesScreen';
import { ProductsScreen } from './components/products/ProductsScreen';
import { CategoriesScreen } from './components/categories/CategoriesScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { SuppliersScreen } from './components/suppliers/SuppliersScreen';
import { CustomersScreen } from './components/customers/CustomersScreen';
import { ExpensesScreen } from './components/expenses/ExpensesScreen';
import { PayrollScreen } from './components/payroll/PayrollScreen';
import { SafeScreen } from './components/safe/SafeScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { ToastContainer } from './components/common/Toast';
import { LogOut, AlertTriangle, X, ShieldAlert } from 'lucide-react';

import { db } from './services/storage';
import { UserSession } from './types';

export default function App() {
  const [session, setSession] = useState<UserSession>(() => db.getSession());
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [safeBalance, setSafeBalance] = useState(db.getSafeBalance());
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const refreshState = () => {
    setSafeBalance(db.getSafeBalance());
    const products = db.getProducts();
    const lowCount = products.filter((p) => p.isActive && p.stockQuantity <= p.minStockAlert).length;
    setLowStockCount(lowCount);
    setSession(db.getSession());
  };

  useEffect(() => {
    refreshState();
    const unsub = db.subscribe(refreshState);
    return () => unsub();
  }, []);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    db.setSession(newSession);
    db.addAuditLog('LOGIN', 'User', 'تسجيل دخول ناجح للمدير العام الأستاذ إبراهيم راغب');
  };

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    // 1. Clear session safely in persistent storage
    db.logout();
    // 2. Clear state session to enforce logged-out state
    const loggedOut = db.getSession();
    setSession(loggedOut);
    // 3. Reset internal navigation
    setCurrentTab('dashboard');
    setShowLogoutModal(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Strictly guard: When logged out, render ONLY LoginScreen
  if (!session.isLoggedIn) {
    return (
      <>
        <ToastContainer />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="app-root flex h-screen w-screen overflow-hidden bg-[#FAF7F2] text-[#26160F] font-['Cairo',sans-serif]">
      <ToastContainer />
      {/* 14-Item Sidebar (RTL layout) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        session={session}
        onLogout={handleOpenLogoutModal}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          session={session}
          safeBalance={safeBalance}
          lowStockCount={lowStockCount}
          onOpenSafe={() => setCurrentTab('safe')}
          onOpenLowStock={() => setCurrentTab('inventory')}
          onRefreshData={refreshState}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Active Screen View (Exact 13 Content Sections) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 'dashboard' && <DashboardScreen onNavigate={setCurrentTab} />}
          {currentTab === 'sales' && <SalesScreen session={session} />}
          {currentTab === 'products' && <ProductsScreen />}
          {currentTab === 'categories' && <CategoriesScreen />}
          {currentTab === 'inventory' && <InventoryScreen />}
          {currentTab === 'purchases' && <PurchasesScreen />}
          {currentTab === 'suppliers' && <SuppliersScreen />}
          {currentTab === 'customers' && <CustomersScreen />}
          {currentTab === 'expenses' && <ExpensesScreen />}
          {currentTab === 'payroll' && <PayrollScreen />}
          {currentTab === 'safe' && <SafeScreen />}
          {currentTab === 'reports' && <ReportsScreen />}
          {currentTab === 'settings' && <SettingsScreen />}
        </main>

        {/* Bottom Status / Feature Strip */}
        <footer className="h-7 bg-[#170D08] text-[#A68F80] border-t border-[#341F14] px-4 flex items-center justify-between text-[10px] select-none shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E8B87D]">كاندي | KANDY</span>
            <span>·</span>
            <span>نظام إدارة المحمصة والمبيعات والمخزون والحسابات</span>
            <span>·</span>
            <span>المدير: {session.name}</span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[#8C7A6D]">
            <span>دعم كامل للغة العربية (RTL)</span>
            <span>·</span>
            <span>تصدير فوري لجداول Excel (.xlsx)</span>
            <span>·</span>
            <span>حسابات التكلفة المتوسطة المرجحة بالجرام</span>
            <span>·</span>
            <span>تشغيل محلي مكتبي مؤمن</span>
          </div>
        </footer>
      </div>

      {/* In-App Interactive Logout Confirmation Modal (Reliable in Web, iFrames & Electron) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#D9C6B2] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 bg-[#FAF7F2] border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#341B11]">تأكيد تسجيل الخروج</h3>
              </div>
              <button
                onClick={handleCancelLogout}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg transition-colors cursor-pointer btn-tactile"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#341B11]">
                    هل أنت متأكد من رغبتك في تسجيل الخروج من نظام كاندي؟
                  </p>
                  <p className="text-[11px] text-[#7A5E4F] leading-relaxed">
                    سيتم قفل الجلسة فوراً وإعادتك إلى شاشة تسجيل الدخول. لن يتمكن أي شخص من الوصول إلى الشاشات الداخلية أو البيانات المحاسبية إلا بعد إدخال كلمة المرور الخاصة بالأستاذ إبراهيم راغب.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EAE1D7] text-[11px] text-[#6B5345]">
                <span className="font-bold">ملاحظة أمنية:</span> بيانات الحساب، المنتجات، والعمليات المالية تظل محفوظة ومؤمنة في النظام بالكامل.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#FAF7F2] border-t border-[#EAE1D7] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer btn-tactile"
              >
                إلغاء والعودة للنظام
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer btn-tactile"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>نعم، تسجيل الخروج الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

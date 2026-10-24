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

import { db } from './services/storage';
import { UserSession } from './types';

export default function App() {
  const [session, setSession] = useState<UserSession>(db.getSession());
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [safeBalance, setSafeBalance] = useState(db.getSafeBalance());
  const [lowStockCount, setLowStockCount] = useState(0);

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

  const handleLogout = () => {
    if (confirm('هل ترغب في تسجيل الخروج من نظام كاندي؟')) {
      const loggedOutSession: UserSession = {
        ...session,
        isLoggedIn: false,
      };
      setSession(loggedOutSession);
      db.setSession(loggedOutSession);
    }
  };

  if (!session.isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F2] text-[#26160F] font-['Cairo',sans-serif]">
      {/* 14-Item Sidebar (RTL layout) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        session={session}
        onLogout={handleLogout}
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
    </div>
  );
}

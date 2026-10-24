import { useEffect } from 'react';
import { NavItemKey } from '../components/layout/Sidebar';
import { toast } from '../components/common/Toast';

interface HotkeyOptions {
  currentTab: NavItemKey;
  onNavigate: (tab: NavItemKey) => void;
  onToggleShortcutsModal: () => void;
  onCloseModals?: () => void;
  isLoggedIn: boolean;
}

export const HOTKEY_ITEMS: {
  key: NavItemKey;
  label: string;
  shortcut: string;
  comboLabel: string;
}[] = [
  { key: 'dashboard', label: 'لوحة التحكم', shortcut: '1', comboLabel: 'Ctrl + 1' },
  { key: 'sales', label: 'المبيعات ونقطة البيع', shortcut: '2', comboLabel: 'Ctrl + 2' },
  { key: 'products', label: 'المنتجات والأصناف', shortcut: '3', comboLabel: 'Ctrl + 3' },
  { key: 'categories', label: 'التصنيفات والأقسام', shortcut: '4', comboLabel: 'Ctrl + 4' },
  { key: 'inventory', label: 'المخزون وحركة الجرد', shortcut: '5', comboLabel: 'Ctrl + 5' },
  { key: 'purchases', label: 'فواتير المشتريات', shortcut: '6', comboLabel: 'Ctrl + 6' },
  { key: 'suppliers', label: 'الموردون والمستحقات', shortcut: '7', comboLabel: 'Ctrl + 7' },
  { key: 'customers', label: 'العملاء والديون', shortcut: '8', comboLabel: 'Ctrl + 8' },
  { key: 'expenses', label: 'المصروفات اليومية', shortcut: '9', comboLabel: 'Ctrl + 9' },
  { key: 'safe', label: 'الخزنة والسيولة', shortcut: '0', comboLabel: 'Ctrl + 0' },
  { key: 'closing', label: 'إقفال اليومية والمطابقة', shortcut: 'C', comboLabel: 'Alt + C' },
  { key: 'payroll', label: 'الرواتب والسلف', shortcut: 'P', comboLabel: 'Alt + P' },
  { key: 'reports', label: 'التقارير والأرباح', shortcut: 'R', comboLabel: 'Alt + R' },
  { key: 'settings', label: 'إعدادات النظام', shortcut: 'S', comboLabel: 'Alt + S' },
];

export function useGlobalHotkeys({
  currentTab,
  onNavigate,
  onToggleShortcutsModal,
  onCloseModals,
  isLoggedIn,
}: HotkeyOptions) {
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      // 1. Modal close with Escape
      if (e.key === 'Escape') {
        if (onCloseModals) {
          onCloseModals();
        }
        return;
      }

      // 2. Help / Shortcuts modal (Ctrl+K, F1, or '?' when not in input)
      if (
        (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key === '؟') ||
        e.key === 'F1' ||
        (!isInput && e.key === '?')
      ) {
        e.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      const hasCtrl = e.ctrlKey || e.metaKey;
      const hasAlt = e.altKey;

      // 3. Screen navigation via Ctrl + Number (1-9, 0)
      if (hasCtrl && !hasAlt) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            onNavigate('dashboard');
            toast.info('تم الانتقال إلى لوحة التحكم (Ctrl+1)');
            break;
          case '2':
            e.preventDefault();
            onNavigate('sales');
            toast.info('تم الانتقال إلى المبيعات ونقطة البيع (Ctrl+2)');
            break;
          case '3':
            e.preventDefault();
            onNavigate('products');
            toast.info('تم الانتقال إلى قائمة المنتجات (Ctrl+3)');
            break;
          case '4':
            e.preventDefault();
            onNavigate('categories');
            toast.info('تم الانتقال إلى التصنيفات (Ctrl+4)');
            break;
          case '5':
            e.preventDefault();
            onNavigate('inventory');
            toast.info('تم الانتقال إلى المخزون والجرد (Ctrl+5)');
            break;
          case '6':
            e.preventDefault();
            onNavigate('purchases');
            toast.info('تم الانتقال إلى فواتير المشتريات (Ctrl+6)');
            break;
          case '7':
            e.preventDefault();
            onNavigate('suppliers');
            toast.info('تم الانتقال إلى الموردين (Ctrl+7)');
            break;
          case '8':
            e.preventDefault();
            onNavigate('customers');
            toast.info('تم الانتقال إلى العملاء وكشوف الحساب (Ctrl+8)');
            break;
          case '9':
            e.preventDefault();
            onNavigate('expenses');
            toast.info('تم الانتقال إلى المصروفات (Ctrl+9)');
            break;
          case '0':
            e.preventDefault();
            onNavigate('safe');
            toast.info('تم الانتقال إلى الخزنة النقدية (Ctrl+0)');
            break;
          case ',':
            e.preventDefault();
            onNavigate('settings');
            toast.info('تم الانتقال إلى الإعدادات (Ctrl+,)');
            break;
        }
      }

      // 4. Navigation via Alt + Key (P for payroll, R for reports, S for settings)
      if (hasAlt && !hasCtrl) {
        const lowerKey = e.key.toLowerCase();
        if (lowerKey === 'c' || e.key === 'ؤ') {
          e.preventDefault();
          onNavigate('closing');
          toast.info('تم الانتقال إلى إقفال اليومية والمطابقة (Alt+C)');
        } else if (lowerKey === 'p' || e.key === 'ح') {
          e.preventDefault();
          onNavigate('payroll');
          toast.info('تم الانتقال إلى الرواتب والسلف (Alt+P)');
        } else if (lowerKey === 'r' || e.key === 'ق') {
          e.preventDefault();
          onNavigate('reports');
          toast.info('تم الانتقال إلى التقارير والأرباح (Alt+R)');
        } else if (lowerKey === 's' || e.key === 'س') {
          e.preventDefault();
          onNavigate('settings');
          toast.info('تم الانتقال إلى الإعدادات (Alt+S)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, onNavigate, onToggleShortcutsModal, onCloseModals, isLoggedIn]);
}

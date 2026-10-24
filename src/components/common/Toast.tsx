import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsList: ToastItem[] = [];
const listeners: Set<ToastListener> = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toastsList]));
};

export const toast = {
  success: (message: string, durationMs = 3000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    toastsList = [...toastsList, { id, type: 'success', message }];
    notifyListeners();
    setTimeout(() => {
      toast.remove(id);
    }, durationMs);
  },
  error: (message: string, durationMs = 4000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    toastsList = [...toastsList, { id, type: 'error', message }];
    notifyListeners();
    setTimeout(() => {
      toast.remove(id);
    }, durationMs);
  },
  info: (message: string, durationMs = 3000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    toastsList = [...toastsList, { id, type: 'info', message }];
    notifyListeners();
    setTimeout(() => {
      toast.remove(id);
    }, durationMs);
  },
  remove: (id: string) => {
    toastsList = toastsList.filter((t) => t.id !== id);
    notifyListeners();
  },
};

export const ToastContainer: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleUpdate = (updated: ToastItem[]) => {
      setItems(updated);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 pointer-events-none no-print">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold animate-slide-in-left transition-all ${
            item.type === 'success'
              ? 'bg-[#1C3B29] text-[#E8F5EE] border-[#2B7A4B]/60 shadow-[#1C3B29]/20'
              : item.type === 'error'
              ? 'bg-[#4A1717] text-[#FDE8E8] border-[#A83232]/60 shadow-[#4A1717]/20'
              : 'bg-[#341B11] text-[#FDF8F3] border-[#7A4526]/60 shadow-[#341B11]/20'
          }`}
        >
          {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />}
          {item.type === 'error' && <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />}
          {item.type === 'info' && <Info className="w-4 h-4 text-[#FDE68A] shrink-0" />}
          <span className="leading-tight">{item.message}</span>
          <button
            onClick={() => toast.remove(item.id)}
            className="p-0.5 ml-1 text-white/60 hover:text-white rounded transition-colors cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

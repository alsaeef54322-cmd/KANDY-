import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-6 text-center font-['Cairo',sans-serif]" dir="rtl">
          <div className="bg-white p-8 rounded-2xl border border-[#DAC8B6] shadow-xl max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-[#341B11]">حدث تنبيه أثناء التشغيل</h2>
            <p className="text-xs text-[#7A5E4F]">
              يمكنك إعادة تحميل الصفحة لاستئناف العمل بكل سهولة دون فقدان أي بيانات محفوظة.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-[#542E1D] hover:bg-[#3D1F12] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

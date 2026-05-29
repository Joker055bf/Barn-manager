import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      // Keep app language and theme if possible, but clear session
      sessionStorage.clear();
      window.location.href = window.location.origin + window.location.pathname;
    } catch (e) {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isArabic = !localStorage.getItem('rai_lang') || localStorage.getItem('rai_lang') === 'ar';
      
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-6 bg-[#fcfbf4] dark:bg-slate-950 text-gray-800 dark:text-gray-100 font-sans"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/30 rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col items-center text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-md shadow-red-500/5 animate-bounce-subtle">
              <AlertOctagon size={44} />
            </div>

            {/* Error Title */}
            <h1 className="text-2xl md:text-3xl font-black text-[#3E2723] dark:text-white tracking-tight mb-3">
              {isArabic ? 'عذراً، حدث خطأ غير متوقع' : 'Oops, an unexpected error occurred'}
            </h1>

            {/* Explanation */}
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
              {isArabic 
                ? 'لقد واجه التطبيق مشكلة مفاجئة أثناء تشغيل الصفحة. لا داعي للقلق، يمكنك محاولة إعادة تشغيل الصفحة أو إعادة تعيين التطبيق بأمان.'
                : 'The application encountered an unexpected issue. Don\'t worry, you can try reloading the page or resetting the application safely.'}
            </p>

            {/* Error Message Details (collapsible or small) */}
            {this.state.error && (
              <div className="w-full bg-gray-50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-right mb-8 max-h-32 overflow-y-auto font-mono text-[10px] text-red-600 dark:text-red-400">
                <span className="font-black text-gray-400 block mb-1 text-[9px] uppercase tracking-wider">
                  {isArabic ? 'تفاصيل الخطأ البرمجي' : 'Error Details'}
                </span>
                <p className="whitespace-pre-wrap break-all leading-normal">{this.state.error.toString()}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 py-4 bg-[#795548] hover:bg-[#5d4037] text-white rounded-2xl font-black shadow-lg shadow-[#795548]/10 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
              >
                <RotateCcw size={18} />
                <span>{isArabic ? 'إعادة تحميل الصفحة' : 'Reload Page'}</span>
              </button>
              
              <button
                onClick={this.handleReset}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-200 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
              >
                <Home size={18} />
                <span>{isArabic ? 'إعادة تعيين الجلسة والبيانات' : 'Reset Session & Data'}</span>
              </button>
            </div>

            {/* Footer */}
            <span className="text-[10px] text-gray-400 font-bold mt-6 uppercase tracking-wider">
              Raai App • {isArabic ? 'مدير الحظائر الذكي' : 'Smart Barn Manager'}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

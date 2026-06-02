import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

export type AlertType = 'success' | 'warning' | 'error' | 'confirm';

interface CustomAlertProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'تم',
  cancelLabel = 'إلغاء'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-emerald-500" size={60} />;
      case 'warning':
      case 'confirm':
        return <AlertTriangle className="text-amber-500" size={60} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={60} />;
      default:
        return null;
    }
  };

  const getThemeColor = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'warning':
      case 'confirm': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-[#795548]';
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-scale-in border border-white/20">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-6 animate-bounce-subtle">
            {getIcon()}
          </div>
          
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
            {title}
          </h3>
          
          <div className="text-gray-500 dark:text-slate-400 font-bold leading-relaxed mb-8 w-full">
            {message}
          </div>
          
          <div className="flex gap-3 w-full">
            {type === 'confirm' && onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`flex-1 py-4 ${getThemeColor()} text-white rounded-2xl font-black shadow-lg shadow-current/20 hover:opacity-90 transition-all active:scale-95`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;

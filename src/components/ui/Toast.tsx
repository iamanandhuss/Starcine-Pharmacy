import React from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  className = '',
}) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-brand-500" />,
  };

  const themeClasses = {
    success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30 text-green-800 dark:text-green-300',
    error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-300',
    warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-300',
    info: 'bg-brand-50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800/30 text-brand-800 dark:text-brand-300',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-xl shadow-sm max-w-md w-full animate-in slide-in-from-top-3 duration-250 ${themeClasses[type]} ${className}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium leading-5">{message}</div>
      {onClose && (
        <div className="flex-shrink-0 -mt-1 -mr-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 rounded-full text-current hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
            leftIcon={<X className="h-4 w-4" />}
          >
            <span className="sr-only">Close</span>
          </Button>
        </div>
      )}
    </div>
  );
};

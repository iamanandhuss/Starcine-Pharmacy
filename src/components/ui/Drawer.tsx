import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/40 dark:bg-dark-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        {/* Drawer Panel */}
        <div
          className="w-screen max-w-md bg-white dark:bg-dark-900 border-l border-dark-200 dark:border-dark-800 flex flex-col shadow-xl animate-in slide-in-from-right duration-250"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-dark-100 dark:border-dark-800">
            <h3 className="text-base font-bold text-dark-900 dark:text-white">
              {title}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 rounded-full text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
              leftIcon={<X className="h-5 w-5" />}
            >
              <span className="sr-only">Close drawer</span>
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 text-sm text-dark-600 dark:text-dark-350">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-5 bg-dark-50/50 dark:bg-dark-900/50 border-t border-dark-100 dark:border-dark-800">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

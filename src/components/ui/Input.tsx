import React, { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      containerClassName = '',
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold tracking-wide uppercase text-dark-500 dark:text-dark-400"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-dark-400 dark:text-dark-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={`w-full text-sm py-2.5 px-4 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 placeholder:text-dark-400 dark:placeholder:text-dark-600 disabled:opacity-50 disabled:bg-dark-50 dark:disabled:bg-dark-950
              ${leftIcon ? 'pl-11' : ''} 
              ${rightIcon ? 'pr-11' : ''} 
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} 
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-dark-400 dark:text-dark-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-xs text-dark-400 dark:text-dark-500">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

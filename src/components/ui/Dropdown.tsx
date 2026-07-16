import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const alignments = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer select-none">
        {trigger}
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className={`absolute mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 focus:outline-none z-40 transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${alignments[align]}`}
        >
          <div className="py-1 flex flex-col">{children}</div>
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps extends React.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  icon,
  href,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors duration-150 cursor-pointer';

  if (href) {
    return (
      <a
        href={href}
        className={`${baseStyles} ${className}`}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {icon && <span className="text-dark-400 dark:text-dark-500">{icon}</span>}
        <span>{children}</span>
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${className}`}
      {...props}
    >
      {icon && <span className="text-dark-400 dark:text-dark-500">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

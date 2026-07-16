import React from 'react';
import type { UserRole } from '../../context/AuthContext';

interface RoleBadgeProps {
  role: UserRole | string;
  className?: string;
}

const ROLE_CONFIG: Record<string, { label: string; classes: string }> = {
  super_admin: {
    label: 'Super Admin',
    classes: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30',
  },
  store_admin: {
    label: 'Store Admin',
    classes: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  },
  employee: {
    label: 'Employee',
    classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    classes: 'bg-dark-100 text-dark-500 border-dark-200 dark:bg-dark-800 dark:text-dark-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
};

/** Badge that shows the role_name string from the DB (e.g. "Pharmacist", "Store Admin") */
export const RoleNameBadge: React.FC<{ roleName: string; className?: string }> = ({ roleName, className = '' }) => {
  const lowerName = roleName.toLowerCase().replace(/\s+/g, '_');
  const config = ROLE_CONFIG[lowerName] ?? {
    label: roleName,
    classes: 'bg-dark-100 text-dark-500 border-dark-200 dark:bg-dark-800 dark:text-dark-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
};

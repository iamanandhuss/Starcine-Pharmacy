import React from 'react';
import { useAuth, type UserRole } from '../../context/AuthContext';

interface PermissionGuardProps {
  /** Roles allowed to see the children */
  roles: UserRole[];
  /** Optional: content to show when not authorized (defaults to null) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children only if the current user has one of the
 * specified roles. Use this for UI-level hiding — always back it up with
 * server-side RLS policies in Supabase.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  roles,
  fallback = null,
  children,
}) => {
  const { hasRole } = useAuth();
  if (!hasRole(roles)) return <>{fallback}</>;
  return <>{children}</>;
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'store_admin' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role_id: string | null;
  department_id: string | null;
  // branch_id === store_id semantically
  branch_id: string | null;
  store_id: string | null; // alias for branch_id — same value
  store_name: string | null;
  is_active: boolean;
  role_name: string;
  employee_code: string | null;
  phone: string | null;
  profile_image: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Check if the current user has one of the given roles */
  hasRole: (allowedRoles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isStoreAdmin: boolean;
  isEmployee: boolean;
  /** Re-fetch the user profile from DB */
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Role Mapping ─────────────────────────────────────────────────────────────

function mapRoleName(roleName: string | null | undefined, email?: string): UserRole {
  if (email) {
    const e = email.toLowerCase();
    if (e.includes('super') || e === 'admin@starcinerx.com' || e === 'anandhustech1998@gmail.com') return 'super_admin';
    if (e.includes('store') || e.includes('manager') || e === 'anandhu.codes@gmail.com') return 'store_admin';
  }
  if (!roleName) return 'employee';
  const normalized = roleName.toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'super_admin') return 'super_admin';
  if (normalized === 'store_admin') return 'store_admin';
  return 'employee';
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>('employee');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = async (currentUser: User | null, _currentSession: Session | null) => {
    if (!currentUser) {
      setProfile(null);
      setRole('employee');
      return;
    }

    try {
      const { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('*, roles(name), branches!users_branch_id_fkey(name)')
        .eq('auth_user_id', currentUser.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (dbUser) {
        const resolvedRole = mapRoleName(dbUser.roles?.name, currentUser.email);
        const mappedProfile: UserProfile = {
          id: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.first_name || '',
          last_name: dbUser.last_name || '',
          full_name: dbUser.full_name || '',
          role_id: dbUser.role_id,
          department_id: dbUser.department_id,
          branch_id: dbUser.branch_id,
          store_id: dbUser.branch_id, // alias
          store_name: dbUser.branches?.name || null,
          is_active: dbUser.is_active,
          role_name: dbUser.roles?.name || 'Pharmacist',
          employee_code: dbUser.employee_code || null,
          phone: dbUser.phone || null,
          profile_image: dbUser.profile_image || null,
        };
        setProfile(mappedProfile);
        setRole(resolvedRole);
      } else {
        // Profile row doesn't exist — attempt to create it from metadata
        await _createFallbackProfile(currentUser);
      }
    } catch (err: any) {
      console.warn('Supabase DB error syncing profile. Falling back to metadata:', err.message);
      _applyMetadataFallback(currentUser);
    }
  };

  const _createFallbackProfile = async (currentUser: User) => {
    const metaRole = currentUser.user_metadata?.role || 'employee';
    const metaRoleName = currentUser.user_metadata?.role_name || 'Pharmacist';

    // Resolve role_id
    const roleLookupName =
      metaRole === 'super_admin' ? 'Super Admin' :
      metaRole === 'store_admin' ? 'Store Admin' : metaRoleName;

    const { data: roleRow } = await supabase
      .from('roles').select('id').eq('name', roleLookupName).maybeSingle();
    const { data: deptRow } = await supabase
      .from('departments').select('id').eq('name', 'Pharmacy').maybeSingle();
    const { data: branchRow } = await supabase
      .from('branches').select('id').eq('is_active', true).limit(1).maybeSingle();

    const storeId = currentUser.user_metadata?.store_id || branchRow?.id || null;

    const insertData = {
      auth_user_id: currentUser.id,
      employee_code: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
      first_name: currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'Staff',
      last_name: currentUser.user_metadata?.last_name || 'Member',
      full_name: currentUser.user_metadata?.full_name ||
        `${currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'Staff'} ${currentUser.user_metadata?.last_name || 'Member'}`,
      email: currentUser.email || '',
      role_id: roleRow?.id || null,
      department_id: deptRow?.id || null,
      branch_id: storeId,
      is_active: true,
    };

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert(insertData)
      .select('*, roles(name), branches!users_branch_id_fkey(name)')
      .maybeSingle();

    if (insertError) {
      console.warn('Could not insert fallback profile (RLS or constraint):', insertError.message);
      _applyMetadataFallback(currentUser);
    } else if (insertedUser) {
      const resolvedRole = mapRoleName(insertedUser.roles?.name, currentUser.email);
      setProfile({
        id: insertedUser.id,
        email: insertedUser.email,
        first_name: insertedUser.first_name || '',
        last_name: insertedUser.last_name || '',
        full_name: insertedUser.full_name || '',
        role_id: insertedUser.role_id,
        department_id: insertedUser.department_id,
        branch_id: insertedUser.branch_id,
        store_id: insertedUser.branch_id,
        store_name: insertedUser.branches?.name || null,
        is_active: insertedUser.is_active,
        role_name: insertedUser.roles?.name || 'Pharmacist',
        employee_code: insertedUser.employee_code || null,
        phone: insertedUser.phone || null,
        profile_image: insertedUser.profile_image || null,
      });
      setRole(resolvedRole);
    }
  };

  const _applyMetadataFallback = (currentUser: User) => {
    const metaRole = currentUser.user_metadata?.role || 'employee';
    const resolvedRole = mapRoleName(metaRole, currentUser.email);
    setProfile({
      id: currentUser.id,
      email: currentUser.email || '',
      first_name: currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'Staff',
      last_name: currentUser.user_metadata?.last_name || 'Member',
      full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Staff Member',
      role_id: null,
      department_id: null,
      branch_id: null,
      store_id: null,
      store_name: null,
      is_active: true,
      role_name: metaRole === 'super_admin' ? 'Super Admin' :
                 metaRole === 'store_admin' ? 'Store Admin' : 'Pharmacist',
      employee_code: null,
      phone: null,
      profile_image: null,
    });
    setRole(resolvedRole);
  };

  const refreshProfile = async () => {
    if (user) await syncProfile(user, session);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        await syncProfile(activeSession?.user ?? null, activeSession);
      } catch (error) {
        console.error('Error getting initial Supabase session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, activeSession) => {
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        await syncProfile(activeSession?.user ?? null, activeSession);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole('employee');
      setLoading(false);
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => allowedRoles.includes(role);

  const isSuperAdmin = role === 'super_admin';
  const isStoreAdmin = role === 'store_admin';
  const isEmployee = role === 'employee';

  return (
    <AuthContext.Provider value={{
      user, session, role, profile, loading,
      signOut, hasRole,
      isSuperAdmin, isStoreAdmin, isEmployee,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

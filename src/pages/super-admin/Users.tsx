import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Ban, Key, Plus, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

// Initialize a non-persisting Supabase client for safe admin signups
const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

interface UserItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  is_active: boolean;
  role_id: string | null;
  branch_id: string | null;
  roles?: { name: string } | null;
  branches?: { name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

const SELECT_CLASS = 'w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500';
const LABEL_CLASS = 'block text-[10px] font-bold text-dark-400 uppercase mb-1';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [targetBranchId, setTargetBranchId] = useState('');

  // Create User States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createRoleId, setCreateRoleId] = useState('');
  const [createBranchId, setCreateBranchId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes, rolesRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, email, first_name, last_name, full_name, is_active, role_id, branch_id, roles(name), branches!users_branch_id_fkey(name)')
          .order('created_at', { ascending: false }),
        supabase.from('branches').select('id, name').order('name', { ascending: true }),
        supabase.from('roles').select('id, name, description').order('name', { ascending: true }),
      ]);

      if (usersRes.error) { console.error('Users error:', usersRes.error); throw usersRes.error; }
      if (branchesRes.error) { console.error('Branches error:', branchesRes.error); throw branchesRes.error; }
      if (rolesRes.error) { console.error('Roles error:', rolesRes.error); }

      const mappedUsers = (usersRes.data || []).map((item: any) => {
        let rVal = null;
        if (item.roles) {
          rVal = Array.isArray(item.roles) ? item.roles[0] : item.roles;
        }
        let bVal = null;
        if (item.branches) {
          bVal = Array.isArray(item.branches) ? item.branches[0] : item.branches;
        }
        return {
          id: item.id,
          email: item.email,
          first_name: item.first_name,
          last_name: item.last_name,
          full_name: item.full_name,
          is_active: item.is_active,
          role_id: item.role_id,
          branch_id: item.branch_id,
          roles: rVal ? { name: String(rVal.name) } : null,
          branches: bVal ? { name: String(bVal.name) } : null
        };
      });
      setUsers(mappedUsers);
      setBranches(branchesRes.data || []);
      setRoles(rolesRes.data || []);

      // Set defaults for create modal
      if (rolesRes.data && rolesRes.data.length > 0 && !createRoleId) {
        const storeAdminRole = rolesRes.data.find(r => r.name === 'Store Admin');
        setCreateRoleId(storeAdminRole?.id || rolesRes.data[0].id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clearCreateForm = () => {
    setCreateEmail('');
    setCreatePassword('');
    setCreateFirstName('');
    setCreateLastName('');
    setCreateBranchId('');
    setCreateError(null);
    setShowPassword(false);
    // Reset role to Store Admin default
    const storeAdminRole = roles.find(r => r.name === 'Store Admin');
    setCreateRoleId(storeAdminRole?.id || (roles[0]?.id ?? ''));
  };

  const handleToggleStatus = async (userItem: UserItem) => {
    const newStatus = !userItem.is_active;
    try {
      const { error } = await supabase.from('users').update({ is_active: newStatus }).eq('id', userItem.id);
      if (error) throw error;
      showToast(`User account ${newStatus ? 'activated' : 'suspended'} successfully`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenTransfer = (userItem: UserItem) => {
    setSelectedUser(userItem);
    setTargetBranchId(userItem.branch_id || '');
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ branch_id: targetBranchId || null })
        .eq('id', selectedUser.id);
      if (error) throw error;
      showToast(`Transferred ${selectedUser.full_name || selectedUser.email} successfully`);
      setIsTransferModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Determine if selected role needs a branch
  const selectedRoleName = roles.find(r => r.id === createRoleId)?.name || '';
  const needsBranch = selectedRoleName !== 'Super Admin';

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validation
    if (!createFirstName.trim()) { setCreateError('First name is required.'); return; }
    if (!createLastName.trim()) { setCreateError('Last name is required.'); return; }
    if (!createEmail.trim()) { setCreateError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail)) { setCreateError('Please enter a valid email address.'); return; }
    if (!createPassword || createPassword.length < 6) { setCreateError('Password must be at least 6 characters.'); return; }
    if (!createRoleId) { setCreateError('Please select a role.'); return; }
    if (needsBranch && !createBranchId) { setCreateError('Please select a branch for this role.'); return; }

    setCreating(true);
    try {
      // Try to create the user directly via database RPC first (bypassing SMTP to avoid rate limits)
      console.log('Attempting direct creation via RPC...');
      const { error: rpcError } = await supabase.rpc('create_new_employee_rpc', {
        p_email: createEmail.trim(),
        p_password: createPassword,
        p_first_name: createFirstName.trim(),
        p_last_name: createLastName.trim(),
        p_role_id: createRoleId,
        p_department_id: null,
        p_branch_id: createBranchId || null,
        p_employee_code: 'EMP-' + Math.floor(100000 + Math.random() * 900000),
      });

      if (!rpcError) {
        showToast(`✅ User ${createEmail} created successfully!`);
        setIsCreateModalOpen(false);
        clearCreateForm();
        fetchData();
        return;
      }

      console.warn('RPC direct creation failed. Falling back to standard signUp:', rpcError.message);

      // If it is a validation error from inside the function, raise it directly
      if (rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('does not exist')) {
        throw new Error(rpcError.message);
      }

      // Step 1: Create the auth user with signUp using tempSupabase
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: createEmail.trim(),
        password: createPassword,
        options: {
          data: {
            first_name: createFirstName.trim(),
            last_name: createLastName.trim(),
            full_name: `${createFirstName.trim()} ${createLastName.trim()}`,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user.');

      // Check for email enumeration protection (empty identities array)
      const identities = authData.user.identities;
      if (identities && identities.length === 0) {
        throw new Error('This email address is already in use by another user.');
      }

      const newAuthUserId = authData.user.id;

      // Step 2: The trigger will auto-create a public.users record.
      // We upsert to ensure role and branch are correctly set.
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: newAuthUserId,
          email: createEmail.trim(),
          first_name: createFirstName.trim(),
          last_name: createLastName.trim(),
          full_name: `${createFirstName.trim()} ${createLastName.trim()}`,
          role_id: createRoleId,
          branch_id: createBranchId || null,
          is_active: true,
          employee_code: 'EMP-' + Math.floor(100000 + Math.random() * 900000),
        }, { onConflict: 'auth_user_id' });

      if (profileError) {
        console.warn('Profile upsert warning (may be RLS):', profileError.message);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      showToast(`✅ User ${createEmail} created successfully!`);
      setIsCreateModalOpen(false);
      clearCreateForm();
      fetchData();
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      showToast(`Password reset link sent to ${email}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">👨‍💼 Administrator & User Control</h1>
          <p className="text-xs text-dark-500">Manage cross-branch users, adjust role claims, transfer employees, or suspend credentials</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Refresh</Button>
          <Button onClick={() => { clearCreateForm(); setIsCreateModalOpen(true); }} leftIcon={<Plus className="h-4 w-4" />}>
            Create User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Syncing platform user credentials...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-xs text-dark-400">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">User details</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Assigned Role</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Branch / Location</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {users.map(userItem => (
                    <tr key={userItem.id} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-dark-800 dark:text-dark-200">{userItem.full_name || 'Anonymous User'}</p>
                        <p className="text-[10px] text-dark-400 mt-0.5">{userItem.email}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold 
                          ${userItem.roles?.name === 'Super Admin' ? 'bg-purple-500/10 text-purple-600' : userItem.roles?.name === 'Store Admin' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}
                        `}>
                          {userItem.roles?.name || 'Staff'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-medium text-dark-700 dark:text-dark-300">
                        {userItem.branches?.name || (userItem.roles?.name === 'Super Admin' ? 'Global Platform Admin' : 'Unassigned Branch')}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${userItem.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                          {userItem.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button onClick={() => handleOpenTransfer(userItem)} title="Transfer Branch" className="p-1.5 text-dark-400 hover:text-brand-500 hover:bg-dark-50 rounded-md transition-colors">
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleResetPassword(userItem.email)} title="Send Password Reset" className="p-1.5 text-dark-400 hover:text-yellow-500 hover:bg-dark-50 rounded-md transition-colors">
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(userItem)}
                          title={userItem.is_active ? 'Suspend Account' : 'Activate Account'}
                          className={`p-1.5 rounded-md transition-colors ${userItem.is_active ? 'text-dark-400 hover:text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                        >
                          {userItem.is_active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Transfer Modal */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="✈️ Transfer User Branch Assignment">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <p className="text-xs text-dark-500">
            Transferring <strong>{selectedUser?.full_name || selectedUser?.email}</strong> to another branch will automatically update their store-scoped operations and report filters.
          </p>
          <div>
            <label className={LABEL_CLASS}>Target Pharmacy Branch</label>
            <select value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)} className={SELECT_CLASS}>
              <option value="">No Store / Global Platform</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
            <Button type="submit">Approve Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); clearCreateForm(); }} title="➕ Create New User" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">

          {/* Error Banner */}
          {createError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
              <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{createError}</p>
            </div>
          )}

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              placeholder="John"
              value={createFirstName}
              onChange={e => { setCreateFirstName(e.target.value); setCreateError(null); }}
            />
            <Input
              label="Last Name *"
              placeholder="Doe"
              value={createLastName}
              onChange={e => { setCreateLastName(e.target.value); setCreateError(null); }}
            />
          </div>

          {/* Email */}
          <Input
            label="Email Address *"
            type="email"
            placeholder="user@starcinerx.com"
            value={createEmail}
            onChange={e => { setCreateEmail(e.target.value); setCreateError(null); }}
          />

          {/* Password */}
          <div>
            <label className={LABEL_CLASS}>Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={createPassword}
                onChange={e => { setCreatePassword(e.target.value); setCreateError(null); }}
                className="w-full text-xs p-2.5 pr-9 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Role Dropdown — from DB */}
          <div>
            <label className={LABEL_CLASS}>Role *</label>
            <select
              value={createRoleId}
              onChange={e => { setCreateRoleId(e.target.value); setCreateBranchId(''); setCreateError(null); }}
              className={SELECT_CLASS}
            >
              <option value="">{roles.length === 0 ? '⏳ Loading roles...' : '— Select a role —'}</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {roles.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">
                Roles not loading? Run the SQL migration then{' '}
                <button type="button" onClick={fetchData} className="underline font-bold">click to refresh</button>.
              </p>
            )}
          </div>

          {/* Branch Dropdown — always visible */}
          {needsBranch && (
            <div>
              <label className={LABEL_CLASS}>Assigned Branch *</label>
              <select
                value={createBranchId}
                onChange={e => { setCreateBranchId(e.target.value); setCreateError(null); }}
                className={`${SELECT_CLASS} ${createError && !createBranchId ? 'border-red-400 dark:border-red-600' : ''}`}
              >
                <option value="">{branches.length === 0 ? '⏳ Loading branches...' : '— Select a branch —'}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {branches.length === 0 && (
                <p className="text-[10px] text-amber-500 mt-1">
                  Branches not loading? Run the SQL fix in Supabase then{' '}
                  <button type="button" onClick={fetchData} className="underline font-bold">click to refresh</button>.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => { setIsCreateModalOpen(false); clearCreateForm(); }}>Cancel</Button>
            <Button type="submit" isLoading={creating}>Create User</Button>
          </div>
        </form>
      </Modal>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

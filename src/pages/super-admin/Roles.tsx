import React, { useEffect, useState } from 'react';
import { ShieldCheck, Check, Info, Lock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface PermissionRow {
  module: string;
  description: string;
  super_admin: boolean;
  store_admin: boolean;
  pharmacist: boolean;
  cashier: boolean;
  delivery_staff: boolean;
}

export const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  // Simulation permissions matrix state
  const [matrix, setMatrix] = useState<PermissionRow[]>([
    { module: 'Store Blueprint Designer', description: 'Create and publish store layout blueprints', super_admin: true, store_admin: false, pharmacist: false, cashier: false, delivery_staff: false },
    { module: 'Store Branch Creation', description: 'Add, edit, or deactivate physical store branches', super_admin: true, store_admin: false, pharmacist: false, cashier: false, delivery_staff: false },
    { module: 'Store Admin Creation', description: 'Invite and assign Store Administrators', super_admin: true, store_admin: false, pharmacist: false, cashier: false, delivery_staff: false },
    { module: 'Employee Management', description: 'Hire, edit, or suspend branch employees', super_admin: true, store_admin: true, pharmacist: false, cashier: false, delivery_staff: false },
    { module: 'Shift Assignments', description: 'Schedule shifts, grace times, and leaves', super_admin: true, store_admin: true, pharmacist: false, cashier: false, delivery_staff: false },
    { module: 'Grooming Approvals', description: 'Review and approve grooming photo checks', super_admin: true, store_admin: true, pharmacist: false, cashier: false, delivery_staff: false },
    { module: 'Task Assignments', description: 'Delegate tasks and monitor completion status', super_admin: true, store_admin: true, pharmacist: true, cashier: false, delivery_staff: false },
    { module: 'Order & Billing POS', description: 'Dispense medications and handle payment registers', super_admin: false, store_admin: true, pharmacist: true, cashier: true, delivery_staff: false },
    { module: 'Deliveries Logistics', description: 'Assign drivers and fulfill home deliveries', super_admin: true, store_admin: true, pharmacist: true, cashier: false, delivery_staff: true },
  ]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleTogglePermission = (index: number, roleKey: keyof Omit<PermissionRow, 'module' | 'description'>) => {
    if (roleKey === 'super_admin') {
      showToast('Super Admin permissions are hard-coded for platform safety and cannot be revoked', 'error');
      return;
    }
    setMatrix(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [roleKey]: !row[roleKey] };
      }
      return row;
    }));
    showToast('Permission updated (Simulation mode)');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">👤 Role & Permission Matrix</h1>
          <p className="text-xs text-dark-500">Configure claims, system privileges, and route permissions across employee tiers</p>
        </div>
        <Button
          leftIcon={<Lock className="h-4 w-4" />}
          variant="outline"
          onClick={() => showToast('Role creation is locked to default PharmacyOps specifications')}
        >
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-xs text-dark-400 py-4">Loading roles...</div>
        ) : (
          roles.map(role => (
            <Card key={role.id} className="hover:shadow-md transition-all">
              <Card.Content className="p-3 text-center space-y-1">
                <span className="inline-block p-2 bg-purple-500/10 text-purple-600 rounded-full mb-1">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h4 className="text-xs font-black text-dark-800 dark:text-dark-200 truncate">{role.name}</h4>
                <p className="text-[9px] text-dark-400 line-clamp-2 h-6 leading-tight">
                  {role.description || 'Pharmacy operational tier.'}
                </p>
              </Card.Content>
            </Card>
          ))
        )}
      </div>

      {/* Permission Table */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2 text-xs">
            <Info className="h-4 w-4 text-brand-500" />
            Module Permissions Configuration
          </Card.Title>
          <Card.Description>Click individual checks to toggle modular access keys for testing simulations</Card.Description>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                <tr>
                  <th className="px-4 py-3 font-bold text-dark-500 uppercase w-1/4">Module / Feature</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Super Admin</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Store Admin</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Pharmacist</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Cashier</th>
                  <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Delivery Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {matrix.map((row, idx) => (
                  <tr key={row.module} className="hover:bg-dark-50/20">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-dark-800 dark:text-dark-200">{row.module}</p>
                      <p className="text-[10px] text-dark-400 mt-0.5">{row.description}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button onClick={() => handleTogglePermission(idx, 'super_admin')} className={`p-1 rounded ${row.super_admin ? 'bg-purple-500/10 text-purple-600' : 'bg-dark-100 text-dark-400'}`}>
                        <Check className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button onClick={() => handleTogglePermission(idx, 'store_admin')} className={`p-1 rounded ${row.store_admin ? 'bg-blue-500/10 text-blue-600' : 'bg-dark-100 text-dark-400'}`}>
                        <Check className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button onClick={() => handleTogglePermission(idx, 'pharmacist')} className={`p-1 rounded ${row.pharmacist ? 'bg-green-500/10 text-green-600' : 'bg-dark-100 text-dark-400'}`}>
                        <Check className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button onClick={() => handleTogglePermission(idx, 'cashier')} className={`p-1 rounded ${row.cashier ? 'bg-green-500/10 text-green-600' : 'bg-dark-100 text-dark-400'}`}>
                        <Check className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <button onClick={() => handleTogglePermission(idx, 'delivery_staff')} className={`p-1 rounded ${row.delivery_staff ? 'bg-green-500/10 text-green-600' : 'bg-dark-100 text-dark-400'}`}>
                        <Check className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

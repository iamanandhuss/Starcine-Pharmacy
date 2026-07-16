import React, { useEffect, useState } from 'react';
import { Store, Plus, Edit2, Trash2, CheckCircle, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

interface Branch {
  id: string;
  name: string;
  code: string | null;
  store_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
}

export const Branches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [manager, setManager] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleOpenModal = (branch: Branch | null = null) => {
    setSelectedBranch(branch);
    if (branch) {
      setName(branch.name);
      setCode(branch.code || branch.store_code || '');
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setEmail(branch.email || '');
      setManager(branch.manager_name || '');
      setIsActive(branch.is_active);
    } else {
      setName('');
      setCode('');
      setAddress('');
      setPhone('');
      setEmail('');
      setManager('');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Branch name is required', 'error');
      return;
    }

    const payload = {
      name,
      code,
      store_code: code, // keep both aligned
      address,
      phone,
      email,
      manager_name: manager,
      is_active: isActive,
    };

    try {
      if (selectedBranch) {
        const { error } = await supabase
          .from('branches')
          .update(payload)
          .eq('id', selectedBranch.id);
        if (error) throw error;
        showToast('Branch updated successfully');
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([payload]);
        if (error) throw error;
        showToast('Branch created successfully');
      }
      setIsModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('Branch deleted successfully');
      fetchBranches();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const totalBranches = branches.length;
  const activeBranches = branches.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🌍 Branch Management</h1>
          <p className="text-xs text-dark-500">Configure corporate pharmacy branches, contact info, and statuses</p>
        </div>
        <Button
          onClick={() => handleOpenModal(null)}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-sm"
        >
          Add Branch
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Total Branches</p>
              <h3 className="text-2xl font-black mt-1 text-dark-900 dark:text-white">{totalBranches}</h3>
            </div>
            <span className="p-2.5 bg-brand-500/10 text-brand-600 rounded-xl">
              <Store className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Active</p>
              <h3 className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">{activeBranches}</h3>
            </div>
            <span className="p-2.5 bg-green-500/10 text-green-600 rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-500 font-semibold uppercase">Inactive</p>
              <h3 className="text-2xl font-black mt-1 text-red-500">{totalBranches - activeBranches}</h3>
            </div>
            <span className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
              <AlertCircle className="h-5 w-5" />
            </span>
          </Card.Content>
        </Card>
      </div>

      {/* Branch Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading branch lists...</div>
          ) : branches.length === 0 ? (
            <div className="p-12 text-center text-xs text-dark-400">No branches configured yet. Click "Add Branch" to start.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Branch Name</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Branch Code</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Contacts</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Manager</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {branches.map(branch => (
                    <tr key={branch.id} className="hover:bg-dark-50/30">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-dark-800 dark:text-dark-200">{branch.name}</p>
                        <span className="flex items-center gap-1 text-[10px] text-dark-400 mt-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {branch.address || 'No address registered'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-dark-600 dark:text-dark-400">{branch.code || branch.store_code || '—'}</td>
                      <td className="px-3 py-3.5 space-y-0.5">
                        {branch.phone && (
                          <div className="flex items-center gap-1 text-dark-600 dark:text-dark-400">
                            <Phone className="h-3 w-3 shrink-0" /> {branch.phone}
                          </div>
                        )}
                        {branch.email && (
                          <div className="flex items-center gap-1 text-dark-600 dark:text-dark-400">
                            <Mail className="h-3 w-3 shrink-0" /> {branch.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5 font-medium text-dark-700 dark:text-dark-300">{branch.manager_name || 'Unassigned'}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${branch.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                          {branch.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button onClick={() => handleOpenModal(branch)} className="p-1 text-dark-400 hover:text-brand-500 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(branch.id)} className="p-1 text-dark-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBranch ? 'Edit Branch Info' : 'Register New Branch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Branch Name" placeholder="e.g. Westside Branch" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Branch Code" placeholder="e.g. PH-WEST-01" value={code} onChange={e => setCode(e.target.value)} />
          <Input label="Manager Name" placeholder="e.g. Dr. John Doe" value={manager} onChange={e => setManager(e.target.value)} />
          <Input label="Phone Number" placeholder="e.g. 555-0199" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input label="Email Address" type="email" placeholder="e.g. westside@pharmacy.com" value={email} onChange={e => setEmail(e.target.value)} />
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Full Address</label>
            <textarea
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
              rows={3}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Health Ave..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="branch-status" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="branch-status" className="text-xs font-semibold text-dark-700 dark:text-dark-300">Is this branch active?</label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{selectedBranch ? 'Save Changes' : 'Create Branch'}</Button>
          </div>
        </form>
      </Modal>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

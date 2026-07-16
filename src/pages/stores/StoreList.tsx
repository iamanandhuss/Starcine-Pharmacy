import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, Plus, Search, Edit2, Eye,
  ToggleLeft, ToggleRight, Users, RefreshCw,
  MapPin, Phone, Mail as MailIcon, AlertCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreRow {
  id: string;
  name: string;
  store_code: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
  employee_count?: number;
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  store_code: z.string().min(2, 'Store code is required').regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, hyphens only'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  manager_name: z.string().optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export const StoreList: React.FC = () => {
  const navigate = useNavigate();
  const { refreshStores } = useStore();

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
  });

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, store_code, code, address, phone, email, manager_name, is_active, created_at')
        .order('name', { ascending: true });

      if (error) throw error;

      // Fetch employee counts
      const storesWithCounts = await Promise.all(
        (data || []).map(async (store) => {
          const { count } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', store.id)
            .eq('is_active', true);
          return { ...store, employee_count: count ?? 0 };
        })
      );

      setStores(storesWithCounts);
    } catch (err: any) {
      console.error('Error fetching stores:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.store_code || s.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAdd = () => {
    reset();
    setIsAddModalOpen(true);
  };

  const openEdit = (store: StoreRow) => {
    setSelectedStore(store);
    setValue('name', store.name);
    setValue('store_code', store.store_code || store.code || '');
    setValue('address', store.address || '');
    setValue('phone', store.phone || '');
    setValue('email', store.email || '');
    setValue('manager_name', store.manager_name || '');
    setIsEditModalOpen(true);
  };

  const handleCreate = async (values: StoreFormValues) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('branches').insert({
        name: values.name,
        store_code: values.store_code,
        code: values.store_code,
        address: values.address || null,
        phone: values.phone || null,
        email: values.email || null,
        manager_name: values.manager_name || null,
        is_active: true,
      });
      if (error) throw error;
      showToast('Store created successfully!');
      setIsAddModalOpen(false);
      reset();
      await fetchStores();
      await refreshStores();
    } catch (err: any) {
      showToast(err.message || 'Failed to create store', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (values: StoreFormValues) => {
    if (!selectedStore) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('branches').update({
        name: values.name,
        store_code: values.store_code,
        code: values.store_code,
        address: values.address || null,
        phone: values.phone || null,
        email: values.email || null,
        manager_name: values.manager_name || null,
      }).eq('id', selectedStore.id);
      if (error) throw error;
      showToast('Store updated successfully!');
      setIsEditModalOpen(false);
      await fetchStores();
      await refreshStores();
    } catch (err: any) {
      showToast(err.message || 'Failed to update store', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (store: StoreRow) => {
    try {
      const { error } = await supabase.from('branches').update({ is_active: !store.is_active }).eq('id', store.id);
      if (error) throw error;
      showToast(`Store ${store.is_active ? 'disabled' : 'enabled'} successfully`);
      await fetchStores();
      await refreshStores();
    } catch (err: any) {
      showToast(err.message || 'Failed to update store status', 'info');
    }
  };

  const StoreForm = ({ onSubmit }: { onSubmit: (values: StoreFormValues) => void }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Store Name" placeholder="Main Pharmacy Branch" error={errors.name?.message} {...register('name')} required />
      <Input
        label="Store Code"
        placeholder="ST-MAIN-01"
        error={errors.store_code?.message}
        {...register('store_code')}
        required
      />
      <Input label="Address" placeholder="123 Health Ave, City" error={errors.address?.message} {...register('address')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" placeholder="+91 9876543210" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email" type="email" placeholder="store@pharmacy.com" error={errors.email?.message} {...register('email')} />
      </div>
      <Input label="Manager Name" placeholder="Store Manager Name" error={errors.manager_name?.message} {...register('manager_name')} />
      <div className="flex gap-3 pt-2 justify-end">
        <Button type="button" variant="outline" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {isAddModalOpen ? 'Create Store' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => <Toast key={t.id} type={t.type === 'success' ? 'success' : 'info'} message={t.message} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />)}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dark-900 dark:text-white flex items-center gap-2">
            <Store className="h-6 w-6 text-brand-500" />
            Store Management
          </h1>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
            {stores.length} store{stores.length !== 1 ? 's' : ''} · {stores.filter((s) => s.is_active).length} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStores} leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}>
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd} leftIcon={<Plus className="h-4 w-4" />}>
            Add Store
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search stores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Store Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><Card.Content className="p-5 space-y-3">
              <div className="h-4 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
              <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded animate-pulse w-2/3" />
              <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded animate-pulse w-1/2" />
            </Card.Content></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-dark-300 dark:text-dark-600" />
          <p className="text-sm font-semibold text-dark-600 dark:text-dark-400">
            {searchQuery ? 'No stores match your search' : 'No stores yet'}
          </p>
          {!searchQuery && (
            <Button onClick={openAdd} leftIcon={<Plus className="h-4 w-4" />}>
              Add Your First Store
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((store) => (
            <Card key={store.id} className={`transition-all hover:shadow-md ${!store.is_active ? 'opacity-60' : ''}`}>
              <Card.Content className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-dark-900 dark:text-white truncate">{store.name}</p>
                    <p className="text-[10px] font-mono text-dark-400 dark:text-dark-500">{store.store_code || store.code}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${store.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-dark-100 text-dark-400 dark:bg-dark-800'}`}>
                    {store.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-[11px] text-dark-500 dark:text-dark-400 mb-4">
                  {store.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{store.address}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {store.phone}
                    </div>
                  )}
                  {store.email && (
                    <div className="flex items-center gap-1.5">
                      <MailIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{store.email}</span>
                    </div>
                  )}
                  {store.manager_name && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium">{store.manager_name}</span>
                    </div>
                  )}
                </div>

                {/* Employee Count */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400 mb-3">
                  <Users className="h-3.5 w-3.5" />
                  {store.employee_count} Active Employee{store.employee_count !== 1 ? 's' : ''}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/super-admin/stores/${store.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    onClick={() => openEdit(store)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 text-xs ${store.is_active ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20' : 'text-emerald-600 dark:text-emerald-400'}`}
                    leftIcon={store.is_active ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
                    onClick={() => handleToggleActive(store)}
                  >
                    {store.is_active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Add Store Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Store">
        <StoreForm onSubmit={handleCreate} />
      </Modal>

      {/* Edit Store Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Store">
        <StoreForm onSubmit={handleEdit} />
      </Modal>
    </div>
  );
};

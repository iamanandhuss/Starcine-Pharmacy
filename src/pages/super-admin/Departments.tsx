import React, { useEffect, useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDepartments(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenModal = (dept: Department | null = null) => {
    setSelectedDept(dept);
    if (dept) {
      setName(dept.name);
      setDescription(dept.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Department name is required', 'error');
      return;
    }

    const payload = {
      name,
      description,
    };

    try {
      if (selectedDept) {
        const { error } = await supabase
          .from('departments')
          .update(payload)
          .eq('id', selectedDept.id);
        if (error) throw error;
        showToast('Department updated successfully');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([payload]);
        if (error) throw error;
        showToast('Department created successfully');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('Department deleted successfully');
      fetchDepartments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🏢 Department Directory</h1>
          <p className="text-xs text-dark-500">Manage internal business groups and corporate divisions</p>
        </div>
        <Button
          onClick={() => handleOpenModal(null)}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-sm"
        >
          Create Department
        </Button>
      </div>

      {/* Grid of Departments */}
      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400">Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-xs text-dark-400">No departments found. Click "Create Department" to start.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => (
            <Card key={dept.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500" />
              <Card.Header className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-brand-500/10 text-brand-600 rounded-lg">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(dept)} className="p-1.5 text-dark-400 hover:text-brand-500 hover:bg-dark-50 rounded-md">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <Card.Title className="text-sm font-bold text-dark-800 dark:text-dark-200 mt-2">{dept.name}</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4">
                <p className="text-xs text-dark-500 line-clamp-2 h-8">
                  {dept.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-1.5 pt-2 text-[10px] text-dark-400 border-t border-dark-100 dark:border-dark-800">
                  <Calendar className="h-3 w-3" />
                  <span>Created {new Date(dept.created_at).toLocaleDateString()}</span>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedDept ? 'Modify Department Details' : 'Create New Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Department Name" placeholder="e.g. Logistics" value={name} onChange={e => setName(e.target.value)} required />
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Description</label>
            <textarea
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a short description of this department's functions..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{selectedDept ? 'Save Changes' : 'Create Department'}</Button>
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

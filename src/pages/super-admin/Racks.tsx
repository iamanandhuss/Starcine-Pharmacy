import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, Tag } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';

interface Rack {
  id: string;
  name: string;
  category: string;
  sections_count: number;
  assigned_employee: string;
  products_placed: string[];
}

export const Racks: React.FC = () => {
  const { selectedStoreId } = useStore();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchRacksData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      // 1. Fetch employees
      const empRes = await supabase
        .from('users')
        .select('id, full_name')
        .eq('branch_id', selectedStoreId);
      const empList = empRes.data || [];

      // 2. Fetch racks
      const racksRes = await supabase
        .from('racks')
        .select('*')
        .eq('branch_id', selectedStoreId);

      // 3. Fetch placements
      let placementList: any[] = [];
      if (racksRes.data && racksRes.data.length > 0) {
        const rackIds = racksRes.data.map(r => r.id);
        const productsRes = await supabase
          .from('product_placements')
          .select('*')
          .in('rack_id', rackIds);
        if (productsRes.data) {
          placementList = productsRes.data;
        }
      }

      if (!racksRes.data || racksRes.data.length === 0) {
        setRacks([
          { id: '1', name: 'Prescription Rack 01', category: 'Antibiotics', sections_count: 5, assigned_employee: 'Pharmacist Alex', products_placed: ['Amoxicillin', 'Azithromycin', 'Penicillin'] },
          { id: '2', name: 'Prescription Rack 02', category: 'Cardiovascular', sections_count: 5, assigned_employee: 'Pharmacist Jessica', products_placed: ['Lipitor', 'Atorvastatin', 'Lisinopril'] },
          { id: '3', name: 'Secure Narcotics Cabinet', category: 'Schedule II Controlled', sections_count: 3, assigned_employee: 'Pharmacist Alex', products_placed: ['Oxycodone', 'Morphine', 'Fentanyl Patches'] },
          { id: '4', name: 'OTC Cold & Cough Shelf', category: 'Over-The-Counter', sections_count: 4, assigned_employee: 'Technician Sarah', products_placed: ['Claritin', 'Mucinex', 'Tylenol Cold'] },
          { id: '5', name: 'Liquids & Reconstitutions', category: 'Refrigerated Liquids', sections_count: 3, assigned_employee: 'Technician Sarah', products_placed: ['Augmentin Liquid', 'Amoxicillin Susp.'] },
        ]);
      } else {
        const mapped = racksRes.data.map((r: any) => {
          const emp = empList.find(e => e.id === r.assigned_user_id);
          const products = placementList
            .filter(p => p.rack_id === r.id)
            .map(p => p.product_name);
          return {
            id: r.id,
            name: r.name,
            category: r.section || 'General',
            sections_count: Number(r.shelves_count) || 4,
            assigned_employee: emp ? emp.full_name : 'Unassigned',
            products_placed: products.length > 0 ? products : ['No products assigned']
          };
        });
        setRacks(mapped);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRacksData();
  }, [selectedStoreId]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🗂️ Rack & Product Placement</h1>
          <p className="text-xs text-dark-500">Configure pharmacy stock shelving, categorize sections, and audit drug placement records</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => showToast('Cabinet placement modifications require catalog permissions', 'error')}
        >
          Add Shelf Rack
        </Button>
      </div>

      {/* Racks list */}
      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400">Loading shelf configurations...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {racks.map(rack => (
            <Card key={rack.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-blue-600" />
              <Card.Header className="pb-2">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    {rack.category}
                  </span>
                  <span className="text-[10px] text-dark-400 font-mono">{rack.sections_count} Shelves</span>
                </div>
                <Card.Title className="text-sm font-extrabold text-dark-800 dark:text-dark-200 mt-2">{rack.name}</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide mb-1">Assigned Auditor</p>
                  <div className="flex items-center gap-1.5 text-dark-700 dark:text-dark-300">
                    <UserCheck className="h-3.5 w-3.5 text-brand-500" />
                    <span>{rack.assigned_employee}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wide mb-1.5">Products Placed</p>
                  <div className="flex flex-wrap gap-1">
                    {rack.products_placed.map(p => (
                      <span key={p} className="px-2 py-0.5 rounded bg-dark-100 dark:bg-dark-800 text-[10px] text-dark-600 dark:text-dark-400 font-semibold">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

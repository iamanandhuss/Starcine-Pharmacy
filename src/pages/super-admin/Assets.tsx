import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabase';
import { Toast } from '../../components/ui/Toast';

interface LayoutAsset {
  id: string;
  asset_name: string;
  asset_code: string | null;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  background_color: string | null;
  border_color: string | null;
  text_color: string | null;
  is_locked: boolean;
  is_visible: boolean;
  remarks: string | null;
  layout_id: string | null;
  asset_category_id: string | null;
  assigned_user_id: string | null;
  branches?: { name: string } | null;
}

export const Assets: React.FC = () => {
  const [assets, setAssets] = useState<LayoutAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('layout_assets')
        .select('*, branches!layout_assets_branch_id_fkey(name)');

      if (error) throw error;

      // Fallback mockup assets if database is clean
      if (!data || data.length === 0) {
        setAssets([
          { id: '1', asset_name: 'Main Prescription Rack A', asset_code: 'RCK-01A', x_position: 10, y_position: 12, width: 120, height: 40, background_color: '#3B82F6', border_color: '#1D4ED8', text_color: '#FFF', is_locked: true, is_visible: true, remarks: 'Fridge partition A', layout_id: null, asset_category_id: null, assigned_user_id: null, branches: { name: 'Main Street Pharmacy' } },
          { id: '2', asset_name: 'Meal Break Table', asset_code: 'TBL-MB', x_position: 5, y_position: 25, width: 80, height: 80, background_color: '#10B981', border_color: '#047857', text_color: '#FFF', is_locked: false, is_visible: true, remarks: 'Staff break bay', layout_id: null, asset_category_id: null, assigned_user_id: null, branches: { name: 'Main Street Pharmacy' } },
          { id: '3', asset_name: 'Narcotics Cabinet Refrigerator', asset_code: 'REF-NARC', x_position: 45, y_position: 8, width: 60, height: 60, background_color: '#EF4444', border_color: '#B91C1C', text_color: '#FFF', is_locked: true, is_visible: true, remarks: 'Requires key clearance', layout_id: null, asset_category_id: null, assigned_user_id: null, branches: { name: 'Westside Branch' } },
        ]);
      } else {
        const mapped = data.map((item: any) => ({
          id: item.id,
          asset_name: item.name || 'Layout Item',
          asset_code: `CODE-${item.id.substring(0, 4).toUpperCase()}`,
          category: item.type || 'Rack',
          x_position: Number(item.x) || 0,
          y_position: Number(item.y) || 0,
          width: Number(item.width) || 100,
          height: Number(item.height) || 60,
          background_color: item.bg_color || '#3B82F6',
          border_color: '#1E293B',
          text_color: item.text_color || '#FFFFFF',
          is_locked: !!item.locked,
          is_visible: true,
          remarks: item.remarks || '',
          layout_id: null,
          asset_category_id: null,
          assigned_user_id: item.assigned_user_id || null,
          branches: item.branches
        })) as LayoutAsset[];
        setAssets(mapped);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleToggleLock = async (asset: LayoutAsset) => {
    try {
      const { error } = await supabase
        .from('layout_assets')
        .update({ locked: !asset.is_locked })
        .eq('id', asset.id);

      if (error) throw error;

      // In case table is a mock, update local state
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, is_locked: !a.is_locked } : a));
      showToast(`Asset grid position ${!asset.is_locked ? 'locked' : 'unlocked'}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🧱 Physical Asset Inventory</h1>
          <p className="text-xs text-dark-500">Inventory of all physical store items, counters, cold-chain refrigerators, and cabinets</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => showToast('Positioning new assets requires launching the Store Blueprint Designer')}
        >
          Add Asset
        </Button>
      </div>

      {/* Table grid */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading platform physical assets...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Asset Name</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Asset Code</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Branch / Location</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Canvas position</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Locked</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Visibility</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-dark-50/20">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-dark-800 dark:text-dark-200">{asset.asset_name}</p>
                        <p className="text-[10px] text-dark-400 mt-0.5">{asset.remarks || 'No description recorded'}</p>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-dark-600 dark:text-dark-400">{asset.asset_code || '—'}</td>
                      <td className="px-3 py-3.5 font-medium text-dark-700 dark:text-dark-300">{asset.branches?.name || 'Global Template'}</td>
                      <td className="px-3 py-3.5 text-center font-mono text-[10px] text-dark-500">
                        ({asset.x_position}, {asset.y_position}) [{asset.width}x{asset.height}]
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleLock(asset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${asset.is_locked ? 'bg-amber-500/10 text-amber-600' : 'bg-dark-100 text-dark-500'}`}
                        >
                          {asset.is_locked ? 'Locked' : 'Editable'}
                        </button>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${asset.is_visible ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                          {asset.is_visible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <span className="text-[10px] text-dark-400 italic">Connected to Layout</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

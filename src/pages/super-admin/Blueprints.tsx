import React, { useEffect, useState } from 'react';
import { Layout, Plus, Copy, CheckCircle2, History, RotateCcw, Play } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';

interface Blueprint {
  id: string;
  name: string;
  version: string;
  updated_at: string;
  is_published: boolean;
  item_count: number;
}

export const Blueprints: React.FC = () => {
  const { selectedStoreId } = useStore();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [name, setName] = useState('');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchBlueprints = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .eq('branch_id', selectedStoreId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setBlueprints([
          { id: 'bp-1', name: 'Main Pharmacy Dispensing Floor Plan', version: 'v1.2.0', updated_at: new Date().toLocaleDateString(), is_published: true, item_count: 14 },
          { id: 'bp-2', name: 'West Wing Walk-in Stock Room', version: 'v1.0.0', updated_at: new Date().toLocaleDateString(), is_published: false, item_count: 8 },
        ]);
      } else {
        setBlueprints(data.map((bp: any) => ({
          id: bp.id,
          name: bp.name,
          version: bp.version,
          updated_at: new Date(bp.updated_at).toLocaleDateString(),
          is_published: bp.is_published,
          item_count: bp.item_count
        })));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlueprints();
  }, [selectedStoreId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!selectedStoreId) return;

    try {
      const payload = {
        name,
        version: 'v1.0.0',
        is_published: false,
        item_count: 0,
        branch_id: selectedStoreId
      };

      const { error } = await supabase
        .from('blueprints')
        .insert(payload);

      if (error) throw error;

      showToast('Layout Blueprint created successfully');
      setIsModalOpen(false);
      setName('');
      await fetchBlueprints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDuplicate = async (bp: Blueprint) => {
    if (!selectedStoreId) return;

    try {
      const payload = {
        name: `${bp.name} (Copy)`,
        version: 'v1.0.0',
        is_published: false,
        item_count: bp.item_count,
        branch_id: selectedStoreId
      };

      const { error } = await supabase
        .from('blueprints')
        .insert(payload);

      if (error) throw error;

      showToast(`Duplicated "${bp.name}" successfully`);
      await fetchBlueprints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const bp = blueprints.find(b => b.id === id);
      if (!bp) return;

      const currentVerNum = parseFloat(bp.version.substring(1)) || 1.0;
      const nextVersion = `v${(currentVerNum + 0.1).toFixed(1)}.0`;
      
      const { error } = await supabase
        .from('blueprints')
        .update({
          is_published: true,
          version: nextVersion
        })
        .eq('id', id);

      if (error) throw error;

      showToast('Layout Blueprint published to branches!');
      await fetchBlueprints();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenHistory = (bp: Blueprint) => {
    setSelectedBlueprint(bp);
    setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🗺️ Store Blueprint Designer</h1>
          <p className="text-xs text-dark-500">Design, version-control, and deploy store layouts, shelf structures, and compliance maps</p>
        </div>
        <Button
          onClick={() => {
            setName('');
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shadow-sm"
        >
          New Blueprint
        </Button>
      </div>

      {/* Grid: Canvas Preview + Active Blueprints */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Mock Blueprint Editor Canvas */}
        <Card className="lg:col-span-2 flex flex-col min-h-[400px]">
          <Card.Header className="border-b border-dark-100 dark:border-dark-800">
            <div className="flex justify-between items-center">
              <div>
                <Card.Title className="text-xs font-bold uppercase tracking-wider">Canvas Workspace Preview</Card.Title>
                <Card.Description>Visual layout planner for shelf and asset distributions</Card.Description>
              </div>
              <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 text-[10px] font-bold">Standard Grid: 20x20</span>
            </div>
          </Card.Header>
          <Card.Content className="p-4 bg-dark-50/50 dark:bg-dark-950/50 flex-1 flex items-center justify-center border-dashed border-2 border-dark-200 dark:border-dark-800 rounded-b-xl relative">
            
            {/* Simulation Canvas Grid */}
            <div className="grid grid-cols-6 gap-3 w-full max-w-md opacity-70">
              <div className="p-3 bg-brand-600/20 text-brand-600 rounded-lg text-center font-bold text-[9px] border border-brand-500/30">Checkout Counter 1</div>
              <div className="p-3 bg-brand-600/20 text-brand-600 rounded-lg text-center font-bold text-[9px] border border-brand-500/30">Checkout Counter 2</div>
              <div className="p-3 bg-green-500/20 text-green-600 rounded-lg text-center font-bold text-[9px] border border-green-500/30">Narcotics Safe (L)</div>
              <div className="p-3 bg-blue-500/20 text-blue-600 rounded-lg text-center font-bold text-[9px] border border-blue-500/30">Rack Section A</div>
              <div className="p-3 bg-blue-500/20 text-blue-600 rounded-lg text-center font-bold text-[9px] border border-blue-500/30">Rack Section B</div>
              <div className="p-3 bg-red-500/20 text-red-500 rounded-lg text-center font-bold text-[9px] border border-red-500/30">Fire Extinguisher</div>
              <div className="p-3 bg-blue-500/20 text-blue-600 rounded-lg text-center font-bold text-[9px] border border-blue-500/30">Rack Section C</div>
              <div className="p-3 bg-blue-500/20 text-blue-600 rounded-lg text-center font-bold text-[9px] border border-blue-500/30">Rack Section D</div>
              <div className="p-3 bg-purple-500/20 text-purple-600 rounded-lg text-center font-bold text-[9px] border border-purple-500/30">Waiting Bay</div>
              <div className="p-3 bg-amber-500/20 text-amber-600 rounded-lg text-center font-bold text-[9px] border border-amber-500/30">Medicine Fridge A</div>
              <div className="p-3 bg-amber-500/20 text-amber-600 rounded-lg text-center font-bold text-[9px] border border-amber-500/30">Medicine Fridge B</div>
              <div className="p-3 bg-dark-200 dark:bg-dark-800 text-dark-500 rounded-lg text-center font-bold text-[9px] border border-dark-300 dark:border-dark-700">Storage Door</div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-dark-900/70 opacity-0 hover:opacity-100 transition-opacity flex-col gap-2 rounded-b-xl">
              <p className="text-xs font-bold text-dark-900 dark:text-white">Switch to blueprint designer tool?</p>
              <Button size="sm" leftIcon={<Play className="h-3 w-3" />} onClick={() => alert('Launching Visual Drag & Drop Designer Stub...')}>
                Launch Designer
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* Blueprint List Panel */}
        <Card className="lg:col-span-1 flex flex-col">
          <Card.Header>
            <Card.Title className="text-xs">Blueprints Library</Card.Title>
            <Card.Description>Manage floorplan configurations and active layout standards</Card.Description>
          </Card.Header>
          <Card.Content className="flex-1 space-y-4">
            {loading ? (
              <div className="text-center py-12 text-xs text-dark-400">Loading blueprints library...</div>
            ) : blueprints.length === 0 ? (
              <div className="text-center py-12 text-xs text-dark-400">
                <Layout className="h-8 w-8 mx-auto text-dark-300 mb-2" />
                No custom blueprints created.<br />
                A default standard layout is active.
              </div>
            ) : (
              <div className="divide-y divide-dark-100 dark:divide-dark-800 max-h-[300px] overflow-y-auto">
                {blueprints.map(bp => (
                  <div key={bp.id} className="py-3 flex items-center justify-between group">
                    <div>
                      <h4 className="text-xs font-black text-dark-800 dark:text-dark-200">{bp.name}</h4>
                      <span className="text-[10px] text-dark-400 mt-1 block">
                        Version {bp.version} • Modified {bp.updated_at}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {bp.is_published ? (
                        <span className="p-1 text-green-600" title="Published">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePublish(bp.id)}
                          className="p-1 text-dark-400 hover:text-green-600 transition-colors"
                          title="Publish Layout"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicate(bp)}
                        className="p-1 text-dark-400 hover:text-brand-500 transition-colors"
                        title="Duplicate Blueprint"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenHistory(bp)}
                        className="p-1 text-dark-400 hover:text-blue-500 transition-colors"
                        title="Version History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="🎨 Create Floorplan Blueprint">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Blueprint Name" placeholder="e.g. Standard Model 2026" value={name} onChange={e => setName(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Blueprint</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title={`📜 Version History: ${selectedBlueprint?.name || ''}`}>
        <div className="space-y-4">
          <div className="divide-y divide-dark-100 dark:divide-dark-800 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-dark-800 dark:text-dark-200">Version v1.1.0 (Active)</p>
                <span className="text-[10px] text-dark-400">Published today by Super Admin</span>
              </div>
              <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded font-bold">Current</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-dark-800 dark:text-dark-200">Version v1.0.0</p>
                <span className="text-[10px] text-dark-400">Created 2 days ago by Super Admin</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="h-3 w-3" />}
                onClick={() => {
                  showToast('Reverted to v1.0.0 (Simulation mode)');
                  setIsHistoryOpen(false);
                }}
              >
                Restore
              </Button>
            </div>
          </div>
        </div>
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

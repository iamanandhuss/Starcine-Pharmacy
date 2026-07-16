import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Users, ChevronRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';

interface Rack {
  id: string;
  name: string;
  code: string;
  assigned_user_name: string | null;
  shelves_count: number;
}

interface ProductPlacement {
  id: string;
  rack_id: string;
  shelf_number: number;
  product_name: string;
  brand: string;
  display_order: number;
  min_quantity: number;
  max_quantity: number;
}

interface Employee {
  id: string;
  full_name: string;
}

export const StoreRacks: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [racks, setRacks] = useState<Rack[]>([]);
  const [products, setProducts] = useState<ProductPlacement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

  // Modals
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Rack Inputs
  const [rackName, setRackName] = useState('');
  const [rackCode, setRackCode] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState('');
  const [shelvesCount, setShelvesCount] = useState(4);

  // Product Placement Inputs
  const [prodName, setProdName] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodShelf, setProdShelf] = useState(1);
  const [prodOrder, setProdOrder] = useState(1);
  const [prodMin, setProdMin] = useState(5);
  const [prodMax, setProdMax] = useState(25);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      // 1. Fetch employees
      const empRes = await supabase
        .from('users')
        .select('id, full_name')
        .eq('branch_id', selectedStoreId)
        .eq('is_active', true);
      
      const empList = empRes.data || [];
      setEmployees(empList);

      // 2. Fetch racks
      const racksRes = await supabase
        .from('racks')
        .select('*')
        .eq('branch_id', selectedStoreId);

      // 3. Fetch product placements
      let productList: ProductPlacement[] = [];
      if (racksRes.data && racksRes.data.length > 0) {
        const rackIds = racksRes.data.map(r => r.id);
        const productsRes = await supabase
          .from('product_placements')
          .select('*')
          .in('rack_id', rackIds);
        
        if (productsRes.data) {
          productList = productsRes.data.map((p: any) => ({
            id: p.id,
            rack_id: p.rack_id,
            shelf_number: Number(p.shelf_number) || 1,
            product_name: p.product_name,
            brand: p.brand || '',
            display_order: Number(p.display_order) || 1,
            min_quantity: Number(p.min_quantity) || 5,
            max_quantity: Number(p.max_quantity) || 25,
          }));
        }
      }

      setProducts(productList);

      // Map racks with assigned user names
      if (!racksRes.data || racksRes.data.length === 0) {
        const defaults: Rack[] = [
          { id: 'rack-1', name: 'Prescription Antibiotics A', code: 'RCK-ABX-A', assigned_user_name: 'Dr. Sarah Connor', shelves_count: 5 },
          { id: 'rack-2', name: 'OTC Pain Relievers', code: 'RCK-OTC-PR', assigned_user_name: 'Dr. Alan Grant', shelves_count: 4 },
          { id: 'rack-3', name: 'Insulin Cooling Bay', code: 'RCK-REF-INS', assigned_user_name: 'Nurse Chapel', shelves_count: 3 },
        ];
        setRacks(defaults);
        if (defaults.length > 0) {
          setSelectedRackId(defaults[0].id);
        }
      } else {
        const mappedRacks = racksRes.data.map((r: any) => {
          const emp = empList.find(e => e.id === r.assigned_user_id);
          return {
            id: r.id,
            name: r.name,
            code: r.code || `RCK-${r.id.substring(0, 4).toUpperCase()}`,
            assigned_user_name: emp ? emp.full_name : 'Unassigned',
            shelves_count: Number(r.shelves_count) || 4,
          };
        });
        setRacks(mappedRacks);
        if (mappedRacks.length > 0) {
          setSelectedRackId(mappedRacks[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;
    if (!rackName.trim() || !rackCode.trim()) return;

    try {
      const payload = {
        name: rackName,
        code: rackCode,
        section: rackCode.split('-')[0] || 'General',
        branch_id: selectedStoreId,
        shelves_count: shelvesCount,
        assigned_user_id: assignedEmployee || null,
      };

      const { error } = await supabase
        .from('racks')
        .insert(payload);

      if (error) throw error;

      showToast(`Created rack: ${rackName}`);
      setIsRackModalOpen(false);
      setRackName('');
      setRackCode('');
      setAssignedEmployee('');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRackId || !prodName.trim()) return;

    try {
      const payload = {
        rack_id: selectedRackId,
        shelf_number: Number(prodShelf),
        product_name: prodName,
        brand: prodBrand,
        display_order: Number(prodOrder),
        min_quantity: Number(prodMin),
        max_quantity: Number(prodMax),
      };

      const { error } = await supabase
        .from('product_placements')
        .insert(payload);

      if (error) throw error;

      showToast(`Assigned ${prodName} to Shelf ${prodShelf}`);
      setIsProductModalOpen(false);
      setProdName('');
      setProdBrand('');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_placements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Removed product layout assignment');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const activeRack = racks.find(r => r.id === selectedRackId);
  const activeProducts = products.filter(p => p.rack_id === selectedRackId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🧱 Rack & Product Placement</h1>
          <p className="text-xs text-dark-500">Configure shelving, display orders, stocking limits, and compliance ownership</p>
        </div>
        <Button onClick={() => setIsRackModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          New Rack
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400 font-bold">Loading pharmacy rack configurations...</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Side: Racks List */}
          <div className="lg:col-span-1 space-y-4">
            <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Physical Store Racks</p>
            <div className="space-y-3">
              {racks.map(rack => {
                const isActive = rack.id === selectedRackId;
                return (
                  <Card
                    key={rack.id}
                    onClick={() => setSelectedRackId(rack.id)}
                    className={`cursor-pointer transition-all border relative overflow-hidden group
                      ${isActive
                        ? 'border-brand-500 shadow-md ring-2 ring-brand-500/10 dark:bg-dark-900/60'
                        : 'border-dark-200 dark:border-dark-800 hover:border-dark-300 dark:hover:border-dark-700 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full transition-all
                      ${isActive ? 'bg-brand-500' : 'bg-transparent group-hover:bg-dark-300 dark:group-hover:bg-dark-700'}
                    `} />
                    <Card.Content className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 text-[8px] font-bold tracking-wider font-mono uppercase shrink-0">
                            {rack.code}
                          </span>
                          <span className="text-[10px] text-dark-400 font-medium">{rack.shelves_count} Shelves</span>
                        </div>
                        <h4 className="text-xs font-black text-dark-800 dark:text-dark-200 truncate">{rack.name}</h4>
                        <div className="flex items-center gap-1 text-[9px] text-dark-500">
                          <Users className="h-3 w-3 text-dark-400" />
                          <span className="truncate">Auditor: {rack.assigned_user_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 text-dark-400 transition-transform duration-200
                        ${isActive ? 'translate-x-1 text-brand-500' : 'group-hover:translate-x-0.5'}
                      `} />
                    </Card.Content>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Side: Shelves and Product Placements */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">
              {activeRack ? `Shelves Inventory: ${activeRack.name}` : 'Shelf Placements'}
            </p>
            
            {activeRack ? (
              <Card className="divide-y divide-dark-100 dark:divide-dark-800">
                <Card.Header className="pb-4 flex flex-row items-center justify-between bg-dark-50/50 dark:bg-dark-900/50 rounded-t-xl">
                  <div>
                    <Card.Title className="text-xs font-black text-dark-800 dark:text-dark-200">{activeRack.name}</Card.Title>
                    <Card.Description>Assigned to {activeRack.assigned_user_name || 'Unassigned'}</Card.Description>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsProductModalOpen(true)}
                    leftIcon={<Plus className="h-3 w-3" />}
                    className="text-[10px] font-bold py-1.5 h-auto"
                  >
                    Assign Product
                  </Button>
                </Card.Header>

                <Card.Content className="p-0 divide-y divide-dark-100 dark:divide-dark-800">
                  {Array.from({ length: activeRack.shelves_count }).map((_, idx) => {
                    const shelfNum = idx + 1;
                    const shelfProducts = activeProducts.filter(p => p.shelf_number === shelfNum);
                    
                    return (
                      <div key={shelfNum} className="p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-dark-50 dark:border-dark-900 pb-1.5">
                          <span className="text-[10px] font-black uppercase text-dark-400 tracking-wider">
                            Shelf Level {shelfNum}
                          </span>
                          <span className="text-[9px] font-bold text-dark-400 font-mono">
                            {shelfProducts.length} Items
                          </span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          {shelfProducts.length === 0 ? (
                            <div className="sm:col-span-2 text-center py-4 text-[10px] text-dark-400 italic">
                              Shelf level is currently empty.
                            </div>
                          ) : (
                            shelfProducts.map(prod => (
                              <div key={prod.id} className="p-3 bg-dark-50 dark:bg-dark-900/50 rounded-xl border border-dark-100 dark:border-dark-800/80 flex items-center justify-between gap-3 group/prod">
                                <div className="truncate">
                                  <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 text-[8px] font-black tracking-wider uppercase font-mono">
                                    Slot {prod.display_order}
                                  </span>
                                  <p className="font-bold text-dark-800 dark:text-dark-200">{prod.product_name}</p>
                                </div>
                                <p className="text-[10px] text-dark-400 mt-0.5">Brand: {prod.brand}</p>
                                
                                <div className="flex gap-3 mt-2 text-[10px] font-mono font-bold text-dark-500">
                                  <span>Min: <span className="text-red-500">{prod.min_quantity}</span></span>
                                  <span>Max: <span className="text-green-600">{prod.max_quantity}</span></span>
                                </div>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="p-1 text-dark-400 hover:text-red-500 rounded"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                </Card.Content>
              </Card>
            ) : (
              <div className="text-center py-12 text-xs text-dark-400">
                No racks found or configured. Click "New Rack" to start.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Create Rack Modal */}
      <Modal isOpen={isRackModalOpen} onClose={() => setIsRackModalOpen(false)} title="🧱 Configure New Inventory Rack">
        <form onSubmit={handleCreateRack} className="space-y-4">
          <Input label="Rack Name" placeholder="e.g. Antibiotics A" value={rackName} onChange={e => setRackName(e.target.value)} required />
          <Input label="Rack Code" placeholder="e.g. RCK-ABX" value={rackCode} onChange={e => setRackCode(e.target.value)} required />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Assign Compliance Lead</label>
              <select
                value={assignedEmployee}
                onChange={e => setAssignedEmployee(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
              >
                <option value="">Select staff...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <Input label="Number of Shelves" type="number" min={1} max={10} value={shelvesCount} onChange={e => setShelvesCount(Number(e.target.value))} required />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsRackModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Rack</Button>
          </div>
        </form>
      </Modal>

      {/* Place Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="💊 Place Product Shelf Slot">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <Input label="Product Name" placeholder="e.g. Ibuprofen 400mg" value={prodName} onChange={e => setProdName(e.target.value)} required />
          <Input label="Manufacturer Brand" placeholder="e.g. Advil" value={prodBrand} onChange={e => setProdBrand(e.target.value)} required />

          <div className="grid grid-cols-3 gap-2">
            <Input label="Shelf Level" type="number" min={1} max={activeRack?.shelves_count || 5} value={prodShelf} onChange={e => setProdShelf(Number(e.target.value))} required />
            <Input label="Display Order Slot" type="number" min={1} value={prodOrder} onChange={e => setProdOrder(Number(e.target.value))} required />
            <span className="text-[10px] text-dark-400 mt-7 block">Order layout sequence</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Alert Quantity" type="number" min={0} value={prodMin} onChange={e => setProdMin(Number(e.target.value))} required />
            <Input label="Max Alert Quantity" type="number" min={1} value={prodMax} onChange={e => setProdMax(Number(e.target.value))} required />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
            <Button type="submit">Place Product</Button>
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

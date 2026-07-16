import React, { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';

interface DeliveryOrder {
  id: string;
  customer_name: string;
  address: string;
  phone: string;
  courier_name: string | null;
  status: 'Pending' | 'Dispatched' | 'Completed' | 'Cancelled';
  dispatch_time: string | null;
  delivered_time: string | null;
  amount: number;
}

interface DeliveryStaff {
  id: string;
  full_name: string;
  phone: string | null;
  status: 'Active' | 'On Delivery' | 'Off Duty';
}

export const StoreDeliveries: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [couriers, setCouriers] = useState<DeliveryStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled' | 'couriers'>('pending');

  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  // Dispatch inputs
  const [assignedCourierId, setAssignedCourierId] = useState('');

  // New Order inputs
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [orderAmount, setOrderAmount] = useState('');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      // Mock Delivery Drivers
      setCouriers([
        { id: 'c1', full_name: 'John Rambo', phone: '555-9081', status: 'Active' },
        { id: 'c2', full_name: 'Sarah Connor', phone: '555-8022', status: 'On Delivery' },
        { id: 'c3', full_name: 'David Lightman', phone: '555-1033', status: 'Off Duty' },
      ]);

      // Mock home deliveries
      setDeliveries([
        { id: 'd1', customer_name: 'Alice Cooper', address: '777 Rock N Roll Blvd', phone: '555-3211', courier_name: null, status: 'Pending', dispatch_time: null, delivered_time: null, amount: 89.50 },
        { id: 'd2', customer_name: 'Bob Dylan', address: '61 Highway North', phone: '555-0909', courier_name: 'Sarah Connor', status: 'Dispatched', dispatch_time: `${today}T08:15:00Z`, delivered_time: null, amount: 125.00 },
        { id: 'd3', customer_name: 'Charlie Watts', address: '44 Rolling Stones Lane', phone: '555-8888', courier_name: 'John Rambo', status: 'Completed', dispatch_time: `${today}T07:10:00Z`, delivered_time: `${today}T07:45:00Z`, amount: 45.20 }
      ]);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custAddress.trim()) return;

    const newOrder: DeliveryOrder = {
      id: `d-${Date.now()}`,
      customer_name: custName,
      address: custAddress,
      phone: custPhone,
      courier_name: null,
      status: 'Pending',
      dispatch_time: null,
      delivered_time: null,
      amount: Number(orderAmount) || 0
    };

    setDeliveries(prev => [newOrder, ...prev]);
    setIsNewOrderModalOpen(false);
    setCustName('');
    setCustAddress('');
    setCustPhone('');
    setOrderAmount('');
    showToast(`Created home delivery order for ${custName}`);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !assignedCourierId) return;

    const courier = couriers.find(c => c.id === assignedCourierId);
    setDeliveries(prev => prev.map(o => o.id === selectedOrder.id ? {
      ...o,
      status: 'Dispatched',
      courier_name: courier?.full_name || null,
      dispatch_time: new Date().toISOString()
    } : o));

    showToast(`Dispatched delivery via ${courier?.full_name}`);
    setIsDispatchModalOpen(false);
  };

  const handleCompleteOrder = (order: DeliveryOrder) => {
    setDeliveries(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: 'Completed',
      delivered_time: new Date().toISOString()
    } : o));
    showToast(`Marked delivery as completed`);
  };

  const handleCancelOrder = (order: DeliveryOrder) => {
    setDeliveries(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: 'Cancelled'
    } : o));
    showToast(`Cancelled delivery order`);
  };

  const filteredOrders = deliveries.filter(o => {
    if (activeTab === 'pending') return o.status === 'Pending' || o.status === 'Dispatched';
    if (activeTab === 'completed') return o.status === 'Completed';
    if (activeTab === 'cancelled') return o.status === 'Cancelled';
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">🚚 Home Delivery Dispatch</h1>
          <p className="text-xs text-dark-500">Dispatch medication orders to home addresses, audit courier routes, and log completions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewOrderModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            New Dispatch Order
          </Button>
          <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-100 dark:border-dark-800 pb-px">
        {(['pending', 'completed', 'cancelled', 'couriers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold border-b-2 capitalize transition-all cursor-pointer
              ${activeTab === tab
                ? 'border-brand-500 text-brand-600 font-extrabold'
                : 'border-transparent text-dark-500 hover:text-dark-700'
              }
            `}
          >
            {tab === 'couriers' ? 'Couriers Log' : `${tab} dispatches`}
          </button>
        ))}
      </div>

      {/* Main grids */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading delivery records...</div>
          ) : activeTab === 'couriers' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Courier Driver</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Phone</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {couriers.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3.5 font-bold text-dark-800 dark:text-dark-200">{c.full_name}</td>
                      <td className="px-3 py-3.5 font-mono text-dark-500">{c.phone || '—'}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold
                          ${c.status === 'Active' ? 'bg-green-500/10 text-green-600' : c.status === 'On Delivery' ? 'bg-blue-500/10 text-blue-600' : 'bg-dark-100 text-dark-500'}
                        `}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button size="sm" variant="outline" onClick={() => alert(`Tracking GPS for courier: ${c.full_name}`)}>
                          Track GPS
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Customer details</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Delivery Address</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Assigned Courier</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase text-right">Dispatch Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-dark-800 dark:text-dark-200">{order.customer_name}</p>
                        <span className="text-[9px] text-dark-400 font-mono">Amount: ${order.amount} • {order.phone}</span>
                      </td>
                      <td className="px-3 py-3.5 text-dark-600 dark:text-dark-400">{order.address}</td>
                      <td className="px-3 py-3.5 font-bold text-brand-600">
                        {order.courier_name || <span className="text-dark-400 font-normal italic">Unassigned</span>}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold
                          ${order.status === 'Completed' ? 'bg-green-500/10 text-green-600' : order.status === 'Dispatched' ? 'bg-blue-500/10 text-blue-600' : order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}
                        `}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        {order.status === 'Pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setAssignedCourierId('');
                              setIsDispatchModalOpen(true);
                            }}
                          >
                            Assign Dispatch
                          </Button>
                        )}
                        {order.status === 'Dispatched' && (
                          <>
                            <button onClick={() => handleCompleteOrder(order)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Complete Dispatch">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleCancelOrder(order)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancel Order">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {(order.status === 'Completed' || order.status === 'Cancelled') && (
                          <span className="text-[10px] text-dark-400 italic">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Dispatch Driver Assignment Modal */}
      <Modal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} title={`🚚 Assign Dispatch: ${selectedOrder?.customer_name}`}>
        <form onSubmit={handleDispatchSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Select Active Courier</label>
            <select
              value={assignedCourierId}
              onChange={e => setAssignedCourierId(e.target.value)}
              required
              className="w-full text-xs p-2.5 rounded-lg border border-dark-200"
            >
              <option value="">Choose courier...</option>
              {couriers.filter(c => c.status !== 'Off Duty').map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.status})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsDispatchModalOpen(false)}>Cancel</Button>
            <Button type="submit">Dispatch Order</Button>
          </div>
        </form>
      </Modal>

      {/* New Dispatch Order Modal */}
      <Modal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} title="🚚 Record New Home Delivery Dispatch">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <Input label="Customer Full Name" placeholder="e.g. Alice Cooper" value={custName} onChange={e => setCustName(e.target.value)} required />
          <Input label="Delivery Destination Address" placeholder="e.g. 123 Health Blvd" value={custAddress} onChange={e => setCustAddress(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Contact Phone" placeholder="e.g. 555-3211" value={custPhone} onChange={e => setCustPhone(e.target.value)} />
            <Input label="Medication Invoice Amount ($)" type="number" step="0.01" placeholder="e.g. 85.50" value={orderAmount} onChange={e => setOrderAmount(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsNewOrderModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Order</Button>
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

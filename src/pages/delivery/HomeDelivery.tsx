import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Filter, AlertCircle, CheckCircle2, 
  Clock, MapPin, Phone, User, DollarSign, 
  Map, List, Navigation, RefreshCw, Edit3
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../context/StoreContext';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  employee_code: string;
}

interface Delivery {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: 'Cash' | 'Card' | 'Online';
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  notes: string;
  assigned_to: string | null;
  latitude: number;
  longitude: number;
  // Join relation
  assigned_driver?: UserProfile | null;
}

const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'd1',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'Pending',
    customer_name: 'John Miller',
    customer_phone: '555-0199',
    customer_address: '742 Evergreen Terrace, Starcine City',
    payment_method: 'Cash',
    payment_status: 'Unpaid',
    notes: 'Please ring bell. Patient requires signature.',
    assigned_to: null,
    latitude: 13.0850,
    longitude: 80.2720
  },
  {
    id: 'd2',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    status: 'Out for Delivery',
    customer_name: 'Sarah Connor',
    customer_phone: '555-0144',
    customer_address: '101 Cyberdyne Systems Blvd, Starcine City',
    payment_method: 'Online',
    payment_status: 'Paid',
    notes: 'Leave at front gate if no answer.',
    assigned_to: 'u1',
    latitude: 13.0720,
    longitude: 80.2510
  },
  {
    id: 'd3',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'Delivered',
    customer_name: 'Bruce Wayne',
    customer_phone: '555-0188',
    customer_address: '1007 Mountain Drive, Gotham District',
    payment_method: 'Card',
    payment_status: 'Paid',
    notes: 'Deliver to main gatehouse security.',
    assigned_to: 'u2',
    latitude: 13.1110,
    longitude: 80.2850
  }
];

const INITIAL_DRIVERS: UserProfile[] = [
  {
    id: 'u1',
    full_name: 'Robert Patrick',
    email: 'robert@starcine.com',
    phone: '555-0101',
    employee_code: 'EMP-900823'
  },
  {
    id: 'u2',
    full_name: 'Sarah Jenkins',
    email: 'sarah.j@starcine.com',
    phone: '555-0102',
    employee_code: 'EMP-449102'
  }
];

export const HomeDelivery: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  
  // View mode (list vs map visualization)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMapDelivery, setSelectedMapDelivery] = useState<Delivery | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDriverOpen, setIsDriverOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Create Delivery Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    payment_method: 'Cash' as 'Cash' | 'Card' | 'Online',
    payment_status: 'Unpaid' as 'Paid' | 'Unpaid' | 'Pending',
    notes: '',
    latitude: 13.0827,
    longitude: 80.2707
  });

  // Assign Driver State
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Fetch data
  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Drivers belonging to this store branch
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('branch_id', selectedStoreId);

      let driversList: UserProfile[] = [];
      if (!usersError && usersData) {
        driversList = usersData.map(u => ({
          id: u.id,
          full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email.split('@')[0],
          email: u.email,
          phone: u.phone || '',
          employee_code: u.employee_code || ''
        }));
        setDrivers(driversList);
      } else {
        setDrivers([]);
      }

      // 2. Fetch Deliveries belonging to this store branch
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('home_deliveries')
        .select('*')
        .eq('branch_id', selectedStoreId)
        .order('created_at', { ascending: false });

      if (deliveriesError) {
        throw deliveriesError;
      }

      if (deliveriesData) {
        const listWithDrivers = deliveriesData.map((d: any) => {
          const matchedDriver = driversList.find(drv => drv.id === d.assigned_to);
          return {
            ...d,
            assigned_driver: matchedDriver || null
          };
        });
        setDeliveries(listWithDrivers);
        setIsUsingFallback(false);
      }
    } catch (err: any) {
      console.warn('Failed to fetch from Supabase. Falling back to local state.', err.message);
      setIsUsingFallback(true);
      // Load from LocalStorage if present, otherwise initial mock
      const local = localStorage.getItem('starcine_deliveries');
      if (local) {
        try {
          setDeliveries(JSON.parse(local));
        } catch {
          setDeliveries(INITIAL_DELIVERIES);
        }
      } else {
        setDeliveries(INITIAL_DELIVERIES);
      }
      setDrivers(INITIAL_DRIVERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  // Save changes to state (and localstorage if fallback)
  const saveDeliveries = (newDeliveries: Delivery[]) => {
    setDeliveries(newDeliveries);
    if (isUsingFallback) {
      localStorage.setItem('starcine_deliveries', JSON.stringify(newDeliveries));
    }
  };

  // Create Delivery Order
  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_address) {
      setErrorMsg('Please fill in all required customer fields.');
      return;
    }

    // Add slight random offset to coordinates so they spread on map representation
    const latOffset = (Math.random() - 0.5) * 0.04;
    const lngOffset = (Math.random() - 0.5) * 0.04;
    const finalLat = 13.0827 + latOffset;
    const finalLng = 80.2707 + lngOffset;

    const newDeliveryObj = {
      status: 'Pending' as const,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      customer_address: formData.customer_address,
      payment_method: formData.payment_method,
      payment_status: formData.payment_status,
      notes: formData.notes,
      assigned_to: null,
      latitude: finalLat,
      longitude: finalLng,
      branch_id: selectedStoreId
    };

    try {
      if (isUsingFallback) {
        const localNew: Delivery = {
          ...newDeliveryObj,
          id: 'local_' + Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assigned_driver: null
        };
        saveDeliveries([localNew, ...deliveries]);
        setIsCreateOpen(false);
        resetForm();
      } else {
        const { data, error } = await supabase
          .from('home_deliveries')
          .insert([newDeliveryObj])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          const fullNew: Delivery = {
            ...data[0],
            assigned_driver: null
          };
          setDeliveries([fullNew, ...deliveries]);
          setIsCreateOpen(false);
          resetForm();
        }
      }
    } catch (err: any) {
      console.error('Error inserting delivery:', err);
      setErrorMsg(`Failed to save delivery: ${err.message}`);
    }
  };

  // Open Assign Driver Dialog
  const openAssignDriver = (deliv: Delivery) => {
    setSelectedDelivery(deliv);
    setSelectedDriverId(deliv.assigned_to || '');
    setIsDriverOpen(true);
  };

  // Submit Driver Assignment
  const handleAssignDriver = async () => {
    if (!selectedDelivery) return;

    const driverId = selectedDriverId === '' ? null : selectedDriverId;
    const matchedDriver = drivers.find(d => d.id === driverId) || null;

    try {
      if (isUsingFallback) {
        const updated = deliveries.map(d =>
          d.id === selectedDelivery.id
            ? { ...d, assigned_to: driverId, assigned_driver: matchedDriver, status: driverId ? ('Out for Delivery' as const) : d.status }
            : d
        );
        saveDeliveries(updated);
        setIsDriverOpen(false);
      } else {
        const updateObj: any = {
          updated_at: new Date().toISOString()
        };

        // Only set assigned_to if it's a real UUID (avoid FK violation with fallback IDs)
        if (driverId && !driverId.startsWith('u') && !driverId.startsWith('local_')) {
          updateObj.assigned_to = driverId;
        } else if (!driverId) {
          updateObj.assigned_to = null;
        } else {
          // Fallback IDs (u1, u2) — don't save to DB, just update UI
          updateObj.assigned_to = null;
        }

        // Auto progress to Out for Delivery if driver assigned
        if (driverId && selectedDelivery.status === 'Pending') {
          updateObj.status = 'Out for Delivery';
        }

        const { error } = await supabase
          .from('home_deliveries')
          .update(updateObj)
          .eq('id', selectedDelivery.id);

        if (error) throw error;

        // Update local state
        const updated = deliveries.map(d =>
          d.id === selectedDelivery.id
            ? {
                ...d,
                assigned_to: driverId,
                assigned_driver: matchedDriver,
                status: (updateObj.status as Delivery['status']) || d.status,
                updated_at: updateObj.updated_at
              }
            : d
        );
        setDeliveries(updated);
        setIsDriverOpen(false);
        setSelectedDriverId('');
      }
    } catch (err: any) {
      console.error('Error updating driver:', err);
      setErrorMsg(`Failed to assign driver: ${err.message}`);
    }
  };

  // Update Status directly
  const handleUpdateStatus = async (deliveryId: string, newStatus: Delivery['status']) => {
    try {
      // Auto pay Cash orders when Delivered
      const targetDeliv = deliveries.find(d => d.id === deliveryId);
      const isDelivered = newStatus === 'Delivered';
      const autoPaid = isDelivered && targetDeliv?.payment_method === 'Cash';

      if (isUsingFallback) {
        const updated = deliveries.map(d => 
          d.id === deliveryId 
            ? { 
                ...d, 
                status: newStatus, 
                payment_status: autoPaid ? ('Paid' as const) : d.payment_status,
                updated_at: new Date().toISOString()
              } 
            : d
        );
        saveDeliveries(updated);
      } else {
        const updateObj: any = { 
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        if (autoPaid) {
          updateObj.payment_status = 'Paid';
        }

        const { error } = await supabase
          .from('home_deliveries')
          .update(updateObj)
          .eq('id', deliveryId);

        if (error) throw error;

        const updated = deliveries.map(d => 
          d.id === deliveryId 
            ? { 
                ...d, 
                status: newStatus, 
                payment_status: autoPaid ? ('Paid' as const) : d.payment_status,
                updated_at: updateObj.updated_at
              } 
            : d
        );
        setDeliveries(updated);
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      setErrorMsg(`Failed to update status: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      payment_method: 'Cash',
      payment_status: 'Unpaid',
      notes: '',
      latitude: 13.0827,
      longitude: 80.2707
    });
  };

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(d => {
    const matchesSearch = 
      d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer_phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesDriver = driverFilter === 'all' || d.assigned_to === driverFilter;

    return matchesSearch && matchesStatus && matchesDriver;
  });

  // Calculate status counters
  const totalCount = deliveries.length;
  const pendingCount = deliveries.filter(d => d.status === 'Pending').length;
  const activeCount = deliveries.filter(d => d.status === 'Out for Delivery').length;
  const completedCount = deliveries.filter(d => d.status === 'Delivered').length;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-dark-900 dark:text-white flex items-center gap-2">
            <Truck className="h-7 w-7 text-brand-600 dark:text-brand-500" />
            Home Deliveries
          </h1>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
            Dispatch prescriptions, assign delivery drivers, and track shipping status in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isUsingFallback && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              <AlertCircle className="h-3.5 w-3.5" />
              Offline Sandbox
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Sync
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Order
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:scale-[1.02] duration-200 cursor-pointer" onClick={() => setStatusFilter('all')}>
          <Card.Content className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-dark-400">Total Orders</p>
              <h3 className="text-2xl font-extrabold text-dark-900 dark:text-white">{totalCount}</h3>
            </div>
            <div className="p-3 bg-brand-500/10 text-brand-500 dark:text-brand-400 rounded-xl">
              <Truck className="h-5 w-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="hover:scale-[1.02] duration-200 cursor-pointer" onClick={() => setStatusFilter('Pending')}>
          <Card.Content className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</p>
              <h3 className="text-2xl font-extrabold text-dark-900 dark:text-white">{pendingCount}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="hover:scale-[1.02] duration-200 cursor-pointer" onClick={() => setStatusFilter('Out for Delivery')}>
          <Card.Content className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">In Transit</p>
              <h3 className="text-2xl font-extrabold text-dark-900 dark:text-white">{activeCount}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <Navigation className="h-5 w-5 animate-pulse" />
            </div>
          </Card.Content>
        </Card>

        <Card className="hover:scale-[1.02] duration-200 cursor-pointer" onClick={() => setStatusFilter('Delivered')}>
          <Card.Content className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-500">Completed</p>
              <h3 className="text-2xl font-extrabold text-dark-900 dark:text-white">{completedCount}</h3>
            </div>
            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">Close</button>
        </div>
      )}

      {/* Main Panel with Filter Controls and Views */}
      <Card>
        <Card.Header className="p-4 border-b border-dark-100 dark:border-dark-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search patient, address, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs py-2 pl-9 pr-4 bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-dark-500">
                <Filter className="h-3.5 w-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-2 bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-dark-500">
                <User className="h-3.5 w-3.5" />
                <span>Driver:</span>
              </div>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="text-xs py-1.5 px-2 bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">All Drivers</option>
                {drivers.map(drv => (
                  <option key={drv.id} value={drv.id}>{drv.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-dark-100 dark:bg-dark-800/80 p-0.5 rounded-lg border border-dark-200 dark:border-dark-800/50">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer
                ${viewMode === 'list' 
                  ? 'bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm' 
                  : 'text-dark-500 hover:text-dark-800 dark:hover:text-dark-300'
                }
              `}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer
                ${viewMode === 'map' 
                  ? 'bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm' 
                  : 'text-dark-500 hover:text-dark-800 dark:hover:text-dark-300'
                }
              `}
            >
              <Map className="h-3.5 w-3.5" />
              Route Map
            </button>
          </div>
        </Card.Header>

        {loading ? (
          <div className="p-20 text-center text-xs text-dark-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-500" />
            <p>Syncing delivery databases...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-16 text-center text-xs text-dark-500 dark:text-dark-400 space-y-2">
            <Truck className="h-10 w-10 text-dark-300 dark:text-dark-700 mx-auto" />
            <p className="font-bold text-dark-700 dark:text-dark-300 text-sm">No delivery orders found</p>
            <p>Try modifying your filter options or create a new delivery order request.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800/80 text-[10px] uppercase font-bold tracking-wider text-dark-500">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Billing & Method</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800/50 text-xs">
                {filteredDeliveries.map(d => {
                  let statusColor = 'bg-dark-100 text-dark-700 dark:bg-dark-800 dark:text-dark-300';
                  if (d.status === 'Pending') statusColor = 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400';
                  if (d.status === 'Out for Delivery') statusColor = 'bg-purple-100/80 text-purple-700 dark:bg-purple-900/10 dark:text-purple-400';
                  if (d.status === 'Delivered') statusColor = 'bg-green-100/80 text-green-700 dark:bg-green-900/10 dark:text-green-400';
                  if (d.status === 'Cancelled') statusColor = 'bg-red-100/80 text-red-700 dark:bg-red-900/10 dark:text-red-400';

                  let payColor = 'text-amber-500 dark:text-amber-400';
                  if (d.payment_status === 'Paid') payColor = 'text-green-500';
                  if (d.payment_status === 'Pending') payColor = 'text-amber-500';

                  return (
                    <tr key={d.id} className="hover:bg-dark-50/30 dark:hover:bg-dark-900/10 transition-colors">
                      <td className="py-3.5 px-4 space-y-0.5">
                        <span className="font-mono text-[10px] font-bold text-dark-500 dark:text-dark-400">
                          #{d.id.substring(0, 8)}
                        </span>
                        <p className="text-[10px] text-dark-400">
                          {new Date(d.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                        {d.customer_name}
                        <p className="text-[10px] font-normal text-dark-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {d.customer_phone}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-dark-600 dark:text-dark-300">
                        {d.customer_address}
                        {d.notes && (
                          <p className="text-[10px] italic text-dark-400 mt-0.5 max-w-[200px] truncate">
                            Note: {d.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <span className="font-semibold text-dark-900 dark:text-white">
                          {d.payment_method}
                        </span>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${payColor}`}>
                          {d.payment_status}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        {d.assigned_driver ? (
                          <span className="inline-flex items-center gap-1 text-xs text-dark-900 dark:text-white font-semibold">
                            <User className="h-3.5 w-3.5 text-dark-400" />
                            {d.assigned_driver.full_name}
                          </span>
                        ) : (
                          <span className="text-dark-400 italic font-light">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dispatch / Deliver flow buttons */}
                          {d.status === 'Pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                              onClick={() => openAssignDriver(d)}
                            >
                              Assign Driver
                            </Button>
                          )}
                          {d.status === 'Out for Delivery' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20"
                              onClick={() => handleUpdateStatus(d.id, 'Delivered')}
                            >
                              Complete
                            </Button>
                          )}
                          {/* Cancel button */}
                          {d.status !== 'Delivered' && d.status !== 'Cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10"
                              onClick={() => handleUpdateStatus(d.id, 'Cancelled')}
                            >
                              Cancel
                            </Button>
                          )}
                          {/* Assign/Reassign driver button */}
                          {d.status !== 'Cancelled' && d.status !== 'Delivered' && d.status !== 'Pending' && (
                            <button
                              onClick={() => openAssignDriver(d)}
                              className="p-1.5 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Interactive Map View */
          <div className="p-4 grid md:grid-cols-3 gap-6">
            {/* SVG Map Canvas */}
            <div className="md:col-span-2 bg-dark-50 dark:bg-dark-950 rounded-xl border border-dark-200 dark:border-dark-800 p-4 relative overflow-hidden h-[420px]">
              {/* Stylized grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-35" />
              
              <svg className="w-full h-full relative z-10" viewBox="13.04 80.22 0.09 0.09" preserveAspectRatio="xMidYMid meet">
                {/* Center Starcine Main Pharmacy Hub */}
                <circle cx="13.0827" cy="80.2707" r="0.0035" className="fill-brand-600 dark:fill-brand-500 animate-pulse stroke-white stroke-[0.0006]" />
                {/* Outer halo */}
                <circle cx="13.0827" cy="80.2707" r="0.007" className="fill-brand-500/10 stroke-none" />

                {/* Delivery points and routes */}
                {filteredDeliveries.map(d => {
                  const isSelected = selectedMapDelivery?.id === d.id;
                  let color = '#d97706'; // Pending (amber)
                  if (d.status === 'Out for Delivery') color = '#9333ea'; // Purple
                  if (d.status === 'Delivered') color = '#16a34a'; // Green
                  if (d.status === 'Cancelled') color = '#dc2626'; // Red

                  return (
                    <g key={d.id} className="cursor-pointer" onClick={() => setSelectedMapDelivery(d)}>
                      {/* Active routing path if Out for Delivery or Pending */}
                      {(d.status === 'Out for Delivery' || d.status === 'Pending') && (
                        <line 
                          x1="13.0827" 
                          y1="80.2707" 
                          x2={d.latitude} 
                          y2={d.longitude}
                          stroke={color} 
                          strokeWidth="0.0005" 
                          strokeDasharray="0.002, 0.001" 
                          className="opacity-60"
                        />
                      )}
                      
                      {/* Delivery destination node */}
                      <circle 
                        cx={d.latitude} 
                        cy={d.longitude} 
                        r={isSelected ? '0.0028' : '0.0022'} 
                        fill={color}
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth="0.0006"
                        className="hover:scale-125 duration-150 transition-all"
                      />
                      
                      {/* Animate out-for-delivery driver marker on the path */}
                      {d.status === 'Out for Delivery' && (
                        <circle cx={13.0827 + (d.latitude - 13.0827) * 0.6} cy={80.2707 + (d.longitude - 80.2707) * 0.6} r="0.0012" className="fill-white stroke-purple-600 stroke-[0.0004]" />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Map Info overlays */}
              <div className="absolute top-4 left-4 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-dark-200 dark:border-dark-800 text-[10px] space-y-1 text-dark-600 dark:text-dark-300">
                <p className="font-bold flex items-center gap-1 text-dark-900 dark:text-white">
                  <MapPin className="h-3 w-3 text-brand-600" />
                  Starcine Rx Hub
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Pending Order
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500 inline-block animate-pulse" /> Out for Delivery
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Delivered
                </div>
              </div>
            </div>

            {/* Selected Node Panel info details */}
            <div className="space-y-4">
              <div className="bg-dark-50/50 dark:bg-dark-900/50 p-4 rounded-xl border border-dark-200 dark:border-dark-800 h-full flex flex-col justify-between">
                {selectedMapDelivery ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-dark-500">#{selectedMapDelivery.id.substring(0, 8)}</span>
                        <h4 className="font-extrabold text-dark-900 dark:text-white text-base mt-0.5">{selectedMapDelivery.customer_name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                        ${selectedMapDelivery.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : ''}
                        ${selectedMapDelivery.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : ''}
                        ${selectedMapDelivery.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : ''}
                        ${selectedMapDelivery.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : ''}
                      `}>
                        {selectedMapDelivery.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs border-y border-dark-100 dark:border-dark-800 py-3 text-dark-600 dark:text-dark-300">
                      <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-dark-400 shrink-0 mt-0.5" />
                        <span><strong>Address:</strong> {selectedMapDelivery.customer_address}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-dark-400 shrink-0" />
                        <span><strong>Phone:</strong> {selectedMapDelivery.customer_phone}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-dark-400 shrink-0" />
                        <span><strong>Payment:</strong> {selectedMapDelivery.payment_method} ({selectedMapDelivery.payment_status})</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-dark-400 uppercase">Assigned Delivery Courier</p>
                      {selectedMapDelivery.assigned_driver ? (
                        <div className="flex items-center justify-between bg-white dark:bg-dark-900 p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 text-xs">
                          <span className="font-semibold text-dark-900 dark:text-white">{selectedMapDelivery.assigned_driver.full_name}</span>
                          <span className="text-[10px] text-dark-400 font-mono">{selectedMapDelivery.assigned_driver.employee_code}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-dark-400 italic">No courier assigned to this delivery.</p>
                      )}
                    </div>

                    {selectedMapDelivery.notes && (
                      <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 p-2.5 rounded-lg text-[11px] text-amber-700 dark:text-amber-400">
                        <strong>Delivery note:</strong> {selectedMapDelivery.notes}
                      </div>
                    )}

                    {/* Actions from details panel */}
                    <div className="flex gap-2 pt-2">
                      {selectedMapDelivery.status === 'Pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => openAssignDriver(selectedMapDelivery)}
                        >
                          Dispatch Order
                        </Button>
                      )}
                      {selectedMapDelivery.status === 'Out for Delivery' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 text-white bg-green-600 hover:bg-green-700 border-none"
                          onClick={() => handleUpdateStatus(selectedMapDelivery.id, 'Delivered')}
                        >
                          Mark Delivered
                        </Button>
                      )}
                      {selectedMapDelivery.status !== 'Delivered' && selectedMapDelivery.status !== 'Cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:bg-red-50 border-red-200"
                          onClick={() => handleUpdateStatus(selectedMapDelivery.id, 'Cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-dark-400 space-y-2 flex-1 flex flex-col justify-center">
                    <Navigation className="h-8 w-8 mx-auto animate-bounce text-dark-300 dark:text-dark-700" />
                    <p className="text-xs">Click on any delivery marker on the map to review routing directions and order details.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CREATE ORDER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Home Delivery Request"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateDelivery}>Create Order</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDelivery} className="space-y-4">
          <Input
            label="Customer Full Name *"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            placeholder="John Doe"
            required
          />

          <Input
            label="Customer Contact Phone *"
            value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            placeholder="555-0100"
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Customer Delivery Address *</label>
            <textarea
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              className="w-full text-xs p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="123 Health Ave, Starcine City"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="Cash">Cash (COD)</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Online">Online Pre-paid</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Payment Status</label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending Auth</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Additional Shipping Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Example: Ring buzzer 2B. Gate code #9912..."
              rows={2}
            />
          </div>
        </form>
      </Modal>

      {/* ASSIGN DRIVER MODAL */}
      <Modal
        isOpen={isDriverOpen}
        onClose={() => setIsDriverOpen(false)}
        title="Assign Delivery Driver / Dispatch Order"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsDriverOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssignDriver}>Assign and Dispatch</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-500">
            Assign an active courier to handle this home delivery. Assigning a driver will automatically update the order status to <strong>Out for Delivery</strong> and send it in transit.
          </p>

          {selectedDelivery && (
            <div className="bg-dark-50 dark:bg-dark-950 p-3 rounded-lg border border-dark-200 dark:border-dark-800 space-y-1">
              <p className="text-xs font-bold text-dark-900 dark:text-white">Customer: {selectedDelivery.customer_name}</p>
              <p className="text-[10px] text-dark-500">Address: {selectedDelivery.customer_address}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Select Available Courier</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">-- Unassigned --</option>
              {drivers.map(drv => (
                <option key={drv.id} value={drv.id}>
                  {drv.full_name} ({drv.employee_code || 'No code'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

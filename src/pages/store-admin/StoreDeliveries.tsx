import React, { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, CheckCircle2, XCircle, MapPin, ExternalLink, Compass, Truck, Phone, CreditCard, Search as SearchIcon, Check, Coins
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { DeliveryRouteMap } from '../../components/maps/DeliveryRouteMap';

interface DeliveryOrder {
  id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  courier_name: string | null;
  assigned_to: string | null;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface DeliveryStaff {
  id: string;
  full_name: string;
  phone: string | null;
  status: 'Active' | 'Off Duty';
}

interface GeocodedPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const getRawDistanceKm = (lat1: number | null, lon1: number | null, lat2 = 13.0827, lon2 = 80.2707): number => {
  if (!lat1 || !lon1) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};



export const StoreDeliveries: React.FC = () => {
  const { selectedStoreId, allStores } = useStore();
  const activeStore = allStores.find(s => s.id === selectedStoreId);

  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [couriers, setCouriers] = useState<DeliveryStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'cancelled' | 'couriers' | 'payouts'>('pending');

  // Fixed Delivery Rate per KM (default ₹4 / km)
  const [ratePerKm, setRatePerKm] = useState<number>(() => {
    const saved = localStorage.getItem('starcine_delivery_rate_per_km');
    return saved ? parseFloat(saved) : 4;
  });

  const handleUpdateRatePerKm = (newRate: number) => {
    setRatePerKm(newRate);
    localStorage.setItem('starcine_delivery_rate_per_km', String(newRate));
  };

  const [settledDrivers, setSettledDrivers] = useState<Record<string, boolean>>({});


  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isMapRouteOpen, setIsMapRouteOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [selectedMapRouteDelivery, setSelectedMapRouteDelivery] = useState<DeliveryOrder | null>(null);
  const [assignedCourierId, setAssignedCourierId] = useState('');

  // New Order inputs
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'Card' | 'Online' | 'UPI'>('Cash');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Unpaid' | 'Pending'>('Unpaid');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState('13.0827');
  const [longitude, setLongitude] = useState('80.2707');

  // Place Search State
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodedPlaces, setGeocodedPlaces] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('users')
        .select('id, full_name, first_name, last_name, phone, is_active')
        .eq('branch_id', selectedStoreId);

      const driversList = (staffData || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Driver',
        phone: u.phone || '—',
        status: (u.is_active ? 'Active' : 'Off Duty') as 'Active' | 'Off Duty'
      }));

      setCouriers(driversList);

      const { data: deliveriesData, error: delErr } = await supabase
        .from('home_deliveries')
        .select('*')
        .eq('branch_id', selectedStoreId)
        .order('created_at', { ascending: false });

      if (delErr) throw delErr;

      const formatted: DeliveryOrder[] = (deliveriesData || []).map((d: any) => {
        const matchedDriver = driversList.find(u => u.id === d.assigned_to);
        return {
          id: d.id,
          customer_name: d.customer_name,
          customer_address: d.customer_address,
          customer_phone: d.customer_phone,
          payment_method: d.payment_method || 'Cash',
          payment_status: d.payment_status || 'Unpaid',
          notes: d.notes || null,
          courier_name: matchedDriver?.full_name || null,
          assigned_to: d.assigned_to,
          status: d.status || 'Pending',
          created_at: d.created_at,
          updated_at: d.updated_at,
          latitude: d.latitude,
          longitude: d.longitude
        };
      });

      setDeliveries(formatted);
    } catch (err: any) {
      console.error('Error fetching store deliveries:', err.message);
      setDeliveries([]);
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  // Handle Geolocation Search API
  const handleSearchPlaceLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!placeSearchQuery.trim()) {
      showToast('Please enter a landmark or place name to search.', 'error');
      return;
    }

    setGeocodingLoading(true);
    setGeocodedPlaces([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeSearchQuery.trim())}&limit=5`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setGeocodedPlaces(data);
        const topPlace = data[0];
        const lat = parseFloat(topPlace.lat).toFixed(6);
        const lon = parseFloat(topPlace.lon).toFixed(6);

        setLatitude(lat);
        setLongitude(lon);
        if (!custAddress.trim()) {
          setCustAddress(topPlace.display_name);
        }
        setSelectedPlaceName(topPlace.display_name);
        showToast(`Detected location: ${lat}, ${lon}`);
      } else {
        showToast('No matching places found. Try a broader search phrase.', 'error');
      }
    } catch (err: any) {
      showToast('Place search service unavailable.', 'error');
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleSelectGeocodedPlace = (place: GeocodedPlace) => {
    const lat = parseFloat(place.lat).toFixed(6);
    const lon = parseFloat(place.lon).toFixed(6);
    setLatitude(lat);
    setLongitude(lon);
    if (!custAddress.trim()) {
      setCustAddress(place.display_name);
    }
    setSelectedPlaceName(place.display_name);
    setGeocodedPlaces([]);
    showToast(`Selected location: ${lat}, ${lon}`);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custAddress.trim()) return;

    const latNum = parseFloat(latitude) || 13.0827;
    const lngNum = parseFloat(longitude) || 80.2707;

    const newObj = {
      customer_name: custName.trim(),
      customer_phone: custPhone.trim(),
      customer_address: custAddress.trim(),
      payment_method: payMethod,
      payment_status: payStatus,
      notes: notes.trim() || null,
      status: 'Pending',
      branch_id: selectedStoreId,
      store_id: selectedStoreId,
      latitude: latNum,
      longitude: lngNum
    };

    try {
      const { data, error } = await supabase
        .from('home_deliveries')
        .insert([newObj])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        showToast(`Created home delivery order for ${custName}`);
        fetchData();
      }
    } catch (err: any) {
      showToast(`Failed to create order: ${err.message}`, 'error');
    } finally {
      setIsNewOrderModalOpen(false);
      setCustName('');
      setCustAddress('');
      setCustPhone('');
      setNotes('');
      setPlaceSearchQuery('');
      setSelectedPlaceName(null);
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !assignedCourierId) return;

    const courier = couriers.find(c => c.id === assignedCourierId);
    try {
      const { error } = await supabase
        .from('home_deliveries')
        .update({
          assigned_to: assignedCourierId,
          status: 'Out for Delivery',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      showToast(`Dispatched delivery via ${courier?.full_name}`);
      fetchData();
    } catch (err: any) {
      showToast(`Dispatch failed: ${err.message}`, 'error');
    } finally {
      setIsDispatchModalOpen(false);
    }
  };

  const handleCompleteOrder = async (order: DeliveryOrder) => {
    try {
      const { error } = await supabase
        .from('home_deliveries')
        .update({
          status: 'Delivered',
          payment_status: order.payment_method === 'Cash' ? 'Paid' : order.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;
      showToast(`Marked delivery #${order.id.substring(0, 6)} as completed!`);
      fetchData();
    } catch (err: any) {
      showToast(`Error completing order: ${err.message}`, 'error');
    }
  };

  const handleCancelOrder = async (order: DeliveryOrder) => {
    try {
      const { error } = await supabase
        .from('home_deliveries')
        .update({
          status: 'Cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;
      showToast(`Cancelled delivery order`);
      fetchData();
    } catch (err: any) {
      showToast(`Error cancelling order: ${err.message}`, 'error');
    }
  };

  const handleToggleSettleDriver = (driverId: string, name: string, amount: number) => {
    const isNowSettled = !settledDrivers[driverId];
    setSettledDrivers(prev => ({ ...prev, [driverId]: isNowSettled }));
    if (isNowSettled) {
      showToast(`Settled ₹${amount.toFixed(2)} delivery payout to ${name}`);
    } else {
      showToast(`Reopened payout balance for ${name}`);
    }
  };

  const filteredOrders = deliveries.filter(o => {
    if (activeTab === 'pending') return o.status === 'Pending' || o.status === 'Out for Delivery';
    if (activeTab === 'completed') return o.status === 'Delivered';
    if (activeTab === 'cancelled') return o.status === 'Cancelled';
    return false;
  });

  // Driver Payout Aggregations
  const driverPayoutsSummary = couriers.map(drv => {
    const drvDeliveries = deliveries.filter(d => d.assigned_to === drv.id && d.status === 'Delivered');
    const totalKm = drvDeliveries.reduce((sum, d) => sum + getRawDistanceKm(d.latitude, d.longitude), 0);
    const totalPayout = totalKm * ratePerKm;
    const isSettled = !!settledDrivers[drv.id];

    return {
      driver: drv,
      completedCount: drvDeliveries.length,
      totalKm: parseFloat(totalKm.toFixed(1)),
      totalPayout: parseFloat(totalPayout.toFixed(2)),
      isSettled
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(item => item.id !== t.id))} />
      ))}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand-500" /> Home Delivery Dispatch
          </h1>
          <p className="text-xs text-dark-500">Dispatch medication orders, calculate driver per-KM payouts, and manage settlements.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Rate per KM Input */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg text-xs">
            <Coins className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="font-bold text-dark-500">Rate/KM:</span>
            <span className="font-bold text-brand-600">₹</span>
            <input
              type="number"
              value={ratePerKm}
              onChange={(e) => handleUpdateRatePerKm(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-12 text-xs font-bold bg-transparent text-dark-900 dark:text-white focus:outline-none"
              title="Change fixed payment rate per KM for drivers"
            />
          </div>

          <Button onClick={() => setIsNewOrderModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            New Order
          </Button>
          <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-100 dark:border-dark-800 pb-px">
        {(['pending', 'completed', 'cancelled', 'couriers', 'payouts'] as const).map(tab => (
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
            {tab === 'couriers' ? 'Couriers Log' : tab === 'payouts' ? 'Driver Payouts (Per-KM)' : `${tab} dispatches`}
          </button>
        ))}
      </div>

      {/* Main Table / View Panel */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-dark-400">Loading delivery records...</div>
          ) : activeTab === 'payouts' ? (
            /* Driver Payouts Console */
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] uppercase font-bold tracking-wider text-dark-500">
                  <tr>
                    <th className="px-4 py-3">Courier Driver</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3 text-center">Completed Orders</th>
                    <th className="px-3 py-3 text-center">Distance Traveled</th>
                    <th className="px-3 py-3 text-right">Fixed Rate</th>
                    <th className="px-3 py-3 text-right">Total Payout Earnings</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Settlement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {driverPayoutsSummary.map(({ driver, completedCount, totalKm, totalPayout, isSettled }) => (
                    <tr key={driver.id} className="hover:bg-dark-50/30 dark:hover:bg-dark-900/10">
                      <td className="px-4 py-3.5 font-bold text-dark-800 dark:text-dark-200">{driver.full_name}</td>
                      <td className="px-3 py-3.5 font-mono text-dark-500">{driver.phone || '—'}</td>
                      <td className="px-3 py-3.5 text-center font-bold">{completedCount} orders</td>
                      <td className="px-3 py-3.5 text-center font-bold text-brand-600">{totalKm} km</td>
                      <td className="px-3 py-3.5 text-right font-mono">₹{ratePerKm}/km</td>
                      <td className="px-3 py-3.5 text-right font-extrabold text-emerald-600 text-sm">₹{totalPayout.toFixed(2)}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSettled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {isSettled ? 'Settled' : 'Unsettled'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={isSettled ? 'outline' : 'primary'}
                          className={isSettled ? 'text-emerald-600 border-emerald-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                          onClick={() => handleToggleSettleDriver(driver.id, driver.full_name, totalPayout)}
                        >
                          {isSettled ? 'Mark Unpaid' : 'Settle Payout'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'couriers' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800">
                  <tr>
                    <th className="px-4 py-3 font-bold text-dark-500 uppercase">Courier Driver</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase">Phone</th>
                    <th className="px-3 py-3 font-bold text-dark-500 uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {couriers.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3.5 font-bold text-dark-800 dark:text-dark-200">{c.full_name}</td>
                      <td className="px-3 py-3.5 font-mono text-dark-500">{c.phone || '—'}</td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-dark-100 text-dark-500'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 text-[10px] uppercase font-bold tracking-wider text-dark-500">
                  <tr>
                    <th className="px-4 py-3">Customer Details</th>
                    <th className="px-3 py-3">Delivery Address & Distance</th>
                    <th className="px-3 py-3">Driver Payout (Per-KM)</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Assigned Courier</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Dispatch Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800 text-xs font-medium">
                  {filteredOrders.map(order => {
                    const rawKm = getRawDistanceKm(order.latitude, order.longitude, activeStore?.latitude || 13.0827, activeStore?.longitude || 80.2707);
                    const distanceStr = rawKm > 0 ? `${rawKm} km` : '—';
                    const driverPayout = rawKm * ratePerKm;

                    const googleMapsUrl = (order.latitude && order.longitude)
                      ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`;

                    return (
                      <tr key={order.id} className="hover:bg-dark-50/30 dark:hover:bg-dark-900/20">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-dark-900 dark:text-white">{order.customer_name}</p>
                          <p className="text-[10px] text-dark-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="h-3 w-3 text-brand-500" /> {order.customer_phone}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 text-dark-700 dark:text-dark-300 max-w-xs">
                          <p className="font-semibold truncate">{order.customer_address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-500/20">
                              <Compass className="h-3 w-3" /> {distanceStr}
                            </span>
                            {(order.latitude && order.longitude && activeStore?.latitude && activeStore?.longitude) ? (
                              <button
                                onClick={() => {
                                  setSelectedMapRouteDelivery(order);
                                  setIsMapRouteOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                              >
                                <MapPin className="h-3 w-3" /> 🗺️ View Live Map Route
                              </button>
                            ) : (
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                              >
                                <MapPin className="h-3 w-3" /> GPS Map <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Calculated Driver Payout per KM */}
                        <td className="px-3 py-3.5">
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                            ₹{driverPayout.toFixed(2)}
                          </span>
                          <p className="text-[9px] font-mono text-dark-400">
                            {rawKm} km @ ₹{ratePerKm}/km
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="font-semibold text-dark-900 dark:text-white flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-dark-400" /> {order.payment_method}
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${order.payment_status === 'Paid' ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 font-bold text-brand-600">
                          {order.courier_name || <span className="text-dark-400 font-normal italic">Unassigned</span>}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                            order.status === 'Out for Delivery' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' :
                            order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
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
                          {order.status === 'Out for Delivery' && (
                            <>
                              <button onClick={() => handleCompleteOrder(order)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Complete Dispatch">
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleCancelOrder(order)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancel Order">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Dispatch Driver Assignment Modal */}
      <Modal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} title={`🚚 Assign Courier: ${selectedOrder?.customer_name}`}>
        <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-dark-700 dark:text-dark-300 uppercase mb-1">Select Active Courier</label>
            <select
              value={assignedCourierId}
              onChange={e => setAssignedCourierId(e.target.value)}
              required
              className="w-full p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white"
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
      <Modal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} title="🚚 Record New Home Delivery Order">
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <Input label="Customer Full Name *" placeholder="e.g. Alice Cooper" value={custName} onChange={e => setCustName(e.target.value)} required />
          <Input label="Customer Contact Phone *" placeholder="e.g. +91 9876543210" value={custPhone} onChange={e => setCustPhone(e.target.value)} required />
          <div className="space-y-1">
            <label className="font-bold text-dark-700 dark:text-dark-300">Delivery Address *</label>
            <textarea
              value={custAddress}
              onChange={e => setCustAddress(e.target.value)}
              className="w-full text-xs p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-white"
              placeholder="Full street address..."
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-dark-700 dark:text-dark-300">Payment Method</label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-white"
              >
                <option value="Cash">Cash (COD)</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-dark-700 dark:text-dark-300">Payment Status</label>
              <select
                value={payStatus}
                onChange={e => setPayStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-white"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Location Landmark Search */}
          <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-dark-800 dark:text-dark-200 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-brand-500" /> Landmark & Place Search
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-dark-400" />
                <input
                  type="text"
                  value={placeSearchQuery}
                  onChange={(e) => setPlaceSearchQuery(e.target.value)}
                  placeholder="e.g. Trivandrum Peyad near SBI Bank"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchPlaceLocation(); } }}
                  className="w-full text-xs py-2 pl-8 pr-3 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-lg text-dark-900 dark:text-white"
                />
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSearchPlaceLocation}
                disabled={geocodingLoading}
              >
                {geocodingLoading ? 'Searching...' : 'Search Location'}
              </Button>
            </div>

            {geocodedPlaces.length > 0 && (
              <div className="bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg p-2 space-y-1 max-h-36 overflow-y-auto text-xs">
                <p className="text-[10px] font-bold text-dark-400 uppercase">Select exact landmark result:</p>
                {geocodedPlaces.map(place => (
                  <div
                    key={place.place_id}
                    onClick={() => handleSelectGeocodedPlace(place)}
                    className="p-1.5 rounded hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer flex items-center justify-between text-dark-800 dark:text-dark-200"
                  >
                    <span className="truncate pr-2">{place.display_name}</span>
                    <span className="font-mono text-[9px] text-dark-400 shrink-0">({parseFloat(place.lat).toFixed(4)}, {parseFloat(place.lon).toFixed(4)})</span>
                  </div>
                ))}
              </div>
            )}

            {selectedPlaceName && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Detected: {selectedPlaceName}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dark-200/60 dark:border-dark-800">
              <Input label="Latitude" value={latitude} onChange={e => setLatitude(e.target.value)} />
              <Input label="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsNewOrderModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Order</Button>
          </div>
        </form>
      </Modal>

      {/* LIVE MAP ROUTE MODAL */}
      <Modal
        isOpen={isMapRouteOpen}
        onClose={() => {
          setIsMapRouteOpen(false);
          setSelectedMapRouteDelivery(null);
        }}
        title="Delivery Navigation & Route Plan"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-dark-500">
            Optimal driving route from <strong>{activeStore?.name || 'Store'}</strong> to <strong>{selectedMapRouteDelivery?.customer_name}</strong>.
          </p>
          {selectedMapRouteDelivery && activeStore?.latitude && activeStore?.longitude && selectedMapRouteDelivery.latitude && selectedMapRouteDelivery.longitude ? (
            <DeliveryRouteMap
              storeLat={activeStore.latitude}
              storeLon={activeStore.longitude}
              deliveryLat={selectedMapRouteDelivery.latitude}
              deliveryLon={selectedMapRouteDelivery.longitude}
            />
          ) : (
            <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold text-center border border-amber-200">
              Cannot generate route: Missing precise GPS coordinates for store or customer.
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setIsMapRouteOpen(false)}>Close Map</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default StoreDeliveries;

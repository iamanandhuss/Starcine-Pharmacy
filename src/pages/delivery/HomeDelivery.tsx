import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Filter, CheckCircle2, 
  Clock, MapPin, Phone, User, 
  Map, List, Navigation, RefreshCw, Edit3, ExternalLink,
  Compass, CreditCard, Crosshair, Search as SearchIcon, Check, Store, Building2, Shield,
  Wallet, Coins
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../components/ui/Toast';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  employee_code: string;
  branch_id?: string | null;
}

interface Delivery {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: 'Cash' | 'Card' | 'Online' | 'UPI';
  payment_status: 'Paid' | 'Unpaid' | 'Pending';
  notes: string | null;
  assigned_to: string | null;
  branch_id: string | null;
  store_id: string | null;
  latitude: number | null;
  longitude: number | null;
  // Joins
  assigned_driver?: UserProfile | null;
  branch_name?: string | null;
  branch_lat?: number | null;
  branch_lon?: number | null;
}

interface GeocodedPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Calculate Haversine Distance in Kilometers
const getRawDistanceKm = (lat1: number | null, lon1: number | null, lat2 = 13.0827, lon2 = 80.2707): number => {
  if (!lat1 || !lon1) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

const calculateDistanceKm = (lat1: number | null, lon1: number | null, lat2 = 13.0827, lon2 = 80.2707): string => {
  const dist = getRawDistanceKm(lat1, lon1, lat2, lon2);
  return dist > 0 ? `${dist} km` : '—';
};

export const HomeDelivery: React.FC = () => {
  const { allStores, selectedStoreId } = useStore();
  const { isSuperAdmin } = useAuth();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fixed Delivery Rate per KM (default ₹4 / km)
  const [ratePerKm, setRatePerKm] = useState<number>(() => {
    const saved = localStorage.getItem('starcine_delivery_rate_per_km');
    return saved ? parseFloat(saved) : 4;
  });

  const handleUpdateRatePerKm = (newRate: number) => {
    setRatePerKm(newRate);
    localStorage.setItem('starcine_delivery_rate_per_km', String(newRate));
  };

  // Multi-Filter States for Super Admin & Store Admins
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  
  // View mode (list vs map vs driver payouts)
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'payouts'>('list');
  const [selectedMapDelivery, setSelectedMapDelivery] = useState<Delivery | null>(null);

  // Settlement Tracking state
  const [settledDrivers, setSettledDrivers] = useState<Record<string, boolean>>({});

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDriverOpen, setIsDriverOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Geocoding Place Search State
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodedPlaces, setGeocodedPlaces] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [mapLink, setMapLink] = useState('');

  const handlePhoneBlur = async () => {
    const phone = formData.customer_phone.trim();
    if (phone.length < 5) return;
    try {
      const { data, error } = await supabase.from('customer_address_book').select('*').eq('phone', phone).maybeSingle();
      if (data) {
        setFormData(prev => ({
          ...prev,
          customer_name: data.name || prev.customer_name,
          customer_address: data.address || prev.customer_address,
          latitude: data.latitude ? String(data.latitude) : prev.latitude,
          longitude: data.longitude ? String(data.longitude) : prev.longitude
        }));
        showToast('Customer details auto-filled from address book!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMapLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMapLink(val);
    const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(match[1]).toFixed(6),
        longitude: parseFloat(match[2]).toFixed(6)
      }));
      setSelectedPlaceName("Parsed from Google Maps link");
      showToast(`Detected location: ${match[1]}, ${match[2]}`);
    } else if (val.includes('goo.gl') || val.includes('maps.app.goo.gl')) {
      showToast('Short links cannot be parsed automatically. Please open it in a browser and paste the full URL.', 'error');
    }
  };

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Create/Edit Delivery Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    payment_method: 'Cash' as 'Cash' | 'Card' | 'Online' | 'UPI',
    payment_status: 'Unpaid' as 'Paid' | 'Unpaid' | 'Pending',
    notes: '',
    branch_id: selectedStoreId || (allStores[0]?.id || ''),
    latitude: '13.0827',
    longitude: '80.2707'
  });

  // Assign Driver State
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Synchronize store selection if store context changes
  useEffect(() => {
    if (selectedStoreId && branchFilter !== 'all' && branchFilter !== selectedStoreId) {
      setBranchFilter(selectedStoreId);
    }
  }, [selectedStoreId]);

  // Fetch data from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Drivers across selected store or all stores
      let userQuery = supabase.from('users').select('*');
      if (branchFilter !== 'all') {
        userQuery = userQuery.eq('branch_id', branchFilter);
      }

      const { data: usersData, error: usersError } = await userQuery;

      let driversList: UserProfile[] = [];
      if (!usersError && usersData) {
        driversList = usersData.map(u => ({
          id: u.id,
          full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email.split('@')[0],
          email: u.email,
          phone: u.phone || '',
          employee_code: u.employee_code || '',
          branch_id: u.branch_id
        }));
        setDrivers(driversList);
      } else {
        setDrivers([]);
      }

      // 2. Fetch Deliveries with Branch Names
      let delivQuery = supabase
        .from('home_deliveries')
        .select('*')
        .order('created_at', { ascending: false });

      if (branchFilter !== 'all') {
        delivQuery = delivQuery.eq('branch_id', branchFilter);
      }

      const { data: deliveriesData, error: deliveriesError } = await delivQuery;

      if (deliveriesError) throw deliveriesError;

      if (deliveriesData) {
        const listWithRelations = deliveriesData.map((d: any) => {
          const matchedDriver = driversList.find(drv => drv.id === d.assigned_to);
          const matchedStore = allStores.find(s => s.id === d.branch_id || s.id === d.store_id);
          return {
            ...d,
            branch_name: matchedStore?.name || 'Main Pharmacy Store',
            branch_lat: matchedStore?.latitude,
            branch_lon: matchedStore?.longitude,
            assigned_driver: matchedDriver || null
          };
        });
        setDeliveries(listWithRelations);
      }
    } catch (err: any) {
      console.error('Error fetching home deliveries:', err.message);
      showToast(`Failed to load deliveries: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchFilter]);

  // Handle Geolocation capture
  const handleCaptureGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6)
          }));
          setSelectedPlaceName('Current Device GPS Location');
          showToast('GPS Coordinates updated from browser location!');
        },
        (err) => {
          showToast(`Geolocation failed: ${err.message}`, 'error');
        }
      );
    } else {
      showToast('Geolocation is not supported by your browser.', 'error');
    }
  };

  // Search Place via OpenStreetMap Nominatim Geocoding API
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

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          customer_address: prev.customer_address ? prev.customer_address : topPlace.display_name
        }));
        setSelectedPlaceName(topPlace.display_name);
        showToast(`Found location coordinates: ${lat}, ${lon}`);
      } else {
        showToast('No matching places found. Try a broader location search query.', 'error');
      }
    } catch (err: any) {
      console.error('Geocoding error:', err.message);
      showToast('Place search service unavailable. Please enter coordinates manually.', 'error');
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleSelectGeocodedPlace = (place: GeocodedPlace) => {
    const lat = parseFloat(place.lat).toFixed(6);
    const lon = parseFloat(place.lon).toFixed(6);

    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      customer_address: prev.customer_address ? prev.customer_address : place.display_name
    }));
    setSelectedPlaceName(place.display_name);
    setGeocodedPlaces([]);
    showToast(`Selected location: ${lat}, ${lon}`);
  };

  // Create Delivery Order
  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to home deliveries.', 'error');
      return;
    }
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_address) {
      showToast('Please fill in all required customer fields.', 'error');
      return;
    }

    const targetBranchId = formData.branch_id || selectedStoreId || (allStores[0]?.id || null);
    const latNum = parseFloat(formData.latitude) || 13.0827;
    const lngNum = parseFloat(formData.longitude) || 80.2707;

    const newDeliveryObj = {
      status: 'Pending',
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_address: formData.customer_address.trim(),
      payment_method: formData.payment_method,
      payment_status: formData.payment_status,
      notes: formData.notes.trim() || null,
      assigned_to: null,
      latitude: latNum,
      longitude: lngNum,
      branch_id: targetBranchId,
      store_id: targetBranchId
    };

    try {
      const { data, error } = await supabase
        .from('home_deliveries')
        .insert([newDeliveryObj])
        .select('*');

      if (error) throw error;

      if (data && data[0]) {
        // Upsert customer address book
        await supabase.from('customer_address_book').upsert({
          phone: formData.customer_phone.trim(),
          name: formData.customer_name.trim(),
          address: formData.customer_address.trim(),
          latitude: latNum,
          longitude: lngNum
        }, { onConflict: 'phone' });

        const matchedStore = allStores.find(s => s.id === targetBranchId);
        const fullNew: Delivery = {
          ...data[0],
          branch_name: matchedStore?.name || 'Store Branch',
          branch_lat: matchedStore?.latitude,
          branch_lon: matchedStore?.longitude,
          assigned_driver: null
        };
        setDeliveries([fullNew, ...deliveries]);
        setIsCreateOpen(false);
        resetForm();
        showToast(`Delivery order created for ${formData.customer_name}!`);
      }
    } catch (err: any) {
      console.error('Error inserting delivery:', err);
      showToast(`Failed to create order: ${err.message}`, 'error');
    }
  };

  // Open Edit Modal
  const openEditModal = (deliv: Delivery) => {
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to home deliveries.', 'error');
      return;
    }
    setSelectedDelivery(deliv);
    setFormData({
      customer_name: deliv.customer_name,
      customer_phone: deliv.customer_phone,
      customer_address: deliv.customer_address,
      payment_method: deliv.payment_method,
      payment_status: deliv.payment_status,
      notes: deliv.notes || '',
      branch_id: deliv.branch_id || selectedStoreId || '',
      latitude: deliv.latitude ? String(deliv.latitude) : '13.0827',
      longitude: deliv.longitude ? String(deliv.longitude) : '80.2707'
    });
    setPlaceSearchQuery('');
    setGeocodedPlaces([]);
    setSelectedPlaceName(null);
    setIsEditOpen(true);
  };

  // Submit Edit Delivery Order
  const handleEditDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to home deliveries.', 'error');
      return;
    }
    if (!selectedDelivery) return;

    const latNum = parseFloat(formData.latitude) || 13.0827;
    const lngNum = parseFloat(formData.longitude) || 80.2707;

    const updateObj = {
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_address: formData.customer_address.trim(),
      payment_method: formData.payment_method,
      payment_status: formData.payment_status,
      notes: formData.notes.trim() || null,
      branch_id: formData.branch_id || selectedDelivery.branch_id,
      store_id: formData.branch_id || selectedDelivery.store_id,
      latitude: latNum,
      longitude: lngNum,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('home_deliveries')
        .update(updateObj)
        .eq('id', selectedDelivery.id);

      if (error) throw error;

      // Upsert customer address book
      await supabase.from('customer_address_book').upsert({
        phone: formData.customer_phone.trim(),
        name: formData.customer_name.trim(),
        address: formData.customer_address.trim(),
        latitude: latNum,
        longitude: lngNum
      }, { onConflict: 'phone' });

      const matchedStore = allStores.find(s => s.id === updateObj.branch_id);

      setDeliveries(prev => prev.map(d => d.id === selectedDelivery.id ? { 
        ...d, 
        ...updateObj, 
        branch_name: matchedStore?.name || d.branch_name 
      } : d));
      setIsEditOpen(false);
      showToast(`Updated delivery order for ${formData.customer_name}`);
    } catch (err: any) {
      showToast(`Failed to update order: ${err.message}`, 'error');
    }
  };

  // Open Assign Driver Dialog
  const openAssignDriver = (deliv: Delivery) => {
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to home deliveries.', 'error');
      return;
    }
    setSelectedDelivery(deliv);
    setSelectedDriverId(deliv.assigned_to || '');
    setIsDriverOpen(true);
  };

  // Submit Driver Assignment
  const handleAssignDriver = async () => {
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to home deliveries.', 'error');
      return;
    }
    if (!selectedDelivery) return;

    const driverId = selectedDriverId === '' ? null : selectedDriverId;
    const matchedDriver = drivers.find(d => d.id === driverId) || null;

    try {
      const updateObj: any = {
        assigned_to: driverId,
        updated_at: new Date().toISOString()
      };

      if (driverId && selectedDelivery.status === 'Pending') {
        updateObj.status = 'Out for Delivery';
      }

      const { error } = await supabase
        .from('home_deliveries')
        .update(updateObj)
        .eq('id', selectedDelivery.id);

      if (error) throw error;

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
      showToast(`Dispatched delivery via ${matchedDriver?.full_name || 'Driver'}`);
    } catch (err: any) {
      console.error('Error updating driver:', err);
      showToast(`Failed to assign driver: ${err.message}`, 'error');
    }
  };

  // Update Status directly
  const handleUpdateStatus = async (deliveryId: string, newStatus: Delivery['status']) => {
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to home deliveries.', 'error');
      return;
    }
    try {
      const targetDeliv = deliveries.find(d => d.id === deliveryId);
      const isDelivered = newStatus === 'Delivered';
      const autoPaid = isDelivered && targetDeliv?.payment_method === 'Cash';

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
      showToast(`Delivery status updated to "${newStatus}"`);
    } catch (err: any) {
      console.error('Error updating status:', err);
      showToast(`Failed to update status: ${err.message}`, 'error');
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
      branch_id: selectedStoreId || (allStores[0]?.id || ''),
      latitude: '13.0827',
      longitude: '80.2707'
    });
    setPlaceSearchQuery('');
    setGeocodedPlaces([]);
    setSelectedPlaceName(null);
  };

  // Toggle driver settlement
  const handleToggleSettleDriver = (driverId: string, name: string, amount: number) => {
    if (isSuperAdmin) {
      showToast('Super Admins have read-only audit access to delivery payouts.', 'error');
      return;
    }
    const isNowSettled = !settledDrivers[driverId];
    setSettledDrivers(prev => ({ ...prev, [driverId]: isNowSettled }));
    if (isNowSettled) {
      showToast(`Settled ₹${amount.toFixed(2)} delivery payout to ${name}`);
    } else {
      showToast(`Reopened payout balance for ${name}`);
    }
  };

  // Comprehensive Multi-Filtering logic
  const filteredDeliveries = deliveries.filter(d => {
    const matchesSearch = 
      d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer_phone.includes(searchTerm) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = branchFilter === 'all' || d.branch_id === branchFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || d.payment_status === paymentStatusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || d.payment_method === paymentMethodFilter;
    const matchesDriver = driverFilter === 'all' || d.assigned_to === driverFilter;

    return matchesSearch && matchesBranch && matchesStatus && matchesPaymentStatus && matchesPaymentMethod && matchesDriver;
  });

  // Driver Payout Aggregations
  const driverPayoutsSummary = drivers.map(drv => {
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

  // Calculate status counters
  const totalCount = deliveries.length;
  const pendingCount = deliveries.filter(d => d.status === 'Pending').length;
  const activeCount = deliveries.filter(d => d.status === 'Out for Delivery').length;
  const completedCount = deliveries.filter(d => d.status === 'Delivered').length;
  const totalCompletedKm = deliveries
    .filter(d => d.status === 'Delivered')
    .reduce((sum, d) => sum + getRawDistanceKm(d.latitude, d.longitude), 0);
  const totalDriverPayouts = totalCompletedKm * ratePerKm;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notifications */}
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(item => item.id !== t.id))} />
      ))}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-dark-900 dark:text-white flex items-center gap-2">
            <Truck className="h-7 w-7 text-brand-600 dark:text-brand-500" />
            Home Deliveries Command Center
          </h1>
          <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
            Dispatch prescription orders across all pharmacy shops, search location landmarks, calculate per-KM driver payouts, and audit settlements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Rate per KM Configurator */}
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
              disabled={isSuperAdmin}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Sync
          </Button>

          {/* Super Admin Read-Only Badge vs Store Admin Create Button */}
          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Shield className="h-4 w-4 text-blue-500" />
              Read-Only Audit Mode
            </span>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => { resetForm(); setIsCreateOpen(true); }}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Order
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid with Driver Payouts Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

        {/* Total Driver Payout Earnings Card */}
        <Card className="hover:scale-[1.02] duration-200 cursor-pointer bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" onClick={() => setViewMode('payouts')}>
          <Card.Content className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Driver Payouts</p>
              <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{totalDriverPayouts.toFixed(2)}</h3>
              <p className="text-[9px] text-dark-400 font-mono">{totalCompletedKm.toFixed(1)} km total</p>
            </div>
            <div className="p-3 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Wallet className="h-5 w-5" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Main Panel with Multi-Filter Controls Bar */}
      <Card>
        <Card.Header className="p-4 border-b border-dark-100 dark:border-dark-800/80 flex flex-col gap-4">
          {/* Upper row: Search & Store Selector */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search customer, address, phone, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs py-2 pl-9 pr-4 bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Shop / Store Branch Selector Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-dark-700 dark:text-dark-300 flex items-center gap-1">
                <Store className="h-4 w-4 text-brand-500 shrink-0" /> Shop Branch:
              </span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs font-bold py-2 px-3 bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 border border-brand-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">🏪 All Shops & Branches ({allStores.length})</option>
                {allStores.map(store => (
                  <option key={store.id} value={store.id}>
                    📍 {store.name} ({store.code || 'Store'})
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-dark-100 dark:bg-dark-800/80 p-0.5 rounded-lg border border-dark-200 dark:border-dark-800/50 shrink-0">
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
              <button
                onClick={() => setViewMode('payouts')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer
                  ${viewMode === 'payouts' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm' 
                    : 'text-dark-500 hover:text-dark-800 dark:hover:text-dark-300'
                  }
                `}
              >
                <Wallet className="h-3.5 w-3.5" />
                Driver Payouts
              </button>
            </div>
          </div>

          {/* Lower row: Granular Filters */}
          {viewMode !== 'payouts' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-dark-100 dark:border-dark-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-dark-500 font-semibold flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-1 px-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-750 rounded-md font-semibold text-dark-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-dark-500 font-semibold flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Payment:
                </span>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="py-1 px-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-750 rounded-md font-semibold text-dark-900 dark:text-white"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Pending">Pending Auth</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-dark-500 font-semibold">Method:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="py-1 px-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-750 rounded-md font-semibold text-dark-900 dark:text-white"
                >
                  <option value="all">All Methods</option>
                  <option value="Cash">Cash (COD)</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online Pre-paid</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-dark-500 font-semibold flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Driver:
                </span>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="py-1 px-2.5 bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-750 rounded-md font-semibold text-dark-900 dark:text-white"
                >
                  <option value="all">All Drivers</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>{drv.full_name}</option>
                  ))}
                </select>
              </div>

              {(branchFilter !== 'all' || statusFilter !== 'all' || paymentStatusFilter !== 'all' || paymentMethodFilter !== 'all' || driverFilter !== 'all' || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBranchFilter('all');
                    setStatusFilter('all');
                    setPaymentStatusFilter('all');
                    setPaymentMethodFilter('all');
                    setDriverFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 py-0.5 px-2"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </Card.Header>

        {loading ? (
          <div className="p-20 text-center text-xs text-dark-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-500" />
            <p>Syncing delivery databases across all shops...</p>
          </div>
        ) : viewMode === 'payouts' ? (
          /* Driver Settlements & Per-KM Payout Console */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800/80 text-[10px] uppercase font-bold tracking-wider text-dark-500">
                  <th className="py-3 px-4">Courier Driver Name</th>
                  <th className="py-3 px-4">Employee Code & Phone</th>
                  <th className="py-3 px-4 text-center">Completed Deliveries</th>
                  <th className="py-3 px-4 text-center">Distance Traveled</th>
                  <th className="py-3 px-4 text-right">Per-KM Rate</th>
                  <th className="py-3 px-4 text-right">Calculated Driver Earnings</th>
                  <th className="py-3 px-4 text-center">Payout Status</th>
                  <th className="py-3 px-4 text-right">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800/50 text-xs font-medium">
                {driverPayoutsSummary.map(({ driver, completedCount, totalKm, totalPayout, isSettled }) => (
                  <tr key={driver.id} className="hover:bg-dark-50/30 dark:hover:bg-dark-900/10 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-extrabold text-xs">
                        {driver.full_name.charAt(0)}
                      </div>
                      {driver.full_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-dark-700 dark:text-dark-300 text-[11px]">{driver.employee_code || 'EMP-DRV'}</p>
                      <p className="text-[10px] text-dark-400 font-mono">{driver.phone || 'No phone'}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-md bg-dark-100 dark:bg-dark-800 font-extrabold text-dark-900 dark:text-white">
                        {completedCount} orders
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-brand-600 dark:text-brand-400">
                      {totalKm} km
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-dark-600 dark:text-dark-300">
                      ₹{ratePerKm}/km
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{totalPayout.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isSettled 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}>
                        {isSettled ? 'Settled' : 'Unsettled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant={isSettled ? 'outline' : 'primary'}
                        disabled={isSuperAdmin}
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
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-16 text-center text-xs text-dark-500 dark:text-dark-400 space-y-2">
            <Truck className="h-10 w-10 text-dark-300 dark:text-dark-700 mx-auto" />
            <p className="font-bold text-dark-700 dark:text-dark-300 text-sm">No delivery orders match the selected shop or filters</p>
            <p>Try clearing your filter options or selecting a different store branch.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View Table with Driver Payout calculations */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800/80 text-[10px] uppercase font-bold tracking-wider text-dark-500">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Shop Branch</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Address & Location Distance</th>
                  <th className="py-3 px-4">Driver Payout (Per-KM)</th>
                  <th className="py-3 px-4">Billing & Method</th>
                  <th className="py-3 px-4">Courier Driver</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">{isSuperAdmin ? 'Audit Action' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800/50 text-xs font-medium">
                {filteredDeliveries.map(d => {
                  let statusColor = 'bg-dark-100 text-dark-700 dark:bg-dark-800 dark:text-dark-300';
                  if (d.status === 'Pending') statusColor = 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400 border border-amber-500/20';
                  if (d.status === 'Out for Delivery') statusColor = 'bg-purple-100/80 text-purple-700 dark:bg-purple-900/10 dark:text-purple-400 border border-purple-500/20';
                  if (d.status === 'Delivered') statusColor = 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400 border border-emerald-500/20';
                  if (d.status === 'Cancelled') statusColor = 'bg-red-100/80 text-red-700 dark:bg-red-900/10 dark:text-red-400 border border-red-500/20';

                  let payColor = 'text-amber-500 dark:text-amber-400';
                  if (d.payment_status === 'Paid') payColor = 'text-emerald-500 font-bold';
                  if (d.payment_status === 'Pending') payColor = 'text-amber-500';

                  const rawKm = getRawDistanceKm(d.latitude, d.longitude, d.branch_lat || 13.0827, d.branch_lon || 80.2707);
                  const distanceText = rawKm > 0 ? `${rawKm} km` : '—';
                  const driverPayoutAmount = rawKm * ratePerKm;

                  const googleMapsUrl = (d.latitude && d.longitude && d.branch_lat && d.branch_lon)
                    ? `https://www.google.com/maps/dir/?api=1&origin=${d.branch_lat},${d.branch_lon}&destination=${d.latitude},${d.longitude}`
                    : (d.latitude && d.longitude)
                      ? `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.customer_address)}`;

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

                      {/* Shop Branch Badge */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-dark-900 dark:text-white">
                          <Building2 className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                          {d.branch_name || 'Store Branch'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-dark-900 dark:text-white">
                        {d.customer_name}
                        <p className="text-[10px] font-normal text-dark-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-brand-500" /> {d.customer_phone}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs text-dark-700 dark:text-dark-300">
                        <p className="truncate font-semibold">{d.customer_address}</p>
                        
                        {/* Distance & GPS Map Link */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                            <Compass className="h-3 w-3" /> {distanceText}
                          </span>
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            title="Open in Google Maps"
                          >
                            <MapPin className="h-3 w-3" /> 🗺️ View Full Route on Google Maps <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </td>

                      {/* Calculated Driver Payout per KM */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 text-xs">
                          ₹{driverPayoutAmount.toFixed(2)}
                        </span>
                        <p className="text-[9px] font-mono text-dark-400">
                          {rawKm} km @ ₹{ratePerKm}/km
                        </p>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <span className="font-semibold text-dark-900 dark:text-white flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-dark-400" /> {d.payment_method}
                        </span>
                        <p className={`text-[10px] uppercase tracking-wider ${payColor}`}>
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
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${statusColor}`}>
                          {d.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isSuperAdmin ? (
                          <span className="text-[10px] text-dark-400 font-semibold italic">View Only</span>
                        ) : (
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
                            
                            {/* Edit Details button */}
                            <button
                              onClick={() => openEditModal(d)}
                              className="p-1.5 text-dark-400 hover:text-dark-700 dark:hover:text-dark-200 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                              title="Edit Order Details"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

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
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Interactive Route Map View */
          <div className="p-4 grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-dark-50 dark:bg-dark-950 rounded-xl border border-dark-200 dark:border-dark-800 p-4 relative overflow-hidden h-[420px]">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-35" />
              
              <svg className="w-full h-full relative z-10" viewBox="13.04 80.22 0.09 0.09" preserveAspectRatio="xMidYMid meet">
                <circle cx="13.0827" cy="80.2707" r="0.0035" className="fill-brand-600 dark:fill-brand-500 animate-pulse stroke-white stroke-[0.0006]" />
                <circle cx="13.0827" cy="80.2707" r="0.007" className="fill-brand-500/10 stroke-none" />

                {filteredDeliveries.map(d => {
                  const isSelected = selectedMapDelivery?.id === d.id;
                  const lat = d.latitude || 13.0827;
                  const lng = d.longitude || 80.2707;

                  let color = '#d97706';
                  if (d.status === 'Out for Delivery') color = '#9333ea';
                  if (d.status === 'Delivered') color = '#16a34a';
                  if (d.status === 'Cancelled') color = '#dc2626';

                  return (
                    <g key={d.id} className="cursor-pointer" onClick={() => setSelectedMapDelivery(d)}>
                      {(d.status === 'Out for Delivery' || d.status === 'Pending') && (
                        <line 
                          x1="13.0827" 
                          y1="80.2707" 
                          x2={lat} 
                          y2={lng}
                          stroke={color} 
                          strokeWidth="0.0005" 
                          strokeDasharray="0.002, 0.001" 
                          className="opacity-60"
                        />
                      )}
                      
                      <circle 
                        cx={lat} 
                        cy={lng} 
                        r={isSelected ? '0.0028' : '0.0022'} 
                        fill={color}
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth="0.0006"
                        className="hover:scale-125 duration-150 transition-all"
                      />
                    </g>
                  );
                })}
              </svg>

              <div className="absolute top-4 left-4 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-dark-200 dark:border-dark-800 text-[10px] space-y-1 text-dark-600 dark:text-dark-300">
                <p className="font-bold flex items-center gap-1 text-dark-900 dark:text-white">
                  <MapPin className="h-3 w-3 text-brand-600" />
                  Starcine Rx Hub
                </p>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Pending Order</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500 inline-block animate-pulse" /> Out for Delivery</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Delivered</div>
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
                        <p className="text-[10px] font-bold text-brand-600 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {selectedMapDelivery.branch_name}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-500 border border-brand-500/20">
                        {selectedMapDelivery.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs border-y border-dark-100 dark:border-dark-800 py-3 text-dark-600 dark:text-dark-300">
                      <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-dark-400 shrink-0 mt-0.5" />
                        <span><strong>Address:</strong> {selectedMapDelivery.customer_address}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-brand-500 shrink-0" />
                        <span><strong>Distance:</strong> {calculateDistanceKm(selectedMapDelivery.latitude, selectedMapDelivery.longitude)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>Driver Payout:</strong> ₹{(getRawDistanceKm(selectedMapDelivery.latitude, selectedMapDelivery.longitude) * ratePerKm).toFixed(2)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-dark-400 shrink-0" />
                        <span><strong>Phone:</strong> {selectedMapDelivery.customer_phone}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!isSuperAdmin && selectedMapDelivery.status === 'Pending' && (
                        <Button variant="primary" size="sm" className="flex-1" onClick={() => openAssignDriver(selectedMapDelivery)}>
                          Dispatch Order
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <span className="text-[11px] text-dark-400 italic font-semibold text-center w-full block">Read-Only View</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-dark-400 space-y-2 flex-1 flex flex-col justify-center">
                    <Navigation className="h-8 w-8 mx-auto animate-bounce text-dark-300 dark:text-dark-700" />
                    <p className="text-xs">Click on any delivery marker on the map to review routing directions and distance.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CREATE ORDER MODAL */}
      <Modal
        isOpen={isCreateOpen && !isSuperAdmin}
        onClose={() => setIsCreateOpen(false)}
        title="Create Home Delivery Order"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateDelivery}>Create Order</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateDelivery} className="space-y-4 text-xs">
          {/* Shop Branch Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300 flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-brand-500" /> Fulfilling Shop Branch *
            </label>
            <select
              value={formData.branch_id || ''}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-white font-semibold"
              required
            >
              {allStores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code || 'Store'})
                </option>
              ))}
            </select>
          </div>

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
            onBlur={handlePhoneBlur}
            placeholder="+91 9876543210"
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Customer Delivery Address *</label>
            <textarea
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              className="w-full text-xs p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="123 Health Ave, Pharmacy District"
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
                <option value="UPI">UPI Payment</option>
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

          {/* Location Coordinates & Landmark Place Search */}
          <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-dark-800 dark:text-dark-200 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-brand-500" /> GPS Location & Landmark Search
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleCaptureGPS} leftIcon={<Crosshair className="h-3.5 w-3.5" />}>
                Get Current GPS
              </Button>
            </div>

            {/* Place Search Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider">Search Landmark / Area Name</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-dark-400" />
                  <input
                    type="text"
                    value={placeSearchQuery}
                    onChange={(e) => setPlaceSearchQuery(e.target.value)}
                    placeholder="e.g. Trivandrum Peyad near SBI Bank"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchPlaceLocation(); } }}
                    className="w-full text-xs py-2 pl-8 pr-3 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-lg text-dark-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-dark-200 dark:border-dark-700"></div>
              <span className="flex-shrink-0 mx-4 text-dark-400 text-[10px] uppercase font-bold">OR Paste Link</span>
              <div className="flex-grow border-t border-dark-200 dark:border-dark-700"></div>
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={mapLink}
                onChange={handleMapLinkChange}
                placeholder="Paste full Google Maps URL (e.g. google.com/maps/@13.08,80.27...)"
                className="w-full text-xs py-2 px-3 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-lg text-dark-900 dark:text-white"
              />
            </div>

            {/* Geocoded Results Selector Dropdown */}
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

            {/* Active Selected Location Display */}
            {selectedPlaceName && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Detected: {selectedPlaceName}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dark-200/60 dark:border-dark-800">
              <Input
                label="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="13.0827"
              />
              <Input
                label="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="80.2707"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Shipping Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Landmarks, gate code..."
              rows={2}
            />
          </div>
        </form>
      </Modal>

      {/* EDIT ORDER MODAL */}
      <Modal
        isOpen={isEditOpen && !isSuperAdmin}
        onClose={() => setIsEditOpen(false)}
        title="Edit Home Delivery Request"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditDelivery}>Save Changes</Button>
          </div>
        }
      >
        <form onSubmit={handleEditDelivery} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300 flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-brand-500" /> Fulfilling Shop Branch
            </label>
            <select
              value={formData.branch_id || ''}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full text-xs p-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-white font-semibold"
            >
              {allStores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code || 'Store'})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Customer Full Name *"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            required
          />

          <Input
            label="Customer Contact Phone *"
            value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            onBlur={handlePhoneBlur}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-dark-700 dark:text-dark-300">Customer Delivery Address *</label>
            <textarea
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              className="w-full text-xs p-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-800 rounded-lg text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                <option value="UPI">UPI Payment</option>
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

          {/* Location Landmark Search */}
          <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-dark-800 dark:text-dark-200 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-brand-500" /> Landmark Search
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleCaptureGPS} leftIcon={<Crosshair className="h-3.5 w-3.5" />}>
                Get Current GPS
              </Button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={placeSearchQuery}
                onChange={(e) => setPlaceSearchQuery(e.target.value)}
                placeholder="e.g. Trivandrum Peyad near SBI Bank"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchPlaceLocation(); } }}
                className="w-full text-xs p-2 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-750 rounded-lg text-dark-900 dark:text-white"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSearchPlaceLocation}
                disabled={geocodingLoading}
              >
                Search
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              />
              <Input
                label="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ASSIGN DRIVER MODAL */}
      <Modal
        isOpen={isDriverOpen && !isSuperAdmin}
        onClose={() => setIsDriverOpen(false)}
        title="Assign Delivery Courier / Dispatch Order"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsDriverOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssignDriver}>Assign and Dispatch</Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-dark-500">
            Assign an active courier to handle this home delivery. Assigning a driver will automatically update the order status to <strong>Out for Delivery</strong>.
          </p>

          {selectedDelivery && (
            <div className="bg-dark-50 dark:bg-dark-950 p-3 rounded-lg border border-dark-200 dark:border-dark-800 space-y-1">
              <p className="font-bold text-dark-900 dark:text-white">Customer: {selectedDelivery.customer_name}</p>
              <p className="text-[10px] text-dark-500">Address: {selectedDelivery.customer_address}</p>
              <p className="text-[10px] font-bold text-brand-600">Fulfilling Shop: {selectedDelivery.branch_name}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-dark-700 dark:text-dark-300">Select Available Courier</label>
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

export default HomeDelivery;

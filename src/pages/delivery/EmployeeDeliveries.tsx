import React, { useEffect, useState } from 'react';
import {
  Truck, MapPin, Phone, RefreshCw, CheckCircle2,
  Navigation, Compass, ExternalLink, UserCheck, Clock, PackageCheck, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  payment_status: string;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_to: string | null;
  created_at: string;
}

const getRawKm = (lat1: number | null, lon1: number | null, lat2 = 13.0827, lon2 = 80.2707): number => {
  if (!lat1 || !lon1) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

export const EmployeeDeliveries: React.FC = () => {
  const { profile } = useAuth();

  const [unassigned, setUnassigned] = useState<Delivery[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [completedToday, setCompletedToday] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'mine' | 'done'>('available');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const ratePerKm = parseFloat(localStorage.getItem('starcine_delivery_rate_per_km') || '20');
  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const storeId = profile.branch_id || profile.store_id;

      let baseQuery = supabase
        .from('home_deliveries')
        .select('*');

      if (storeId) {
        baseQuery = baseQuery.eq('branch_id', storeId);
      }

      const [
        { data: unassignedData },
        { data: myData },
        { data: doneData },
      ] = await Promise.all([
        supabase
          .from('home_deliveries')
          .select('*')
          .eq('branch_id', storeId || '')
          .eq('status', 'Pending')
          .is('assigned_to', null)
          .order('created_at', { ascending: true }),

        supabase
          .from('home_deliveries')
          .select('*')
          .eq('assigned_to', profile.id)
          .in('status', ['Pending', 'Out for Delivery'])
          .order('created_at', { ascending: false }),

        supabase
          .from('home_deliveries')
          .select('*')
          .eq('assigned_to', profile.id)
          .eq('status', 'Delivered')
          .gte('updated_at', `${today}T00:00:00Z`)
          .order('updated_at', { ascending: false }),
      ]);

      setUnassigned((unassignedData as Delivery[]) || []);
      setMyDeliveries((myData as Delivery[]) || []);
      setCompletedToday((doneData as Delivery[]) || []);
    } catch (err: any) {
      console.error('Fetch employee deliveries error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  // Self-assign: employee commits to take an unassigned delivery
  const handleCommit = async (delivery: Delivery) => {
    if (!profile?.id) return;
    setCommitting(delivery.id);
    try {
      const { error } = await supabase
        .from('home_deliveries')
        .update({
          assigned_to: profile.id,
          status: 'Out for Delivery',
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id)
        .is('assigned_to', null); // Safety: only take if still unassigned

      if (error) throw error;
      showToast(`✅ You committed to delivery for ${delivery.customer_name}! On your way.`);
      await fetchData();
    } catch (err: any) {
      showToast(`Could not commit: ${err.message}`, 'error');
    } finally {
      setCommitting(null);
    }
  };

  // Mark as delivered
  const handleComplete = async (delivery: Delivery) => {
    setCompleting(delivery.id);
    try {
      const { error } = await supabase
        .from('home_deliveries')
        .update({
          status: 'Delivered',
          payment_status: delivery.payment_method === 'Cash' ? 'Paid' : delivery.payment_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);

      if (error) throw error;
      showToast(`📦 Delivery to ${delivery.customer_name} marked as delivered!`);
      await fetchData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setCompleting(null);
    }
  };

  const totalKmToday = completedToday.reduce((sum, d) => sum + getRawKm(d.latitude, d.longitude), 0);
  const earningsToday = parseFloat((totalKmToday * ratePerKm).toFixed(2));

  return (
    <div className="space-y-6 pb-12">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(i => i.id !== t.id))} />
      ))}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand-500" />
            My Delivery Board
          </h1>
          <p className="text-xs text-dark-500 mt-0.5">
            Claim unassigned deliveries from your store, track active runs, and log completions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}>
          Refresh
        </Button>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white">
          <Card.Content className="p-4">
            <AlertCircle className="h-5 w-5 opacity-80 mb-1" />
            <p className="text-2xl font-extrabold leading-none">{loading ? '—' : unassigned.length}</p>
            <p className="text-[11px] font-semibold opacity-80 mt-0.5">Unclaimed Orders</p>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-brand-500 to-purple-600 border-0 text-white">
          <Card.Content className="p-4">
            <Truck className="h-5 w-5 opacity-80 mb-1" />
            <p className="text-2xl font-extrabold leading-none">{loading ? '—' : myDeliveries.length}</p>
            <p className="text-[11px] font-semibold opacity-80 mt-0.5">My Active Runs</p>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
          <Card.Content className="p-4">
            <PackageCheck className="h-5 w-5 opacity-80 mb-1" />
            <p className="text-2xl font-extrabold leading-none">{loading ? '—' : completedToday.length}</p>
            <p className="text-[11px] font-semibold opacity-80 mt-0.5">Completed Today</p>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-900 border-0 text-white">
          <Card.Content className="p-4">
            <Compass className="h-5 w-5 opacity-80 mb-1" />
            <p className="text-2xl font-extrabold leading-none">₹{loading ? '—' : earningsToday}</p>
            <p className="text-[11px] font-semibold opacity-80 mt-0.5">Today's Earnings ({totalKmToday.toFixed(1)} km)</p>
          </Card.Content>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-100 dark:border-dark-800">
        {[
          { key: 'available', label: `Available (${unassigned.length})` },
          { key: 'mine', label: `My Active (${myDeliveries.length})` },
          { key: 'done', label: `Completed Today (${completedToday.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer
              ${activeTab === tab.key
                ? 'border-brand-500 text-brand-600 font-extrabold'
                : 'border-transparent text-dark-500 hover:text-dark-700 dark:hover:text-dark-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Delivery Cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-dark-100 dark:bg-dark-800 rounded-xl animate-pulse" />
          ))
        ) : activeTab === 'available' ? (
          unassigned.length === 0 ? (
            <div className="py-16 text-center text-sm text-dark-400">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">No unassigned deliveries right now.</p>
              <p className="text-xs mt-1 text-dark-400">Check back later or refresh.</p>
            </div>
          ) : (
            unassigned.map(delivery => {
              const km = getRawKm(delivery.latitude, delivery.longitude);
              const earning = parseFloat((km * ratePerKm).toFixed(2));
              const mapsUrl = delivery.latitude && delivery.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${delivery.latitude},${delivery.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.customer_address)}`;

              return (
                <Card key={delivery.id} className="border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5 hover:shadow-md transition-shadow">
                  <Card.Content className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 border border-amber-500/20">
                            Unclaimed
                          </span>
                          <span className="text-[10px] text-dark-400 font-mono">
                            {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-extrabold text-dark-900 dark:text-white text-sm">{delivery.customer_name}</p>
                        <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-brand-500" /> {delivery.customer_phone}
                        </p>
                        <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 text-red-500 shrink-0" /> {delivery.customer_address}
                        </p>
                        {delivery.notes && (
                          <p className="text-[10px] italic text-dark-400 mt-1">📝 {delivery.notes}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Distance + Earning */}
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-[11px] font-bold text-brand-600">
                            <Navigation className="h-3 w-3" /> {km > 0 ? `${km} km` : '—'}
                          </div>
                          <p className="text-[11px] font-extrabold text-emerald-600 mt-1">+₹{earning} earning</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-colors"
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button
                            size="sm"
                            className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-4"
                            onClick={() => handleCommit(delivery)}
                            disabled={committing === delivery.id}
                            leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                          >
                            {committing === delivery.id ? 'Committing...' : 'Commit / Take This'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              );
            })
          )
        ) : activeTab === 'mine' ? (
          myDeliveries.length === 0 ? (
            <div className="py-16 text-center text-sm text-dark-400">
              <PackageCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">No active deliveries on your plate.</p>
              <p className="text-xs mt-1">Head to "Available" tab to claim one.</p>
            </div>
          ) : (
            myDeliveries.map(delivery => {
              const km = getRawKm(delivery.latitude, delivery.longitude);
              const earning = parseFloat((km * ratePerKm).toFixed(2));
              const mapsUrl = delivery.latitude && delivery.longitude
                ? `https://www.google.com/maps/search/?api=1&query=${delivery.latitude},${delivery.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.customer_address)}`;

              return (
                <Card key={delivery.id} className="border border-brand-500/30 bg-brand-500/5 hover:shadow-md transition-shadow">
                  <Card.Content className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border
                            ${delivery.status === 'Out for Delivery'
                              ? 'bg-purple-500/15 text-purple-600 border-purple-500/20'
                              : 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                            }`}>
                            {delivery.status}
                          </span>
                          <span className="text-[10px] text-dark-400 font-mono">
                            {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-extrabold text-dark-900 dark:text-white text-sm">{delivery.customer_name}</p>
                        <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-brand-500" /> {delivery.customer_phone}
                        </p>
                        <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 text-red-500 shrink-0" /> {delivery.customer_address}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-bold text-brand-600">
                            💳 {delivery.payment_method} — {delivery.payment_status}
                          </span>
                          {km > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              📍 {km} km → +₹{earning}
                            </span>
                          )}
                        </div>
                        {delivery.notes && (
                          <p className="text-[10px] italic text-dark-400 mt-1">📝 {delivery.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-colors"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
                          onClick={() => handleComplete(delivery)}
                          disabled={completing === delivery.id}
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        >
                          {completing === delivery.id ? 'Completing...' : 'Mark Delivered'}
                        </Button>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              );
            })
          )
        ) : (
          /* Completed Today */
          completedToday.length === 0 ? (
            <div className="py-16 text-center text-sm text-dark-400">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">No deliveries completed today yet.</p>
            </div>
          ) : (
            completedToday.map(delivery => {
              const km = getRawKm(delivery.latitude, delivery.longitude);
              const earning = parseFloat((km * ratePerKm).toFixed(2));

              return (
                <Card key={delivery.id} className="border border-emerald-500/20 bg-emerald-500/5 opacity-90">
                  <Card.Content className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="font-extrabold text-dark-900 dark:text-white text-sm">{delivery.customer_name}</p>
                        </div>
                        <p className="text-xs text-dark-500 truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {delivery.customer_address}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-emerald-600 text-sm">+₹{earning}</p>
                        <p className="text-[10px] text-dark-400 font-mono">{km} km</p>
                        <p className="text-[10px] text-dark-400">{delivery.payment_method} · {delivery.payment_status}</p>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

export default EmployeeDeliveries;

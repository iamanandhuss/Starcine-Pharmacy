import React, { useEffect, useState } from 'react';
import {
  IndianRupee, RefreshCw, Plus, Award, Truck
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../services/supabase';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

interface DailySalesRecord {
  date: string;
  counter_sales: number;
  delivery_sales: number;
  other_sales: number;
  total_sales: number;
}

export const StoreSales: React.FC = () => {
  const { selectedStoreId } = useStore();

  const [salesRecords, setSalesRecords] = useState<DailySalesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form Inputs
  const [counterSales, setCounterSales] = useState('');
  const [deliverySales, setDeliverySales] = useState('');
  const [otherSales, setOtherSales] = useState('');

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
      const { data, error } = await supabase
        .from('sales_registers')
        .select('*')
        .eq('branch_id', selectedStoreId)
        .order('sales_date', { ascending: true });

      if (error) throw error;

      const records = (data || []).map((r: any) => ({
        date: r.sales_date,
        counter_sales: Number(r.counter_sales) || 0,
        delivery_sales: Number(r.delivery_sales) || 0,
        other_sales: Number(r.other_sales) || 0,
        total_sales: (Number(r.counter_sales) || 0) + (Number(r.delivery_sales) || 0) + (Number(r.other_sales) || 0),
      }));

      setSalesRecords(records);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStoreId]);

  const handleRecordSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;

    const c = Number(counterSales) || 0;
    const d = Number(deliverySales) || 0;
    const o = Number(otherSales) || 0;
    const total = c + d + o;

    if (total <= 0) {
      showToast('Sales values must be greater than zero', 'error');
      return;
    }

    try {
      const payload = {
        branch_id: selectedStoreId,
        sales_date: today,
        counter_sales: c,
        delivery_sales: d,
        other_sales: o
      };

      const { error } = await supabase
        .from('sales_registers')
        .upsert(payload, { onConflict: 'sales_date,branch_id' });

      if (error) throw error;

      showToast(`Recorded sales for ${today}: ₹${total.toLocaleString()}`);
      setIsRecordModalOpen(false);
      setCounterSales('');
      setDeliverySales('');
      setOtherSales('');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Aggregated totals
  const totalCounter = salesRecords.reduce((acc, r) => acc + r.counter_sales, 0);
  const totalDelivery = salesRecords.reduce((acc, r) => acc + r.delivery_sales, 0);
  const totalOther = salesRecords.reduce((acc, r) => acc + r.other_sales, 0);
  const totalRevenue = totalCounter + totalDelivery + totalOther;

  const weeklyTarget = 35000;
  const achievementPercent = Math.min(100, Math.round((totalRevenue / weeklyTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">💰 Sales Register</h1>
          <p className="text-xs text-dark-500">Record daily counter sales, delivery invoice revenue, and audit targets</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRecordModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Record Sales
          </Button>
          <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />} />
        </div>
      </div>

      {/* Target Meter strip */}
      <Card className="relative overflow-hidden">
        <Card.Content className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-dark-400">Weekly Target Tracker</h4>
            <h2 className="text-2xl font-black text-dark-900 dark:text-white">
              ${totalRevenue.toLocaleString()} / <span className="text-dark-400 font-bold">${weeklyTarget.toLocaleString()}</span>
            </h2>
            <p className="text-xs text-dark-500">Store has achieved {achievementPercent}% of weekly sales targets</p>
          </div>
          
          <div className="w-full md:w-80 space-y-1.5 shrink-0">
            <div className="flex justify-between text-xs font-mono font-bold text-dark-500">
              <span>Progress</span>
              <span>{achievementPercent}%</span>
            </div>
            <div className="w-full h-3 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${achievementPercent}%` }} />
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Stats Breakdown cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Counter POS Sales</p>
              <h3 className="text-lg font-black mt-1 text-dark-800 dark:text-dark-200">₹{totalCounter.toLocaleString()}</h3>
            </div>
            <span className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <IndianRupee className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Delivery Sales</p>
              <h3 className="text-lg font-black mt-1 text-dark-800 dark:text-dark-200">₹{totalDelivery.toLocaleString()}</h3>
            </div>
            <span className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Truck className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dark-400 uppercase">Other Revenue</p>
              <h3 className="text-lg font-black mt-1 text-dark-800 dark:text-dark-200">₹{totalOther.toLocaleString()}</h3>
            </div>
            <span className="p-2 bg-green-500/10 text-green-600 rounded-lg">
              <Award className="h-4 w-4" />
            </span>
          </Card.Content>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400">Loading sales records...</div>
      ) : (
        <>
          {/* Target Meter strip */}
          <Card className="relative overflow-hidden">
            <Card.Content className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-dark-400">Weekly Target Tracker</h4>
                <h2 className="text-2xl font-black text-dark-900 dark:text-white">
                  ₹{totalRevenue.toLocaleString()} / <span className="text-dark-400 font-bold">₹{weeklyTarget.toLocaleString()}</span>
                </h2>
                <p className="text-xs text-dark-500">Store has achieved {achievementPercent}% of weekly sales targets</p>
              </div>
              
              <div className="w-full md:w-80 space-y-1.5 shrink-0">
                <div className="flex justify-between text-xs font-mono font-bold text-dark-500">
                  <span>Progress</span>
                  <span>{achievementPercent}%</span>
                </div>
                <div className="h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.min(achievementPercent, 100)}%` }} />
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Charts & Table */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Visual chart */}
            <Card className="lg:col-span-2">
              <Card.Header>
                <Card.Title className="text-xs">Weekly Revenue Distribution</Card.Title>
              </Card.Header>
              <Card.Content className="h-72 p-4">
                {salesRecords.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-dark-400">No records found</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesRecords} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="counter_sales" name="Counter" fill="#3B82F6" stackId="a" />
                      <Bar dataKey="delivery_sales" name="Delivery" fill="#10B981" stackId="a" />
                      <Bar dataKey="other_sales" name="Other" fill="#F59E0B" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card.Content>
            </Card>

            {/* List side */}
            <Card className="lg:col-span-1 flex flex-col">
              <Card.Header>
                <Card.Title className="text-xs">Audit Registry</Card.Title>
                <Card.Description>Daily sales logs</Card.Description>
              </Card.Header>
              <Card.Content className="flex-1 overflow-y-auto max-h-[280px]">
                {salesRecords.length === 0 ? (
                  <div className="text-center py-12 text-xs text-dark-400">No logs for this week.</div>
                ) : (
                  <div className="divide-y divide-dark-100 dark:divide-dark-800">
                    {[...salesRecords].reverse().map(rec => (
                      <div key={rec.date} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-dark-800 dark:text-dark-200">{rec.date}</p>
                          <div className="flex gap-2 text-[9px] text-dark-400 font-mono mt-0.5">
                            <span>Ctr: ₹{rec.counter_sales}</span>
                            <span>Del: ₹{rec.delivery_sales}</span>
                          </div>
                        </div>
                        <span className="font-black text-brand-600 dark:text-brand-400">₹{rec.total_sales.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </>
      )}

      {/* Create Sales Modal */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="💰 Record Daily Sales Register">
        <form onSubmit={handleRecordSalesSubmit} className="space-y-4">
          <Input label="Counter sales register (₹)" type="number" placeholder="e.g. 3500" value={counterSales} onChange={e => setCounterSales(e.target.value)} required />
          <Input label="Delivery sales register (₹)" type="number" placeholder="e.g. 1500" value={deliverySales} onChange={e => setDeliverySales(e.target.value)} />
          <Input label="Other sales register (₹)" type="number" placeholder="e.g. 300" value={otherSales} onChange={e => setOtherSales(e.target.value)} />
          
          <div className="flex justify-end gap-2 pt-2 border-t border-dark-100 dark:border-dark-800">
            <Button variant="ghost" onClick={() => setIsRecordModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Daily Sales</Button>
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

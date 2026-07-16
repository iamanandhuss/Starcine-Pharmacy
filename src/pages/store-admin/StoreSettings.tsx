import React, { useEffect, useState } from 'react';
import {
  Settings, Save
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../services/supabase';
import { useStore } from '../../context/StoreContext';
import { Toast } from '../../components/ui/Toast';
import { useTranslation } from '../../context/LanguageContext';

export const StoreSettings: React.FC = () => {
  const { selectedStoreId } = useStore();
  const { language, setLanguage } = useTranslation();

  const [loading, setLoading] = useState(true);

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const fetchStoreData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', selectedStoreId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStoreName(data.name || '');
        setStoreAddress(data.address || '');
        setStorePhone(data.phone || '');
        setStoreEmail(data.email || '');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [selectedStoreId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;

    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: storeName,
          address: storeAddress,
          phone: storePhone,
          email: storeEmail
        })
        .eq('id', selectedStoreId);

      if (error) throw error;
      showToast('Store settings saved successfully');
      fetchStoreData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">⚙️ Store Settings</h1>
          <p className="text-xs text-dark-500">Configure address info, phone numbers, customer emails, operational hours, and holiday schedules</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-dark-400 font-bold">Loading store settings...</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Side: General Profile Form */}
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Store Profile Information</Card.Title>
            </Card.Header>
            <Card.Content className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Branch Store Name"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Customer Support Phone"
                    value={storePhone}
                    onChange={e => setStorePhone(e.target.value)}
                  />
                  <Input
                    label="Contact Email Address"
                    type="email"
                    value={storeEmail}
                    onChange={e => setStoreEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Physical Street Address</label>
                  <textarea
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-dark-200 focus:outline-none focus:border-brand-500 bg-white dark:bg-dark-900 dark:border-dark-800"
                    rows={3}
                    placeholder="123 Health Ave..."
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-dark-100 dark:border-dark-800">
                  <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* Right Side: Working Hours & Holidays */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Business Hours */}
            <Card>
              <Card.Header>
                <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Operational Hours</Card.Title>
              </Card.Header>
              <Card.Content className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Opening Time"
                    type="time"
                    value={openTime}
                    onChange={e => setOpenTime(e.target.value)}
                  />
                  <Input
                    label="Closing Time"
                    type="time"
                    value={closeTime}
                    onChange={e => setCloseTime(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-dark-400 leading-normal italic">Changes will apply to attendance grace limits checks during staff punch actions.</p>
              </Card.Content>
            </Card>

            {/* Compliance Holidays */}
            <Card>
              <Card.Header>
                <Card.Title className="text-xs uppercase font-extrabold tracking-wider">Upcoming Store Holidays</Card.Title>
              </Card.Header>
              <Card.Content className="p-0">
                <div className="divide-y divide-dark-100 dark:divide-dark-800">
                  {[
                    { name: 'Labor Day Operations', date: 'Sept 07, 2026' },
                    { name: 'Thanksgiving Closed Day', date: 'Nov 26, 2026' }
                  ].map(h => (
                    <div key={h.name} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-dark-800 dark:text-dark-200">{h.name}</p>
                        <span className="text-[9px] text-dark-400 font-mono">{h.date}</span>
                      </div>
                      <span className="text-[10px] font-bold text-brand-600 bg-brand-500/10 px-1.5 py-0.5 rounded">Scanned</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            {/* Language Preferences */}
            <Card>
              <Card.Header>
                <Card.Title className="text-xs uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                  🌐 Language Preferences / ഭാഷാ ക്രമീകരണങ്ങൾ
                </Card.Title>
              </Card.Header>
              <Card.Content className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Select Language / ഭാഷ തിരഞ്ഞെടുക്കുക</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="ml">🇮🇳 മലയാളം (Malayalam)</option>
                  </select>
                </div>
              </Card.Content>
            </Card>

          </div>

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
export { Settings };

import React, { useState } from 'react';
import { Save, Image as ImageIcon, Sliders, BellRing, ShieldAlert } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { useTranslation } from '../../context/LanguageContext';

export const Settings: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  const [companyName, setCompanyName] = useState('PharmacyOps Corporation');
  const [currency, setCurrency] = useState('INR (₹)');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  
  // Notification switches
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [telegramAlerts, setTelegramAlerts] = useState(true);

  // Security
  const [requireMfa, setRequireMfa] = useState(false);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleSave = () => {
    showToast('Platform settings saved globally!');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-dark-900 dark:text-white">⚙️ System & Platform Settings</h1>
          <p className="text-xs text-dark-500">Adjust white-label corporate branding, configure alert APIs, and adjust security defaults</p>
        </div>
        <Button
          onClick={handleSave}
          leftIcon={<Save className="h-4 w-4" />}
          className="shadow-sm"
        >
          Save Configuration
        </Button>
      </div>

      {/* Grid: Settings tabs/cards */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Company Profile Settings */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-1 text-xs">
              <Sliders className="h-4 w-4 text-brand-500" />
              Corporate Identity & Profile
            </Card.Title>
            <Card.Description>Manage tenant settings and localization configs</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <Input
              label="Company Name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. PharmacyOps Corp"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Default Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="INR (₹)">INR (₹)</option>
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="GBP (£)">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Time Zone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 text-dark-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="UTC (Coordinated)">UTC (Coordinated)</option>
                  <option value="Europe/London (BST)">Europe/London (BST)</option>
                </select>
              </div>
            </div>

            {/* Logo placeholder */}
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1.5">Branding Logo</label>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-dark-100 dark:bg-dark-800 rounded-lg flex items-center justify-center text-dark-400">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <Button size="sm" variant="outline" onClick={() => alert('Launching File Uploader stub...')}>
                  Upload New Logo
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Messaging & Security Config */}
        <Card className="space-y-6">
          
          {/* Notifications config */}
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-dark-800 dark:text-dark-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-100 dark:border-dark-800 pb-2 mb-2">
              <BellRing className="h-4 w-4 text-brand-500" />
              API Alerts & Broadcasts
            </h3>
            
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-dark-700 dark:text-dark-300">Broadcast Email Alerts</p>
                <p className="text-[10px] text-dark-400">Send email updates on major shift changes</p>
              </div>
              <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-dark-700 dark:text-dark-300">SMS Reminders (Twilio)</p>
                <p className="text-[10px] text-dark-400">Send text reminders for daily grooming schedules</p>
              </div>
              <input type="checkbox" checked={smsAlerts} onChange={e => setSmsAlerts(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-dark-700 dark:text-dark-300">Telegram Bot Notifications</p>
                <p className="text-[10px] text-dark-400">Expose support tickets and escalation queues to Telegram channel</p>
              </div>
              <input type="checkbox" checked={telegramAlerts} onChange={e => setTelegramAlerts(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            </div>
          </div>

          {/* Security details */}
          <div className="p-4 bg-dark-50/50 dark:bg-dark-950/50 rounded-b-xl border-t border-dark-100 dark:border-dark-800 space-y-4">
            <h3 className="text-xs font-bold text-dark-800 dark:text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Platform Security Claims
            </h3>

            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-dark-700 dark:text-dark-300">Require Multi-Factor (MFA)</p>
                <p className="text-[10px] text-dark-400">Force all Store Admins to authenticate using TOTP codes</p>
              </div>
              <input type="checkbox" checked={requireMfa} onChange={e => setRequireMfa(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            </div>
          </div>

        </Card>

        {/* Language Preferences */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-1.5 text-xs">
              🌐 Language Preferences / ഭാഷാ ക്രമീകരണങ്ങൾ
            </Card.Title>
            <Card.Description>Select your preferred interface language</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase mb-1">Interface Language / ഇന്റർഫേസ് ഭാഷ</label>
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

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

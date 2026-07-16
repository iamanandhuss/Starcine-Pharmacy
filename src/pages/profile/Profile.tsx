import React, { useState } from 'react';
import { User, ShieldAlert, KeyRound, Mail, Calendar, Store, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { RoleNameBadge } from '../../components/ui/RoleBadge';
import { useTranslation } from '../../context/LanguageContext';

export const Profile: React.FC = () => {
  const { user, profile } = useAuth();
  const { language, setLanguage } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMsg(null);

    if (!newPassword || !confirmPassword) {
      setToastMsg({ text: 'Please fill in both fields.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToastMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setToastMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setToastMsg({ text: error.message, type: 'error' });
      } else {
        setToastMsg({ text: 'Password updated successfully!', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setToastMsg({ text: err?.message || 'An error occurred.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <Toast
          type={toastMsg.type}
          message={toastMsg.text}
          onClose={() => setToastMsg(null)}
          className="mb-4"
        />
      )}

      <div className="flex items-center gap-3">
        <div className="bg-brand-600 p-2.5 rounded-xl text-white">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-dark-900 dark:text-white">Profile Settings</h2>
          <p className="text-xs text-dark-500 dark:text-dark-400">
            Manage your account security and view your session details
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="md:col-span-1 space-y-6">
          <Card>
          <Card.Header>
            <Card.Title>Account Details</Card.Title>
            <Card.Description>Your current login session credentials</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
              <Mail className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-dark-400 leading-tight">Email Address</p>
                <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-brand-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-dark-400 leading-tight">Assigned Role</p>
                <div className="mt-1">
                  <RoleNameBadge roleName={profile?.role_name || 'Staff'} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
              <Store className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-dark-400 leading-tight">Store Assignment</p>
                <p className="font-semibold text-dark-800 dark:text-dark-200 truncate">
                  {profile?.store_name || 'Global (Super Admin)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
              <Calendar className="h-4 w-4 text-brand-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-dark-400 leading-tight">Joined PharmacyOps</p>
                <p className="font-semibold text-dark-800 dark:text-dark-200">{memberSince}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-850 rounded-lg">
              <KeyRound className="h-4 w-4 text-brand-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-dark-400 leading-tight">Provider</p>
                <p className="font-semibold text-dark-800 dark:text-dark-200 capitalize">
                  {user?.app_metadata?.provider || 'Email / JWT'}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Language Preferences */}
        <Card>
          <Card.Header>
            <Card.Title className="text-xs font-black uppercase text-dark-450 flex items-center gap-1.5">
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

      {/* Change password */}
      <Card className="md:col-span-2">
          <Card.Header>
            <Card.Title>Security & Password</Card.Title>
            <Card.Description>Update your password to keep your account safe</Card.Description>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<KeyRound className="h-4 w-4" />}
                disabled={loading}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<KeyRound className="h-4 w-4" />}
                disabled={loading}
                required
              />

              <div className="pt-2 flex justify-start">
                <Button
                  type="submit"
                  isLoading={loading}
                  leftIcon={<ShieldAlert className="h-4 w-4" />}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

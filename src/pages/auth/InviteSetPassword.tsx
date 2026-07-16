import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';

export const InviteSetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Supabase sends the user to this page with a session automatically
  // established from the invite token in the URL hash. We just need to
  // set the new password.
  useEffect(() => {
    // Verify session is present (from invite link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setErrorMsg('Invalid or expired invitation link. Please request a new invitation from your administrator.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!password || !confirmPassword) {
      setErrorMsg('Please fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.user) {
        setSuccess(true);
        // Determine redirect based on role
        const { data: dbUser } = await supabase
          .from('users')
          .select('*, roles(name)')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        const roleName: string = dbUser?.roles?.name || '';
        setTimeout(() => {
          if (roleName === 'Super Admin') navigate('/super-admin/dashboard');
          else if (roleName === 'Store Admin') navigate('/store/dashboard');
          else navigate('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <Card.Header>
        <Card.Title className="text-2xl font-bold tracking-tight">
          {success ? 'Account Activated!' : 'Set Your Password'}
        </Card.Title>
        <Card.Description>
          {success
            ? 'Your password has been set. Redirecting to your dashboard...'
            : "You've been invited to PharmacyOps. Create a secure password to activate your account."}
        </Card.Description>
      </Card.Header>

      <Card.Content>
        {success ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm text-dark-500 dark:text-dark-400 text-center">
              Welcome to PharmacyOps! Your account is ready.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 8 characters"
              leftIcon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={loading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Activate Account
            </Button>
          </form>
        )}
      </Card.Content>
    </Card>
  );
};

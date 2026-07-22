import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';

// Login Validation Schema
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        const msg = error.message?.trim();
        const status = (error as any).status;

        if (msg && msg.includes('Email not confirmed')) {
          setErrorMsg(
            'Please confirm your email before logging in. Check your inbox for the verification or invitation link.'
          );
        } else if (status === 500 || !msg || msg === '{}') {
          // 500 errors typically mean the account was created via direct DB insert
          // and is missing the auth.identities record required by Supabase Auth.
          setErrorMsg(
            'This account cannot be signed in at this time. It may need to be re-provisioned by an administrator. Please contact your admin.'
          );
        } else {
          setErrorMsg(msg);
        }
        return;
      }

      if (!data.user) {
        setErrorMsg('Login failed. Please try again.');
        return;
      }

      // Check if user is active/approved
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('is_active, approval_status')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (dbError) {
        console.warn('Error checking user approval status:', dbError.message);
      } else if (dbUser) {
        if (!dbUser.is_active) {
          setErrorMsg('Your account has been deactivated. Please contact your administrator.');
          await supabase.auth.signOut();
          return;
        }
        if (dbUser.approval_status === 'pending') {
          setErrorMsg('Your account is pending approval by a Super Admin. Please try again later.');
          await supabase.auth.signOut();
          return;
        }
        if (dbUser.approval_status === 'rejected') {
          setErrorMsg('Your account request has been rejected. Please contact support.');
          await supabase.auth.signOut();
          return;
        }
      }

      setSuccessMsg('Welcome back! Redirecting...');

      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
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
          PharmacyOps Portal
        </Card.Title>
        <Card.Description>
          Sign in with your credentials to access your store dashboard
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
          {successMsg && <Toast type="success" message={successMsg} />}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@pharmacyops.com"
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={loading}
            error={errors.email?.message}
            {...register('email')}
            required
          />

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold tracking-wide uppercase text-dark-500 dark:text-dark-400">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                Forgot?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              disabled={loading}
              error={errors.password?.message}
              {...register('password')}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={loading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign In
          </Button>
        </form>
      </Card.Content>

      <Card.Footer className="justify-center text-xs">
        <p className="text-dark-500 dark:text-dark-400 text-center">
          Don't have access?{' '}
          <span className="font-semibold text-dark-700 dark:text-dark-300">
            Contact your administrator to receive an invitation.
          </span>
        </p>
      </Card.Footer>
    </Card>
  );
};

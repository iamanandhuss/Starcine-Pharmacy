import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';

// Reset Password Validation Schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if we have an active session or a recovery token session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg('No active recovery session found. Please request a new password reset link.');
      }
    };
    checkSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Your password has been successfully updated! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
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
          Update Password
        </Card.Title>
        <Card.Description>
          Enter your new password below to update your account access
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
          {successMsg && <Toast type="success" message={successMsg} />}

          <Input
            label="New Password"
            type="password"
            placeholder="Min. 6 characters"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={loading}
            error={errors.password?.message}
            {...register('password')}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={loading}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            required
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={loading}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Update Password
          </Button>
        </form>
      </Card.Content>

      <Card.Footer className="justify-center text-xs">
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
        >
          Cancel and return to login
        </Link>
      </Card.Footer>
    </Card>
  );
};

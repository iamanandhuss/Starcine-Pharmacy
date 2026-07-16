import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';

// ForgotPassword Schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Direct user back to the /reset-password route when clicking the email recovery link
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Reset link sent! Please check your email inbox.');
        reset();
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
          Reset password
        </Card.Title>
        <Card.Description>
          We'll send you an email with instructions to recover your pharmacy account access
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMsg && <Toast type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
          {successMsg && <Toast type="success" message={successMsg} />}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={loading}
            error={errors.email?.message}
            {...register('email')}
            required
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={loading}
            rightIcon={<KeyRound className="h-4 w-4" />}
          >
            Send Reset Link
          </Button>
        </form>
      </Card.Content>

      <Card.Footer className="justify-center text-xs">
        <Link
          to="/login"
          className="flex items-center gap-1.5 font-semibold text-dark-600 hover:text-dark-900 dark:text-dark-400 dark:hover:text-dark-250"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </Card.Footer>
    </Card>
  );
};

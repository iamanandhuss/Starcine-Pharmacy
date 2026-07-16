import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';

// Registration Validation Schema
const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    isAdmin: z.boolean(), // checkbox to test admin role redirections
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      isAdmin: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Set user role inside user_metadata to let Supabase Auth store it
      const roleSelected = values.isAdmin ? 'admin' : 'user';

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            role: roleSelected,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        if (data.session) {
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => {
            if (roleSelected === 'admin') {
              navigate('/admin/dashboard');
            } else {
              navigate('/dashboard');
            }
          }, 1500);
        } else {
          setSuccessMsg(
            'Registration successful! Please check your email inbox to verify your account.'
          );
        }
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
          Create Pharmacy Account
        </Card.Title>
        <Card.Description>
          Register a new pharmacy staff member with assigned system roles
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

          <Input
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={loading}
            error={errors.password?.message}
            {...register('password')}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={loading}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            required
          />

          {/* Admin Role Test Checkbox */}
          <div className="flex items-center gap-2 py-1">
            <input
              id="isAdmin"
              type="checkbox"
              className="h-4.5 w-4.5 rounded border-dark-300 dark:border-dark-700 text-brand-600 focus:ring-brand-500"
              {...register('isAdmin')}
            />
            <label
              htmlFor="isAdmin"
              className="text-xs font-semibold text-dark-600 dark:text-dark-400 cursor-pointer"
            >
              Sign up as Administrator (for testing redirects)
            </label>
          </div>

          <Button
            type="submit"
            className="w-full mt-1"
            isLoading={loading}
            rightIcon={<UserPlus className="h-4 w-4" />}
          >
            Create Account
          </Button>
        </form>
      </Card.Content>

      <Card.Footer className="justify-center text-xs">
        <span className="text-dark-500 dark:text-dark-400">Already have an account?</span>
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
        >
          Sign In
        </Link>
      </Card.Footer>
    </Card>
  );
};

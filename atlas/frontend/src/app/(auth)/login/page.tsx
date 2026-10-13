'use client';

import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useLogin } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? undefined;
  const sessionExpired = searchParams.get('sessionExpired') === '1';

  const login = useLogin(next);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values);
  };

  const isLockedOrSuspended = isAxiosError(login.error) && login.error.response?.status === 403;
  const errorMessage = isAxiosError(login.error)
    ? ((login.error.response?.data as { message?: string } | undefined)?.message ?? 'Invalid email or password.')
    : login.error
      ? 'Something went wrong. Please try again.'
      : null;

  return (
    <div className="animate-fade-up rounded-[var(--radius)] border border-border bg-card p-8 shadow-card-hover">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
          <span className="text-lg font-bold text-white">A</span>
        </div>
        <h1 className="text-lg font-bold text-foreground">Sign in to ATLAS</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back — enter your credentials to continue.</p>
      </div>

      {sessionExpired && !errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius)] border border-warning/20 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your session expired. Please sign in again.</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {isLockedOrSuspended ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            placeholder="you@company.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            icon={<Lock className="h-4 w-4" />}
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have a workspace yet?{' '}
        <Link href={ROUTES.REGISTER} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

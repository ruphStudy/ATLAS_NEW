'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, Lock, User, Building2, Loader2, AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useRegister } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^a-zA-Z0-9]/, 'Include a special character'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (values: RegisterFormValues) => {
    registerUser.mutate(values);
  };

  const errorMessage = isAxiosError(registerUser.error)
    ? ((registerUser.error.response?.data as { message?: string } | undefined)?.message ?? 'Could not create your account.')
    : registerUser.error
      ? 'Something went wrong. Please try again.'
      : null;

  return (
    <div className="animate-fade-up rounded-[var(--radius)] border border-border bg-card p-8 shadow-card-hover">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
          <span className="text-lg font-bold text-white">A</span>
        </div>
        <h1 className="text-lg font-bold text-foreground">Create your ATLAS workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set up your account and workspace in one step.</p>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" required>
              First name
            </Label>
            <Input id="firstName" icon={<User className="h-4 w-4" />} placeholder="Jane" aria-invalid={!!errors.firstName} {...register('firstName')} />
            {errors.firstName && <p className="text-xs text-danger">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" required>
              Last name
            </Label>
            <Input id="lastName" placeholder="Doe" aria-invalid={!!errors.lastName} {...register('lastName')} />
            {errors.lastName && <p className="text-xs text-danger">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input id="email" type="email" autoComplete="email" icon={<Mail className="h-4 w-4" />} placeholder="you@company.com" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workspaceName" required>
            Workspace name
          </Label>
          <Input id="workspaceName" icon={<Building2 className="h-4 w-4" />} placeholder="Acme Corp" aria-invalid={!!errors.workspaceName} {...register('workspaceName')} />
          {errors.workspaceName && <p className="text-xs text-danger">{errors.workspaceName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>
            Password
          </Label>
          <Input id="password" type="password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} placeholder="••••••••••••" aria-invalid={!!errors.password} {...register('password')} />
          {errors.password ? (
            <p className="text-xs text-danger">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">At least 12 characters, with upper/lowercase, a number and a symbol.</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={registerUser.isPending}>
          {registerUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create workspace
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

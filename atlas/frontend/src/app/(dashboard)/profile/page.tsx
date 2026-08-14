'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, useUpdateUser, useUser } from '@/hooks';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().or(z.literal('')),
  avatarUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required'),
  locale: z.string().min(1, 'Locale is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const currentUser = useCurrentUser();
  const { data: user, isLoading } = useUser(currentUser?.id);
  const updateUser = useUpdateUser(currentUser?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? '',
        avatarUrl: user.avatarUrl ?? '',
        timezone: user.timezone,
        locale: user.locale,
      });
    }
  }, [user, reset]);

  const onSubmit = (values: ProfileFormValues) => {
    updateUser.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
      avatarUrl: values.avatarUrl || undefined,
      timezone: values.timezone,
      locale: values.locale,
    });
  };

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';

  return (
    <div>
      <PageHeader title="My profile" description="Manage your personal account details." />

      {isLoading || !user ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-16 w-16">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />}
                  <AvatarFallback className="text-base">{initials}</AvatarFallback>
                </Avatar>
                <CardTitle className="mt-3">
                  {user.firstName} {user.lastName}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {user.role.toLowerCase()}
                  </Badge>
                  <Badge variant={user.status === 'ACTIVE' ? 'success' : 'secondary'} className="capitalize">
                    {user.status.toLowerCase().replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Email {user.emailVerified ? 'verified' : 'not verified'}</p>
              {user.lastLoginAt && <p>Last login {new Date(user.lastLoginAt).toLocaleString()}</p>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Account details</CardTitle>
              <CardDescription>Update your name, contact info and locale preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
                    <Input id="firstName" {...register('firstName')} aria-invalid={!!errors.firstName} />
                  </FormField>
                  <FormField label="Last name" htmlFor="lastName" required error={errors.lastName?.message}>
                    <Input id="lastName" {...register('lastName')} aria-invalid={!!errors.lastName} />
                  </FormField>
                </div>

                <FormField label="Email" htmlFor="email" hint="Contact an administrator to change your email.">
                  <Input id="email" value={user.email} disabled />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
                    <Input id="phone" placeholder="+14155552671" {...register('phone')} aria-invalid={!!errors.phone} />
                  </FormField>
                  <FormField label="Avatar URL" htmlFor="avatarUrl" error={errors.avatarUrl?.message}>
                    <Input id="avatarUrl" placeholder="https://…" {...register('avatarUrl')} aria-invalid={!!errors.avatarUrl} />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Timezone" htmlFor="timezone" required error={errors.timezone?.message}>
                    <Input id="timezone" placeholder="America/New_York" {...register('timezone')} aria-invalid={!!errors.timezone} />
                  </FormField>
                  <FormField label="Locale" htmlFor="locale" required error={errors.locale?.message}>
                    <Input id="locale" placeholder="en-US" {...register('locale')} aria-invalid={!!errors.locale} />
                  </FormField>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={!isDirty || updateUser.isPending}>
                    {updateUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

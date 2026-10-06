'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { queryClient } from '@lib/api/query-client';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmDialogHost } from '@/components/ui/confirm-dialog';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
        <ConfirmDialogHost />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

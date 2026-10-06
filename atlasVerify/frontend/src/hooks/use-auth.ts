import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as authService from '@/services/auth.service';
import { useAuthStore, useWorkspaceStore } from '@/stores';
import { ROUTES } from '@/constants';
import type { LoginRequest, RegisterRequest } from '@/types';

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useIsAuthenticated() {
  return useAuthStore((s) => s.isAuthenticated);
}

/** Preserves deep links: pass the `?next=` path captured by `middleware.ts` so a post-login redirect lands back where the user was headed. */
export function useLogin(redirectTo?: string) {
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (data) => {
      setSession(data);
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : ROUTES.DASHBOARD);
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterRequest) => authService.register(payload),
    onSuccess: (data) => {
      setSession(data);
      router.push(ROUTES.DASHBOARD);
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const resetWorkspace = useWorkspaceStore((s) => s.reset);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearSession();
      resetWorkspace();
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as accountsService from '@/services/marketplace-accounts.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateMarketplaceAccountPayload, MarketplaceAccountFilterParams, UpdateMarketplaceAccountPayload } from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceAccounts(params: MarketplaceAccountFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS, workspaceId, params],
    queryFn: () => accountsService.listMarketplaceAccounts(params),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useMarketplaceAccount(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS, workspaceId, id],
    queryFn: () => accountsService.getMarketplaceAccountById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useMarketplaceAccountHistory(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS, workspaceId, id, 'history'],
    queryFn: () => accountsService.getMarketplaceAccountHistory(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCreateMarketplaceAccount() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateMarketplaceAccountPayload) => accountsService.createMarketplaceAccount(workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success('Marketplace account connected');
    },
    onError: () => toast.error('Could not connect account', 'Please check the form and try again.'),
  });
}

export function useUpdateMarketplaceAccount(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateMarketplaceAccountPayload) => accountsService.updateMarketplaceAccount(id, workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success('Account updated');
    },
    onError: () => toast.error('Could not update account', 'Please try again.'),
  });
}

function useAccountAction(id: string, action: (id: string, workspaceId: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, workspaceId as string, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableMarketplaceAccount(id: string) {
  return useAccountAction(id, accountsService.enableMarketplaceAccount, 'Account enabled');
}

export function useDisableMarketplaceAccount(id: string) {
  return useAccountAction(id, accountsService.disableMarketplaceAccount, 'Account disabled');
}

export function useArchiveMarketplaceAccount(id: string) {
  return useAccountAction(id, accountsService.archiveMarketplaceAccount, 'Account archived');
}

export function useRestoreMarketplaceAccount(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => accountsService.restoreMarketplaceAccount(id, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success('Account restored');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeleteMarketplaceAccount() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => accountsService.deleteMarketplaceAccount(id, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success('Account deleted');
    },
    onError: () => toast.error('Could not delete account', 'Please try again.'),
  });
}

export function useTestMarketplaceAccountConnection(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => accountsService.testMarketplaceAccountConnection(id, workspaceId as string),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      if (result.success) toast.success('Connection test passed');
      else toast.error('Connection test failed', result.errorMessage ?? undefined);
    },
    onError: () => toast.error('Could not test connection', 'Please try again.'),
  });
}

export function useSetDefaultMarketplaceAccount(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => accountsService.setDefaultMarketplaceAccount(id, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success('Set as default account');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSetMarketplaceAccountPriority(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (priority: number) => accountsService.setMarketplaceAccountPriority(id, workspaceId as string, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_ACCOUNTS] });
      toast.success('Priority updated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

/**
 * Starts the Amazon Connect OAuth flow and redirects the browser to
 * Amazon's consent screen. Pass `accountId` to reconnect an existing
 * (EXPIRED/INVALID) Amazon account rather than creating a new one.
 */
export function useConnectAmazon() {
  const toast = useToast();
  return useMutation({
    mutationFn: (params: { country: string; accountId?: string }) => accountsService.startAmazonAuthorization(params),
    onSuccess: (result) => {
      // Remember this tab's signed state so the Login URI step (if Amazon routes
      // through it) can keep the chosen country/accountId. Not a secret: the
      // backend re-verifies it against the session before using it.
      try {
        const state = new URL(result.authorizationUrl).searchParams.get('state');
        if (state) sessionStorage.setItem(AMAZON_PENDING_STATE_KEY, state);
      } catch {
        // Storage unavailable — the Login URI page falls back to asking for the country.
      }
      window.location.href = result.authorizationUrl;
    },
    onError: () => toast.error('Could not start Amazon authorization', 'Please try again.'),
  });
}

export const AMAZON_PENDING_STATE_KEY = 'atlas.amazonOAuth.pendingState';

/** Amazon Login URI step: asks the backend for the URL back to Amazon, then navigates there. */
export function useContinueAmazonLoginUri() {
  return useMutation({
    mutationFn: accountsService.continueAmazonLoginUri,
    onSuccess: (result) => {
      try {
        sessionStorage.removeItem(AMAZON_PENDING_STATE_KEY);
      } catch {
        // ignore
      }
      window.location.href = result.redirectUrl;
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as providersService from '@/services/marketplace-providers.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { MarketplaceCapability, SetMarketplaceCredentialsPayload, UpsertMarketplaceProviderConfigPayload } from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceProviders() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS, workspaceId],
    queryFn: () => providersService.listMarketplaceProviders(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketplaceProvider(providerKey: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS, providerKey],
    queryFn: () => providersService.getMarketplaceProvider(providerKey as string),
    enabled: !!providerKey,
  });
}

export function useMarketplaceProviderConfigs(providerKey?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS, workspaceId, 'configs', providerKey],
    queryFn: () => providersService.getMarketplaceProviderConfigs(workspaceId as string, providerKey),
    enabled: !!workspaceId,
  });
}

export function useUpsertMarketplaceProviderConfig() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpsertMarketplaceProviderConfigPayload) => providersService.upsertMarketplaceProviderConfig(workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS] });
      toast.success('Provider configuration saved');
    },
    onError: () => toast.error('Could not save configuration', 'Please try again.'),
  });
}

export function useEnableMarketplaceProvider() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (providerKey: string) => providersService.enableMarketplaceProvider(providerKey, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS] });
      toast.success('Provider enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableMarketplaceProvider() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (providerKey: string) => providersService.disableMarketplaceProvider(providerKey, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS] });
      toast.success('Provider disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSetMarketplaceCredentials() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetMarketplaceCredentialsPayload) => providersService.setMarketplaceCredentials(workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS] });
      toast.success('Credentials saved');
    },
    onError: () => toast.error('Could not save credentials', 'Please check the fields and try again.'),
  });
}

export function useMarketplaceProviderHealth(providerKey?: string, accountId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS, 'health', providerKey, accountId],
    queryFn: () => providersService.getMarketplaceProviderHealth(providerKey, accountId),
    staleTime: 15 * 1000,
  });
}

export function useTestMarketplaceProviderConnection() {
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ providerKey, accountId }: { providerKey: string; accountId: string }) => providersService.testMarketplaceProviderConnection(workspaceId as string, providerKey, accountId),
    onSuccess: () => toast.success('Connection test completed'),
    onError: () => toast.error('Connection test failed', 'Please try again.'),
  });
}

export function useCapableProviders(capability: MarketplaceCapability | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_PROVIDERS, 'capable', capability],
    queryFn: () => providersService.listCapableProviders(capability as MarketplaceCapability),
    enabled: !!capability,
  });
}

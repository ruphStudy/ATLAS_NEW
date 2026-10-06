import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as shippingProviderService from '@/services/shipping-provider.service';
import { useToast } from './use-toast';

const KEY = 'shipping-providers';

export function useShippingProviders() {
  return useQuery({
    queryKey: [KEY, 'list'],
    queryFn: () => shippingProviderService.listShippingProviders(),
    staleTime: 60 * 1000,
  });
}

export function useShippingProvider(providerKey: string | undefined) {
  return useQuery({
    queryKey: [KEY, providerKey],
    queryFn: () => shippingProviderService.getShippingProvider(providerKey as string),
    enabled: !!providerKey,
  });
}

export function useCachedShippingProviderHealth() {
  return useQuery({
    queryKey: [KEY, 'health'],
    queryFn: () => shippingProviderService.getCachedShippingProviderHealth(),
    staleTime: 30 * 1000,
  });
}

export function useCheckAllShippingProviderHealth() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => shippingProviderService.checkAllShippingProviderHealth(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'health'] });
      toast.success('Health check completed');
    },
    onError: () => toast.error('Health check failed', 'Please try again.'),
  });
}

export function useCheckShippingProviderHealth() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (providerKey: string) => shippingProviderService.checkShippingProviderHealth(providerKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'health'] });
      toast.success('Health check completed');
    },
    onError: () => toast.error('Health check failed', 'Please try again.'),
  });
}

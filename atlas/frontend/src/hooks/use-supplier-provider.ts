import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as supplierProviderService from '@/services/supplier-provider.service';
import { useToast } from './use-toast';

const KEY = 'supplier-providers';

export function useSupplierProviders() {
  return useQuery({
    queryKey: [KEY, 'list'],
    queryFn: () => supplierProviderService.listSupplierProviders(),
    staleTime: 60 * 1000,
  });
}

export function useSupplierProvider(providerCode: string | undefined) {
  return useQuery({
    queryKey: [KEY, providerCode],
    queryFn: () => supplierProviderService.getSupplierProvider(providerCode as string),
    enabled: !!providerCode,
  });
}

export function useCachedSupplierProviderHealth() {
  return useQuery({
    queryKey: [KEY, 'health'],
    queryFn: () => supplierProviderService.getCachedSupplierProviderHealth(),
    staleTime: 30 * 1000,
  });
}

export function useCheckAllSupplierProviderHealth() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => supplierProviderService.checkAllSupplierProviderHealth(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'health'] });
      toast.success('Health check completed');
    },
    onError: () => toast.error('Health check failed', 'Please try again.'),
  });
}

export function useCheckSupplierProviderHealth() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (providerCode: string) => supplierProviderService.checkSupplierProviderHealth(providerCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'health'] });
      toast.success('Health check completed');
    },
    onError: () => toast.error('Health check failed', 'Please try again.'),
  });
}

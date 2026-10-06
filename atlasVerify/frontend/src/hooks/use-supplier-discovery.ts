import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as discoveryService from '@/services/supplier-discovery.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateSupplierDiscoverySessionPayload } from '@/types';
import { useToast } from './use-toast';

export function useSupplierDiscoverySessions(params: { page?: number; limit?: number; provider?: string; keyword?: string } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY, 'sessions', params],
    queryFn: () => discoveryService.listSupplierDiscoverySessions(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });
}

export function useSupplierDiscoverySession(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY, 'sessions', id],
    queryFn: () => discoveryService.getSupplierDiscoverySessionById(id as string),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === 'RUNNING' || query.state.data?.status === 'PENDING' ? 3000 : false),
  });
}

export function useSupplierDiscoverySessionResults(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY, 'sessions', id, 'results'],
    queryFn: () => discoveryService.getSupplierDiscoverySessionResults(id as string),
    enabled: !!id,
  });
}

export function useCreateSupplierDiscoverySession() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSupplierDiscoverySessionPayload) => discoveryService.createSupplierDiscoverySession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY] });
      toast.success('Discovery session started');
    },
    onError: () => toast.error('Could not start discovery', 'Please try again.'),
  });
}

export function useCancelSupplierDiscoverySession() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => discoveryService.cancelSupplierDiscoverySession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY] });
      toast.success('Session cancelled');
    },
    onError: () => toast.error('Could not cancel session', 'Please try again.'),
  });
}

export function useSupplierDiscoveryStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY, 'stats'],
    queryFn: discoveryService.getSupplierDiscoveryStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useSupportedSupplierProviders() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_DISCOVERY, 'providers'],
    queryFn: discoveryService.getSupportedSupplierProviders,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

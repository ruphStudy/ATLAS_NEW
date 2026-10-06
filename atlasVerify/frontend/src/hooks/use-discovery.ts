import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as discoveryService from '@/services/discovery.service';
import { useAuthStore } from '@/stores';
import type { CreateDiscoverySessionPayload, PaginationParams } from '@/types';
import { useToast } from './use-toast';

const KEY = 'discovery-sessions';

export function useDiscoverySessions(params: PaginationParams & { status?: string; marketplace?: string } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => discoveryService.listDiscoverySessions(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.items.some((s) => s.status === 'PENDING' || s.status === 'RUNNING');
      return hasActive ? 5000 : false;
    },
  });
}

export function useDiscoverySession(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => discoveryService.getDiscoverySessionById(id as string),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' || query.state.data?.status === 'RUNNING' ? 3000 : false),
  });
}

export function useDiscoverySessionResults(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id, 'results'],
    queryFn: () => discoveryService.getDiscoverySessionResults(id as string),
    enabled: !!id,
  });
}

export function useDiscoveryStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [KEY, 'stats'],
    queryFn: discoveryService.getDiscoveryStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useSupportedDiscoveryMarketplaces() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [KEY, 'marketplaces'],
    queryFn: discoveryService.getSupportedDiscoveryMarketplaces,
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCreateDiscoverySession() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDiscoverySessionPayload) => discoveryService.createDiscoverySession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Discovery session started', "We'll notify you as products are found.");
    },
    onError: () => toast.error('Could not start discovery', 'Please try again.'),
  });
}

export function useCancelDiscoverySession() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => discoveryService.cancelDiscoverySession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Session cancelled');
    },
    onError: () => toast.error('Could not cancel session', 'Please try again.'),
  });
}

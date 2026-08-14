import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as opportunitiesService from '@/services/opportunities.service';
import { useAuthStore } from '@/stores';
import type { CreateOpportunityPayload, OpportunityFilterParams, UpdateOpportunityPayload } from '@/types';
import { useToast } from './use-toast';

const KEY = 'opportunities';

export function useOpportunities(params: OpportunityFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => opportunitiesService.listOpportunities(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => opportunitiesService.getOpportunityById(id as string),
    enabled: !!id,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateOpportunityPayload) => opportunitiesService.createOpportunity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Opportunity created');
    },
    onError: () => toast.error('Could not create opportunity', 'Please try again.'),
  });
}

export function useUpdateOpportunity(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateOpportunityPayload) => opportunitiesService.updateOpportunity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Opportunity updated');
    },
    onError: () => toast.error('Could not update opportunity', 'Please try again.'),
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => opportunitiesService.deleteOpportunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success('Opportunity deleted');
      router.push('/dashboard/opportunities');
    },
    onError: () => toast.error('Could not delete opportunity', 'Please try again.'),
  });
}

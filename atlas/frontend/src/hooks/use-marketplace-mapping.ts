import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as mappingService from '@/services/marketplace-mapping.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateCategoryMappingPayload, MappingFilterParams } from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useCategoryMappings(params: MappingFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_MAPPING, 'category', workspaceId, params],
    queryFn: () => mappingService.listCategoryMappings(workspaceId as string, params),
    enabled: !!workspaceId,
  });
}

export function useAttributeMappings(params: MappingFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.MARKETPLACE_MAPPING, 'attribute', workspaceId, params],
    queryFn: () => mappingService.listAttributeMappings(workspaceId as string, params),
    enabled: !!workspaceId,
  });
}

export function useCreateCategoryMapping() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCategoryMappingPayload) => mappingService.createCategoryMapping(workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MARKETPLACE_MAPPING, 'category'] });
      toast.success('Category mapping created');
    },
    onError: () => toast.error('Could not create mapping', 'Please try again.'),
  });
}

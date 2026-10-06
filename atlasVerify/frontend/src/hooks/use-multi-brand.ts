import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as brandService from '@/services/multi-brand.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type { ChangeBrandOwnershipPayload, CreateMultiBrandPayload, LinkBrandEntityPayload, MultiBrandFilterParams, UpdateMultiBrandPayload } from '@/types';

export function useMultiBrands(params: MultiBrandFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BRANDS, params],
    queryFn: () => brandService.listMultiBrands(params),
    staleTime: 30 * 1000,
  });
}

export function useMultiBrand(id: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BRANDS, id, workspaceId],
    queryFn: () => brandService.getBrandById(id as string, workspaceId),
    enabled: !!id,
  });
}

export function useMultiBrandHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BRANDS, id, 'history'],
    queryFn: () => brandService.getBrandHistory(id as string),
    enabled: !!id,
  });
}

export function useMultiBrandLinks(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MULTI_BRANDS, id, 'links'],
    queryFn: () => brandService.listBrandLinks(id as string),
    enabled: !!id,
  });
}

function invalidateBrands(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MULTI_BRANDS] });
}

export function useCreateMultiBrand() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateMultiBrandPayload) => brandService.createBrand(payload),
    onSuccess: () => {
      invalidateBrands(queryClient);
      toast.success('Brand created');
    },
    onError: () => toast.error('Could not create brand', 'Please try again.'),
  });
}

export function useUpdateMultiBrand(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateMultiBrandPayload) => brandService.updateBrand(id, payload),
    onSuccess: () => {
      invalidateBrands(queryClient);
      toast.success('Brand updated');
    },
    onError: () => toast.error('Could not update brand', 'Please try again.'),
  });
}

function useBrandAction(id: string, action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, reason),
    onSuccess: () => {
      invalidateBrands(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateMultiBrand(id: string) {
  return useBrandAction(id, brandService.activateBrand, 'Brand activated');
}

export function useDeactivateMultiBrand(id: string) {
  return useBrandAction(id, brandService.deactivateBrand, 'Brand deactivated');
}

export function useArchiveMultiBrand(id: string) {
  return useBrandAction(id, brandService.archiveBrand, 'Brand archived');
}

export function useRestoreMultiBrand(id: string) {
  return useBrandAction(id, brandService.restoreBrand, 'Brand restored');
}

export function useSetDefaultMultiBrand(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => brandService.setDefaultBrand(id),
    onSuccess: () => {
      invalidateBrands(queryClient);
      toast.success('Default brand updated');
    },
  });
}

export function useChangeBrandOwnership(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ChangeBrandOwnershipPayload) => brandService.changeBrandOwnership(id, payload),
    onSuccess: () => {
      invalidateBrands(queryClient);
      toast.success('Ownership updated');
    },
    onError: () => toast.error('Could not change ownership', 'Please try again.'),
  });
}

export function useLinkBrandEntity(brandId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: LinkBrandEntityPayload) => brandService.linkBrandEntity(brandId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MULTI_BRANDS, brandId, 'links'] });
      toast.success('Entity linked');
    },
    onError: () => toast.error('Could not link entity', 'Please try again.'),
  });
}

export function useUnlinkBrandEntity(brandId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) => brandService.unlinkBrandEntity(brandId, entityType, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MULTI_BRANDS, brandId, 'links'] });
      toast.success('Entity unlinked');
    },
    onError: () => toast.error('Could not unlink entity', 'Please try again.'),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as seoService from '@/services/ai-seo.service';
import { useToast } from './use-toast';
import type { ApproveSeoPayload, CreateSeoOptimizationPayload, ManualSeoEditPayload, RegenerateSeoSectionsPayload, SeoOptimizationFilterParams } from '@/types';

const KEY = 'ai-seo';

export function useSeoOptimizations(params: SeoOptimizationFilterParams = {}) {
  return useQuery({
    queryKey: [KEY, 'list', params],
    queryFn: () => seoService.listSeoOptimizations(params),
    staleTime: 15 * 1000,
  });
}

export function useSeoOptimizationStats() {
  return useQuery({
    queryKey: [KEY, 'stats'],
    queryFn: () => seoService.getSeoOptimizationStats(),
    staleTime: 60 * 1000,
  });
}

export function useSeoOptimizationsByProduct(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'by-product', catalogProductId],
    queryFn: () => seoService.getSeoOptimizationsByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
  });
}

export function useLatestSeoOptimization(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'latest', catalogProductId],
    queryFn: () => seoService.getLatestSeoOptimizationByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
    staleTime: 10 * 1000,
  });
}

export function useSeoOptimization(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => seoService.getSeoOptimizationById(id as string),
    enabled: !!id,
  });
}

export function useSeoOptimizationHistory(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'history', id],
    queryFn: () => seoService.getSeoOptimizationHistory(id as string),
    enabled: !!id,
  });
}

function invalidateSeo(queryClient: ReturnType<typeof useQueryClient>, catalogProductId?: string) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'list'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'stats'] });
  if (catalogProductId) {
    queryClient.invalidateQueries({ queryKey: [KEY, 'by-product', catalogProductId] });
    queryClient.invalidateQueries({ queryKey: [KEY, 'latest', catalogProductId] });
  }
}

export function useCreateSeoOptimization() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSeoOptimizationPayload) => seoService.createSeoOptimization(payload),
    onSuccess: (result) => {
      invalidateSeo(queryClient, result.catalogProductId);
      toast.success('SEO optimization started');
    },
    onError: () => toast.error('Could not start SEO optimization', 'Please try again.'),
  });
}

export function useRegenerateSeoSections(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegenerateSeoSectionsPayload) => seoService.regenerateSeoSections(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'history', id] });
      invalidateSeo(queryClient, result.catalogProductId);
      toast.success('SEO sections regenerated');
    },
    onError: () => toast.error('Could not regenerate SEO sections', 'Please try again.'),
  });
}

export function useManualEditSeoOptimization(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ManualSeoEditPayload) => seoService.manualEditSeoOptimization(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      invalidateSeo(queryClient, result.catalogProductId);
      toast.success('Edits saved');
    },
    onError: () => toast.error('Could not save edits', 'Please try again.'),
  });
}

export function useApproveSeoOptimization(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ApproveSeoPayload = {}) => seoService.approveSeoOptimization(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'history', id] });
      invalidateSeo(queryClient, result.catalogProductId);
      toast.success('SEO optimization approved');
    },
    onError: () => toast.error('Could not approve SEO optimization', 'Please try again.'),
  });
}

export function useDeleteSeoOptimization() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => seoService.deleteSeoOptimization(id),
    onSuccess: () => {
      invalidateSeo(queryClient);
      toast.success('SEO optimization deleted');
    },
    onError: () => toast.error('Could not delete SEO optimization', 'Please try again.'),
  });
}

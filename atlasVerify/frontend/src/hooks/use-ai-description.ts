import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as descriptionService from '@/services/ai-description.service';
import { useToast } from './use-toast';
import type { AiDescriptionFilterParams, ApproveAiDescriptionPayload, CreateAiDescriptionPayload, ManualEditAiDescriptionPayload, RegenerateAiDescriptionSectionsPayload } from '@/types';

const KEY = 'ai-description';

export function useAiDescriptions(params: AiDescriptionFilterParams = {}) {
  return useQuery({
    queryKey: [KEY, 'list', params],
    queryFn: () => descriptionService.listAiDescriptions(params),
    staleTime: 15 * 1000,
  });
}

export function useAiDescriptionStats() {
  return useQuery({
    queryKey: [KEY, 'stats'],
    queryFn: () => descriptionService.getAiDescriptionStats(),
    staleTime: 60 * 1000,
  });
}

export function useAiDescriptionsByProduct(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'by-product', catalogProductId],
    queryFn: () => descriptionService.getAiDescriptionsByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
  });
}

export function useLatestAiDescription(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'latest', catalogProductId],
    queryFn: () => descriptionService.getLatestAiDescriptionByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
    staleTime: 10 * 1000,
  });
}

export function useAiDescription(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => descriptionService.getAiDescriptionById(id as string),
    enabled: !!id,
  });
}

export function useAiDescriptionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'history', id],
    queryFn: () => descriptionService.getAiDescriptionHistory(id as string),
    enabled: !!id,
  });
}

function invalidateDescriptions(queryClient: ReturnType<typeof useQueryClient>, catalogProductId?: string) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'list'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'stats'] });
  if (catalogProductId) {
    queryClient.invalidateQueries({ queryKey: [KEY, 'by-product', catalogProductId] });
    queryClient.invalidateQueries({ queryKey: [KEY, 'latest', catalogProductId] });
  }
}

export function useCreateAiDescription() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiDescriptionPayload) => descriptionService.createAiDescription(payload),
    onSuccess: (result) => {
      invalidateDescriptions(queryClient, result.catalogProductId);
      toast.success('Description generation started');
    },
    onError: () => toast.error('Could not start generation', 'Please try again.'),
  });
}

export function useRegenerateAiDescriptionSections(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegenerateAiDescriptionSectionsPayload) => descriptionService.regenerateAiDescriptionSections(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'history', id] });
      invalidateDescriptions(queryClient, result.catalogProductId);
      toast.success('Sections regenerated');
    },
    onError: () => toast.error('Could not regenerate sections', 'Please try again.'),
  });
}

export function useManualEditAiDescription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ManualEditAiDescriptionPayload) => descriptionService.manualEditAiDescription(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      invalidateDescriptions(queryClient, result.catalogProductId);
      toast.success('Edits saved');
    },
    onError: () => toast.error('Could not save edits', 'Please try again.'),
  });
}

export function useApproveAiDescription(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ApproveAiDescriptionPayload = {}) => descriptionService.approveAiDescription(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'history', id] });
      invalidateDescriptions(queryClient, result.catalogProductId);
      toast.success('Description approved');
    },
    onError: () => toast.error('Could not approve description', 'Please try again.'),
  });
}

export function useDeleteAiDescription() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => descriptionService.deleteAiDescription(id),
    onSuccess: () => {
      invalidateDescriptions(queryClient);
      toast.success('Description deleted');
    },
    onError: () => toast.error('Could not delete description', 'Please try again.'),
  });
}

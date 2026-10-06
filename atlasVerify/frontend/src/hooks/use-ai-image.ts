import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as imageService from '@/services/ai-image.service';
import { useToast } from './use-toast';
import type { AiImageFilterParams, ApproveAiImagesPayload, CreateAiImageSetPayload, ManualUploadAiImagePayload, RegenerateAiImagesPayload } from '@/types';

const KEY = 'ai-image';

export function useAiImageSets(params: AiImageFilterParams = {}) {
  return useQuery({
    queryKey: [KEY, 'list', params],
    queryFn: () => imageService.listAiImageSets(params),
    staleTime: 15 * 1000,
  });
}

export function useAiImageStats() {
  return useQuery({
    queryKey: [KEY, 'stats'],
    queryFn: () => imageService.getAiImageStats(),
    staleTime: 60 * 1000,
  });
}

export function useAiImageSetsByProduct(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'by-product', catalogProductId],
    queryFn: () => imageService.getAiImageSetsByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
  });
}

export function useLatestAiImageSet(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'latest', catalogProductId],
    queryFn: () => imageService.getLatestAiImageSetByCatalogProduct(catalogProductId as string),
    enabled: !!catalogProductId,
    staleTime: 10 * 1000,
  });
}

export function useAiImageSet(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => imageService.getAiImageSetById(id as string),
    enabled: !!id,
  });
}

export function useAiImageSetHistory(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'history', id],
    queryFn: () => imageService.getAiImageSetHistory(id as string),
    enabled: !!id,
  });
}

function invalidateImages(queryClient: ReturnType<typeof useQueryClient>, catalogProductId?: string) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'list'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'stats'] });
  if (catalogProductId) {
    queryClient.invalidateQueries({ queryKey: [KEY, 'by-product', catalogProductId] });
    queryClient.invalidateQueries({ queryKey: [KEY, 'latest', catalogProductId] });
  }
}

export function useCreateAiImageSet() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiImageSetPayload) => imageService.createAiImageSet(payload),
    onSuccess: (result) => {
      invalidateImages(queryClient, result.catalogProductId);
      toast.success('Image generation started');
    },
    onError: () => toast.error('Could not start image generation', 'Please try again.'),
  });
}

export function useRegenerateAiImages(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegenerateAiImagesPayload) => imageService.regenerateAiImages(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'history', id] });
      invalidateImages(queryClient, result.catalogProductId);
      toast.success('Images regenerated');
    },
    onError: () => toast.error('Could not regenerate images', 'Please try again.'),
  });
}

export function useManualUploadAiImage(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ManualUploadAiImagePayload) => imageService.manualUploadAiImage(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      invalidateImages(queryClient, result.catalogProductId);
      toast.success('Image uploaded');
    },
    onError: () => toast.error('Could not upload image', 'Please try again.'),
  });
}

export function useApproveAiImages(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ApproveAiImagesPayload = {}) => imageService.approveAiImages(id, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'history', id] });
      invalidateImages(queryClient, result.catalogProductId);
      toast.success('Images approved');
    },
    onError: () => toast.error('Could not approve images', 'Please try again.'),
  });
}

export function useDeleteAiImageSet() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => imageService.deleteAiImageSet(id),
    onSuccess: () => {
      invalidateImages(queryClient);
      toast.success('Image set deleted');
    },
    onError: () => toast.error('Could not delete image set', 'Please try again.'),
  });
}

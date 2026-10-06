import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productsService from '@/services/products.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CatalogFilterParams, CreateCatalogProductPayload, UpdateCatalogProductPayload } from '@/types';
import { useToast } from './use-toast';

export function useProducts(params: CatalogFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, params],
    queryFn: () => productsService.listProducts(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, id],
    queryFn: () => productsService.getProductById(id as string),
    enabled: !!id,
  });
}

export function useProductStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, 'stats'],
    queryFn: productsService.getProductStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCatalogProductPayload) => productsService.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success('Product created', 'The product was added to your catalog.');
    },
    onError: () => toast.error('Could not create product', 'Please check the form and try again.'),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateCatalogProductPayload) => productsService.updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success('Product updated');
    },
    onError: () => toast.error('Could not update product', 'Please try again.'),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Could not delete product', 'Please try again.'),
  });
}

export function useProductHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS, id, 'history'],
    queryFn: () => productsService.getProductHistory(id as string),
    enabled: !!id,
  });
}

function useProductStatusAction(id: string, action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS, id, 'history'] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRequestAiGenerationForProduct(id: string) {
  return useProductStatusAction(id, productsService.requestAiGenerationForProduct, 'Marked ready for AI generation');
}

export function useMarkProductAiGenerated(id: string) {
  return useProductStatusAction(id, productsService.markProductAiGenerated, 'Product marked as AI generated');
}

export function useSubmitProductForApproval(id: string) {
  return useProductStatusAction(id, productsService.submitProductForApproval, 'Submitted for approval');
}

export function useApproveProduct(id: string) {
  return useProductStatusAction(id, productsService.approveProduct, 'Product approved');
}

export function usePublishProduct(id: string) {
  return useProductStatusAction(id, productsService.publishProduct, 'Product published');
}

export function useArchiveProduct(id: string) {
  return useProductStatusAction(id, productsService.archiveProduct, 'Product archived');
}

export function useRevertProductToDraft(id: string) {
  return useProductStatusAction(id, productsService.revertProductToDraft, 'Reverted to draft');
}

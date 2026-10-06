import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as itemsService from '@/services/inventory-items.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateInventoryItemPayload, InventoryConfig, InventoryItemFilterParams, UpdateInventoryItemPayload } from '@/types';
import { useToast } from './use-toast';

export function useInventoryItems(params: InventoryItemFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, params],
    queryFn: () => itemsService.listInventoryItems(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, id],
    queryFn: () => itemsService.getInventoryItemById(id as string),
    enabled: !!id,
  });
}

export function useInventoryItemsByCatalogProduct(catalogProductId: string | undefined, variantId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, 'catalog-product', catalogProductId, variantId],
    queryFn: () => itemsService.getInventoryItemsByCatalogProduct(catalogProductId as string, variantId),
    enabled: !!catalogProductId,
  });
}

export function useInventoryItemHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, id, 'history'],
    queryFn: () => itemsService.getInventoryItemHistory(id as string),
    enabled: !!id,
  });
}

export function useInventoryItemConfig(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ITEMS, id, 'config'],
    queryFn: () => itemsService.getInventoryItemConfig(id as string),
    enabled: !!id,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => itemsService.createInventoryItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS] });
      toast.success('Inventory item created');
    },
    onError: () => toast.error('Could not create item', 'Please check the form and try again.'),
  });
}

export function useUpdateInventoryItem(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateInventoryItemPayload) => itemsService.updateInventoryItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS] });
      toast.success('Item updated');
    },
    onError: () => toast.error('Could not update item', 'Please try again.'),
  });
}

function useItemAction(id: string, action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateInventoryItem(id: string) {
  return useItemAction(id, itemsService.activateInventoryItem, 'Item activated');
}

export function useDeactivateInventoryItem(id: string) {
  return useItemAction(id, itemsService.deactivateInventoryItem, 'Item deactivated');
}

export function useReactivateInventoryItem(id: string) {
  return useItemAction(id, itemsService.reactivateInventoryItem, 'Item reactivated');
}

export function useDiscontinueInventoryItem(id: string) {
  return useItemAction(id, itemsService.discontinueInventoryItem, 'Item discontinued');
}

export function useArchiveInventoryItem(id: string) {
  return useItemAction(id, itemsService.archiveInventoryItem, 'Item archived');
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => itemsService.deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS] });
      toast.success('Item deleted');
    },
    onError: () => toast.error('Could not delete item', 'Please try again.'),
  });
}

export function useUpdateInventoryItemConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: Partial<InventoryConfig>) => itemsService.updateInventoryItemConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ITEMS, id, 'config'] });
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Could not update configuration', 'Please try again.'),
  });
}

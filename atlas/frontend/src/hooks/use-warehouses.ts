import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as warehousesService from '@/services/warehouses.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateWarehousePayload, PaginationParams, UpdateWarehousePayload, WarehouseFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useWarehouseOptions(params: PaginationParams = { limit: 100 }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['warehouses', params],
    queryFn: () => warehousesService.listWarehouses(params),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWarehousesFull(params: WarehouseFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSES_FULL, params],
    queryFn: () => warehousesService.listWarehousesFull(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSES_FULL, id],
    queryFn: () => warehousesService.getWarehouseById(id as string),
    enabled: !!id,
  });
}

export function useWarehouseHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSES_FULL, id, 'history'],
    queryFn: () => warehousesService.getWarehouseHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWarehousePayload) => warehousesService.createWarehouse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSES_FULL] });
      toast.success('Warehouse created');
    },
    onError: () => toast.error('Could not create warehouse', 'Please check the form and try again.'),
  });
}

export function useUpdateWarehouse(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateWarehousePayload) => warehousesService.updateWarehouse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSES_FULL] });
      toast.success('Warehouse updated');
    },
    onError: () => toast.error('Could not update warehouse', 'Please try again.'),
  });
}

function useWarehouseAction(id: string, action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => action(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSES_FULL] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateWarehouse(id: string) {
  return useWarehouseAction(id, warehousesService.activateWarehouse, 'Warehouse activated');
}

export function useDeactivateWarehouse(id: string) {
  return useWarehouseAction(id, warehousesService.deactivateWarehouse, 'Warehouse deactivated');
}

export function useSuspendWarehouse(id: string) {
  return useWarehouseAction(id, warehousesService.suspendWarehouse, 'Warehouse suspended');
}

export function useCloseWarehouse(id: string) {
  return useWarehouseAction(id, warehousesService.closeWarehouse, 'Warehouse closed');
}

export function useArchiveWarehouse(id: string) {
  return useWarehouseAction(id, warehousesService.archiveWarehouse, 'Warehouse archived');
}

export function useRestoreWarehouse(id: string) {
  return useWarehouseAction(id, warehousesService.restoreWarehouse, 'Warehouse restored');
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => warehousesService.deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSES_FULL] });
      toast.success('Warehouse deleted');
    },
    onError: () => toast.error('Could not delete warehouse', 'Please try again.'),
  });
}

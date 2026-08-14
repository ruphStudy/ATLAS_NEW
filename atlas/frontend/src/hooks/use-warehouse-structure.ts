import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as structureService from '@/services/warehouse-structure.service';
import { QUERY_KEYS } from '@/constants';
import type { CreateWarehouseBinPayload, CreateWarehouseLocationPayload, CreateWarehouseZonePayload } from '@/types';
import { useToast } from './use-toast';

// ── Zones ────────────────────────────────────────────────────────────
export function useWarehouseZones(warehouseId: string | undefined, params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSE_ZONES, warehouseId, params],
    queryFn: () => structureService.listWarehouseZones(warehouseId as string, params),
    enabled: !!warehouseId,
  });
}

export function useCreateWarehouseZone(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWarehouseZonePayload) => structureService.createWarehouseZone(warehouseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_ZONES, warehouseId] });
      toast.success('Zone created');
    },
    onError: () => toast.error('Could not create zone', 'Please try again.'),
  });
}

export function useWarehouseZoneAction(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const actions = structureService.warehouseZoneActions(warehouseId);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_ZONES, warehouseId] });
  return {
    activate: useMutation({ mutationFn: (id: string) => actions.activate(id), onSuccess: () => { invalidate(); toast.success('Zone activated'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    deactivate: useMutation({ mutationFn: (id: string) => actions.deactivate(id), onSuccess: () => { invalidate(); toast.success('Zone deactivated'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    block: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => actions.block(id, reason), onSuccess: () => { invalidate(); toast.success('Zone blocked'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    archive: useMutation({ mutationFn: (id: string) => actions.archive(id), onSuccess: () => { invalidate(); toast.success('Zone archived'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    restore: useMutation({ mutationFn: (id: string) => actions.restore(id), onSuccess: () => { invalidate(); toast.success('Zone restored'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
  };
}

// ── Locations ────────────────────────────────────────────────────────
export function useWarehouseLocations(warehouseId: string | undefined, params: { page?: number; limit?: number; type?: string; status?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSE_LOCATIONS, warehouseId, params],
    queryFn: () => structureService.listWarehouseLocations(warehouseId as string, params),
    enabled: !!warehouseId,
  });
}

export function useCreateWarehouseLocation(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWarehouseLocationPayload) => structureService.createWarehouseLocation(warehouseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_LOCATIONS, warehouseId] });
      toast.success('Location created');
    },
    onError: () => toast.error('Could not create location', 'Please try again.'),
  });
}

export function useWarehouseLocationAction(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const actions = structureService.warehouseLocationActions(warehouseId);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_LOCATIONS, warehouseId] });
  return {
    activate: useMutation({ mutationFn: (id: string) => actions.activate(id), onSuccess: () => { invalidate(); toast.success('Location activated'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    deactivate: useMutation({ mutationFn: (id: string) => actions.deactivate(id), onSuccess: () => { invalidate(); toast.success('Location deactivated'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    block: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => actions.block(id, reason), onSuccess: () => { invalidate(); toast.success('Location blocked'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    archive: useMutation({ mutationFn: (id: string) => actions.archive(id), onSuccess: () => { invalidate(); toast.success('Location archived'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    restore: useMutation({ mutationFn: (id: string) => actions.restore(id), onSuccess: () => { invalidate(); toast.success('Location restored'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
  };
}

// ── Bins ─────────────────────────────────────────────────────────────
export function useWarehouseBins(warehouseId: string | undefined, params: { page?: number; limit?: number; type?: string; status?: string; locationId?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSE_BINS, warehouseId, params],
    queryFn: () => structureService.listWarehouseBins(warehouseId as string, params),
    enabled: !!warehouseId,
  });
}

export function useCreateWarehouseBin(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWarehouseBinPayload) => structureService.createWarehouseBin(warehouseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_BINS, warehouseId] });
      toast.success('Bin created');
    },
    onError: () => toast.error('Could not create bin', 'Please try again.'),
  });
}

export function useWarehouseBinAction(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const actions = structureService.warehouseBinActions(warehouseId);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_BINS, warehouseId] });
  return {
    activate: useMutation({ mutationFn: (id: string) => actions.activate(id), onSuccess: () => { invalidate(); toast.success('Bin activated'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    deactivate: useMutation({ mutationFn: (id: string) => actions.deactivate(id), onSuccess: () => { invalidate(); toast.success('Bin deactivated'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    block: useMutation({ mutationFn: ({ id, reason }: { id: string; reason?: string }) => actions.block(id, reason), onSuccess: () => { invalidate(); toast.success('Bin blocked'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    archive: useMutation({ mutationFn: (id: string) => actions.archive(id), onSuccess: () => { invalidate(); toast.success('Bin archived'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
    restore: useMutation({ mutationFn: (id: string) => actions.restore(id), onSuccess: () => { invalidate(); toast.success('Bin restored'); }, onError: () => toast.error('Action failed', 'Please try again.') }),
  };
}

// ── Capacity ─────────────────────────────────────────────────────────
export function useWarehouseCapacity(warehouseId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSES_FULL, warehouseId, 'capacity'],
    queryFn: () => structureService.getWarehouseCapacity(warehouseId as string),
    enabled: !!warehouseId,
  });
}

export function useRecalculateWarehouseCapacity(warehouseId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => structureService.recalculateWarehouseCapacity(warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSES_FULL, warehouseId, 'capacity'] });
      toast.success('Capacity recalculated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as fbaService from '@/services/fba-shipments.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateFBAShipmentPayload, FBAShipmentFilterParams } from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useFBAShipments(params: Omit<FBAShipmentFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.FBA_SHIPMENTS, workspaceId, params],
    queryFn: () => fbaService.listFBAShipments({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useFBAShipment(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id],
    queryFn: () => fbaService.getFBAShipmentById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useFBAShipmentItems(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'items'],
    queryFn: () => fbaService.getFBAShipmentItems(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useFBAShipmentBoxes(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'boxes'],
    queryFn: () => fbaService.getFBAShipmentBoxes(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useFBAShipmentDiscrepancies(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'discrepancies'],
    queryFn: () => fbaService.getFBAShipmentDiscrepancies(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCreateFBAShipment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateFBAShipmentPayload) => fbaService.createFBAShipment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS] });
      toast.success('FBA shipment created');
    },
    onError: () => toast.error('Could not create shipment', 'Please try again.'),
  });
}

function useFBAAction(id: string, action: (id: string, workspaceId: string) => Promise<unknown>, successMessage: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePlanFBAShipment(id: string) {
  return useFBAAction(id, fbaService.planFBAShipment, 'Shipment planned');
}

export function useApproveFBAShipment(id: string) {
  return useFBAAction(id, fbaService.approveFBAShipment, 'Shipment approved');
}

export function usePrepareFBAShipment(id: string) {
  return useFBAAction(id, fbaService.prepareFBAShipment, 'Shipment preparing');
}

export function useDispatchFBAShipment(id: string) {
  return useFBAAction(id, fbaService.dispatchFBAShipment, 'Shipment dispatched');
}

export function useTrackFBAShipment(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (trackingReference?: string) => fbaService.trackFBAShipment(id, workspaceId as string, trackingReference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS] });
      toast.success('Tracking updated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReconcileFBAShipment(id: string) {
  return useFBAAction(id, fbaService.reconcileFBAShipment, 'Shipment reconciled');
}

export function useCloseFBAShipment(id: string) {
  return useFBAAction(id, fbaService.closeFBAShipment, 'Shipment closed');
}

export function useCancelFBAShipment(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => fbaService.cancelFBAShipment(id, workspaceId as string, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS] });
      toast.success('Shipment cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAddFBAShipmentItem(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { inventoryItemId: string; sku: string; requestedQuantity: number }) => fbaService.addFBAShipmentItem(id, workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'items'] });
      toast.success('Item added');
    },
    onError: () => toast.error('Could not add item', 'Please try again.'),
  });
}

export function useCreateFBAShipmentBox(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { length?: number; width?: number; height?: number; weight?: number }) => fbaService.createFBAShipmentBox(id, workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'boxes'] });
      toast.success('Box created');
    },
    onError: () => toast.error('Could not create box', 'Please try again.'),
  });
}

export function useRecordFBADiscrepancy(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { discrepancyType: string; description: string; itemId?: string; expectedQuantity?: number; receivedQuantity?: number }) =>
      fbaService.recordFBADiscrepancy(id, workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'discrepancies'] });
      toast.success('Discrepancy recorded');
    },
    onError: () => toast.error('Could not record discrepancy', 'Please try again.'),
  });
}

export function useReconcileFBADiscrepancy(id: string) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ discrepancyId, reconciliationNotes }: { discrepancyId: string; reconciliationNotes?: string }) => fbaService.reconcileFBADiscrepancy(id, discrepancyId, workspaceId as string, reconciliationNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FBA_SHIPMENTS, id, 'discrepancies'] });
      toast.success('Discrepancy reconciled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as shipmentsService from '@/services/shipments.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateShipmentPayload, ShipmentFilterParams, UpdateShipmentPayload, UpdateTrackingPayload } from '@/types';
import { useToast } from './use-toast';

export function useShipments(params: ShipmentFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SHIPMENTS, params],
    queryFn: () => shipmentsService.listShipments(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SHIPMENTS, id],
    queryFn: () => shipmentsService.getShipmentById(id as string),
    enabled: !!id,
  });
}

export function useShipmentTrackingHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SHIPMENTS, id, 'tracking-history'],
    queryFn: () => shipmentsService.getShipmentTrackingHistory(id as string),
    enabled: !!id,
  });
}

export function useShipmentStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.SHIPMENTS, 'stats'],
    queryFn: shipmentsService.getShipmentStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateShipmentPayload) => shipmentsService.createShipment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Shipment created');
    },
    onError: () => toast.error('Could not create shipment', 'Please check the form and try again.'),
  });
}

export function useUpdateShipment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateShipmentPayload) => shipmentsService.updateShipment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Shipment updated');
    },
    onError: () => toast.error('Could not update shipment', 'Please try again.'),
  });
}

function useShipmentAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS, id, 'tracking-history'] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDispatchShipment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { trackingNumber?: string; carrier?: string; dispatchDate?: string; notes?: string } = {}) => shipmentsService.dispatchShipment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Shipment dispatched');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useUpdateShipmentTracking(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateTrackingPayload) => shipmentsService.updateShipmentTracking(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS, id, 'tracking-history'] });
      toast.success('Tracking update added');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeliverShipment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { actualDeliveryDate?: string; notes?: string } = {}) => shipmentsService.deliverShipment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Shipment marked delivered');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelShipment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => shipmentsService.cancelShipment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Shipment cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useScheduleTrackingSync() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => shipmentsService.scheduleTrackingSync(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Tracking sync queued', `${result.queued} shipment(s) queued for sync.`);
    },
    onError: () => toast.error('Could not queue sync', 'Please try again.'),
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => shipmentsService.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHIPMENTS] });
      toast.success('Shipment deleted');
    },
    onError: () => toast.error('Could not delete shipment', 'Please try again.'),
  });
}
